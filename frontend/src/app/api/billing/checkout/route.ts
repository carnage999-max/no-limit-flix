import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { getDefaultBillingPlan, getFreeTrialDays, hasActiveSubscriptionAccess, shouldOfferFreeTrial } from '@/lib/billing';
import { getAppUrl, getStripe, syncStripePlanPrice } from '@/lib/stripe';

export async function POST(request: NextRequest) {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
        }

        const user = await getSessionUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (hasActiveSubscriptionAccess(user) && user.stripeCustomerId) {
            return NextResponse.json({
                error: 'Subscription already active',
                code: 'already_active',
            }, { status: 409 });
        }

        const plan = await getDefaultBillingPlan();
        if (!plan.isActive) {
            return NextResponse.json({ error: 'Membership plan is not available right now' }, { status: 409 });
        }

        const syncedPlan = await syncStripePlanPrice(plan.id);
        if (!syncedPlan.stripePriceId) {
            return NextResponse.json({ error: 'Stripe price is not configured' }, { status: 500 });
        }

        let customerId = user.stripeCustomerId || null;
        if (customerId) {
            try {
                const existing = await stripe.customers.retrieve(customerId);
                if ('deleted' in existing && existing.deleted) {
                    customerId = null;
                }
            } catch {
                customerId = null;
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = customer.id;
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            });
        }

        const appUrl = getAppUrl(request.nextUrl.origin);
        const trialEligible = shouldOfferFreeTrial(user);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            client_reference_id: user.id,
            success_url: `${appUrl}/account/billing?checkout=success`,
            cancel_url: `${appUrl}/account/billing?checkout=canceled`,
            line_items: [
                {
                    price: syncedPlan.stripePriceId,
                    quantity: 1,
                },
            ],
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: {
                userId: user.id,
                planId: syncedPlan.id,
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    planId: syncedPlan.id,
                },
                ...(trialEligible
                    ? {
                        trial_period_days: getFreeTrialDays(),
                      }
                    : {}),
            },
        });

        return NextResponse.json({
            url: session.url,
        });
    } catch (error) {
        console.error('Billing checkout error:', error);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}
