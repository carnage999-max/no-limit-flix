import type Stripe from 'stripe';
import prisma from '@/lib/db';

const ACCESS_STATUSES = new Set(['active', 'trialing']);
const BLOCKED_STATUSES = new Set(['inactive', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired']);

type BillingUserSnapshot = {
    role?: string | null;
    stripeCustomerId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionCurrentPeriodEnd?: Date | string | null;
    subscriptionCancelAtPeriodEnd?: boolean | null;
    trialUsedAt?: Date | null;
};

type BillingSubscriptionSnapshot = {
    status?: string | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
};

export const isFreeTrialEnabled = () => {
    return process.env.STRIPE_FREE_TRIAL_ENABLED === 'true';
};

export const getFreeTrialDays = () => {
    const parsed = Number.parseInt(process.env.STRIPE_FREE_TRIAL_DAYS || '7', 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
};

export const hasActiveSubscriptionAccess = (user: BillingUserSnapshot | null | undefined) => {
    if (!user) return false;

    const status = (user.subscriptionStatus || 'inactive').toLowerCase();
    if (ACCESS_STATUSES.has(status)) return true;
    if (BLOCKED_STATUSES.has(status)) return false;

    if (!user.subscriptionCurrentPeriodEnd) return false;
    const periodEnd = new Date(user.subscriptionCurrentPeriodEnd);
    return Number.isFinite(periodEnd.getTime()) && periodEnd.getTime() > Date.now();
};

export const shouldOfferFreeTrial = (user: { trialUsedAt?: Date | null } | null | undefined) => {
    return isFreeTrialEnabled() && getFreeTrialDays() > 0 && !user?.trialUsedAt;
};

export const withBillingSubscription = <T extends BillingUserSnapshot>(
    user: T | null | undefined,
    subscription: BillingSubscriptionSnapshot | null | undefined
) => {
    if (!user || !subscription) return user;

    return {
        ...user,
        subscriptionStatus: subscription.status || user.subscriptionStatus,
        subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd ?? user.subscriptionCurrentPeriodEnd ?? null,
        subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? user.subscriptionCancelAtPeriodEnd ?? false,
    };
};

export const getDefaultBillingPlan = async () => {
    const existing = await prisma.billingPlan.findFirst({
        where: { isDefault: true },
        orderBy: { createdAt: 'asc' },
    });

    if (existing) return existing;

    return prisma.billingPlan.create({
        data: {
            slug: 'standard',
            name: 'Standard',
            description: 'Default streaming membership plan',
            amountCents: 0,
            currency: 'usd',
            interval: 'month',
            isActive: true,
            isDefault: true,
        },
    });
};

const toDate = (value: number | null | undefined) => {
    return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000) : null;
};

export async function syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const primaryItem = subscription.items.data[0];
    const priceId = primaryItem?.price?.id || null;
    const currentPeriodStart = toDate(primaryItem?.current_period_start);
    const currentPeriodEnd = toDate(primaryItem?.current_period_end);
    const plan = priceId
        ? await prisma.billingPlan.findFirst({
            where: { stripePriceId: priceId },
          })
        : null;

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { stripeCustomerId: customerId },
                ...(typeof subscription.metadata?.userId === 'string' ? [{ id: subscription.metadata.userId }] : []),
            ],
        },
        select: {
            id: true,
            trialUsedAt: true,
        },
    });

    if (!user) {
        throw new Error(`No user found for Stripe customer ${customerId}`);
    }

    await prisma.billingSubscription.upsert({
        where: {
            stripeSubscriptionId: subscription.id,
        },
        update: {
            planId: plan?.id || null,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            status: subscription.status,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            currentPeriodStart,
            currentPeriodEnd,
            trialStart: toDate(subscription.trial_start),
            trialEnd: toDate(subscription.trial_end),
            canceledAt: toDate(subscription.canceled_at),
            endedAt: toDate(subscription.ended_at),
            metadata: subscription.metadata || {},
        },
        create: {
            userId: user.id,
            planId: plan?.id || null,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            status: subscription.status,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            currentPeriodStart,
            currentPeriodEnd,
            trialStart: toDate(subscription.trial_start),
            trialEnd: toDate(subscription.trial_end),
            canceledAt: toDate(subscription.canceled_at),
            endedAt: toDate(subscription.ended_at),
            metadata: subscription.metadata || {},
        },
    });

    await prisma.user.update({
        where: { id: user.id },
        data: {
            stripeCustomerId: customerId,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: currentPeriodEnd,
            subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            trialUsedAt: !user.trialUsedAt && subscription.trial_start ? new Date() : user.trialUsedAt,
        },
    });

    return user.id;
}

export async function markSubscriptionCanceled(stripeSubscriptionId: string) {
    const existing = await prisma.billingSubscription.findUnique({
        where: { stripeSubscriptionId },
        select: {
            id: true,
            userId: true,
            currentPeriodEnd: true,
        },
    });

    if (!existing) return null;

    await prisma.billingSubscription.update({
        where: { stripeSubscriptionId },
        data: {
            status: 'canceled',
            cancelAtPeriodEnd: false,
            endedAt: new Date(),
        },
    });

    await prisma.user.update({
        where: { id: existing.userId },
        data: {
            subscriptionStatus: 'canceled',
            subscriptionCurrentPeriodEnd: existing.currentPeriodEnd,
            subscriptionCancelAtPeriodEnd: false,
        },
    });

    return existing.userId;
}

export const buildBillingState = (user: BillingUserSnapshot | null | undefined) => {
    const access = hasActiveSubscriptionAccess(user);
    const currentPeriodEnd = user?.subscriptionCurrentPeriodEnd
        ? new Date(user.subscriptionCurrentPeriodEnd).toISOString()
        : null;

    return {
        access,
        requiresSubscription: true,
        customerConfigured: Boolean(user?.stripeCustomerId),
        status: user?.subscriptionStatus || 'inactive',
        currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(user?.subscriptionCancelAtPeriodEnd),
        trialEligible: shouldOfferFreeTrial(user),
        freeTrialEnabled: isFreeTrialEnabled(),
        freeTrialDays: getFreeTrialDays(),
    };
};
