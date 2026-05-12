import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { buildBillingState, getDefaultBillingPlan } from '@/lib/billing';
import { getOrCreateStripeCustomer } from '@/lib/stripe';

export async function GET(request: NextRequest) {
    try {
        const user = await getSessionUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stripeCustomerId = await getOrCreateStripeCustomer({
            userId: user.id,
            email: user.email,
            username: user.username,
            stripeCustomerId: user.stripeCustomerId,
        });

        const hydratedUser = {
            ...user,
            stripeCustomerId,
        };

        const [plan, subscription] = await Promise.all([
            getDefaultBillingPlan(),
            prisma.billingSubscription.findFirst({
                where: { userId: user.id },
                orderBy: { updatedAt: 'desc' },
            }),
        ]);

        return NextResponse.json({
            plan: {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                amountCents: plan.amountCents,
                currency: plan.currency,
                interval: plan.interval,
                isActive: plan.isActive,
            },
            billing: buildBillingState(hydratedUser),
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
        console.error('Billing summary error:', error);
        return NextResponse.json({ error: 'Failed to load billing summary' }, { status: 500 });
    }
}
