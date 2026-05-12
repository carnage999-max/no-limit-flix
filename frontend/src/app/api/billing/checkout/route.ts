import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getDefaultBillingPlan, getFreeTrialDays, hasActiveSubscriptionAccess, shouldOfferFreeTrial } from '@/lib/billing';
import { getAppUrl, getOrCreateStripeCustomer, getStripe, syncStripePlanPrice } from '@/lib/stripe';

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

        if (hasActiveSubscriptionAccess(user)) {
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

        const customerId = await getOrCreateStripeCustomer({
            userId: user.id,
            email: user.email,
            username: user.username,
            stripeCustomerId: user.stripeCustomerId,
        });

        const appUrl = getAppUrl(request.nextUrl.origin);
        const trialEligible = shouldOfferFreeTrial(user);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            ui_mode: 'embedded_page',
            customer: customerId,
            client_reference_id: user.id,
            return_url: `${appUrl}/account/billing?checkout=success`,
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
            redirect_on_completion: 'if_required',
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
            clientSecret: session.client_secret,
        });
    } catch (error) {
        console.error('Billing checkout error:', error);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}
