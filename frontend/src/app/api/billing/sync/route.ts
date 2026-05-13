import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import {
    buildBillingState,
    syncLatestSubscriptionForCustomer,
    syncSubscriptionFromStripe,
    withBillingSubscription,
} from '@/lib/billing';
import { getOrCreateStripeCustomer, getStripe } from '@/lib/stripe';

const getSubscriptionIdFromSession = (session: Stripe.Checkout.Session) => {
    const subscription = session.subscription;
    return typeof subscription === 'string' ? subscription : subscription?.id || null;
};

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

        const body = await request.json().catch(() => ({}));
        const checkoutSessionId = typeof body?.checkoutSessionId === 'string' ? body.checkoutSessionId : null;

        const customerId = await getOrCreateStripeCustomer({
            userId: user.id,
            email: user.email,
            username: user.username,
            stripeCustomerId: user.stripeCustomerId,
        });

        if (checkoutSessionId) {
            const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
                expand: ['subscription'],
            });
            const sessionCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
            const belongsToUser =
                sessionCustomerId === customerId ||
                session.client_reference_id === user.id ||
                session.metadata?.userId === user.id;

            if (!belongsToUser) {
                return NextResponse.json({ error: 'Checkout session does not belong to this account' }, { status: 403 });
            }

            const subscriptionId = getSubscriptionIdFromSession(session);
            if (session.mode === 'subscription' && subscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                    expand: ['items.data.price'],
                });
                await syncSubscriptionFromStripe(subscription);
            }
        } else {
            await syncLatestSubscriptionForCustomer(stripe, customerId);
        }

        const [updatedUser, subscription] = await Promise.all([
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    stripeCustomerId: true,
                    subscriptionStatus: true,
                    subscriptionCurrentPeriodEnd: true,
                    subscriptionCancelAtPeriodEnd: true,
                    trialUsedAt: true,
                },
            }),
            prisma.billingSubscription.findFirst({
                where: { userId: user.id },
                orderBy: { updatedAt: 'desc' },
            }),
        ]);

        const billingUser = withBillingSubscription(updatedUser, subscription);

        return NextResponse.json({
            billing: buildBillingState(billingUser),
            subscription: subscription
                ? {
                    id: subscription.id,
                    status: subscription.status,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                    currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
                    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
                    trialStart: subscription.trialStart?.toISOString() || null,
                    trialEnd: subscription.trialEnd?.toISOString() || null,
                  }
                : null,
        });
    } catch (error) {
        console.error('Billing sync error:', error);
        return NextResponse.json({ error: 'Failed to sync billing status' }, { status: 500 });
    }
}
