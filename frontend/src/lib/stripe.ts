import Stripe from 'stripe';
import prisma from '@/lib/db';

let stripeClient: Stripe | null | undefined;

export const getStripe = () => {
    if (stripeClient !== undefined) return stripeClient;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        stripeClient = null;
        return stripeClient;
    }

    stripeClient = new Stripe(secretKey);
    return stripeClient;
};

export const getAppUrl = (origin?: string | null) => {
    const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || origin || 'http://localhost:3000';
    return configured.replace(/\/$/, '');
};

export async function getOrCreateStripeCustomer(input: {
    userId: string;
    email: string;
    username: string;
    stripeCustomerId?: string | null;
}) {
    const stripe = getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    let customerId = input.stripeCustomerId || null;
    if (customerId) {
        try {
            const existing = await stripe.customers.retrieve(customerId);
            if (!('deleted' in existing && existing.deleted)) {
                return customerId;
            }
        } catch {
            customerId = null;
        }
    }

    const customer = await stripe.customers.create({
        email: input.email,
        name: input.username,
        metadata: {
            userId: input.userId,
        },
    });

    await prisma.user.update({
        where: { id: input.userId },
        data: { stripeCustomerId: customer.id },
    });

    return customer.id;
}

const normalizeInterval = (value?: string | null) => {
    return value === 'year' ? 'year' : 'month';
};

const normalizeCurrency = (value?: string | null) => {
    return (value || 'usd').toLowerCase();
};

export async function syncStripePlanPrice(planId: string) {
    const stripe = getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const plan = await prisma.billingPlan.findUnique({
        where: { id: planId },
    });

    if (!plan) {
        throw new Error('Billing plan not found');
    }

    let stripeProductId = plan.stripeProductId || null;
    if (!stripeProductId) {
        const product = await stripe.products.create({
            name: plan.name,
            description: plan.description || undefined,
            metadata: {
                planId: plan.id,
                slug: plan.slug,
            },
        });
        stripeProductId = product.id;
    }

    const amountCents = Math.max(0, Math.round(plan.amountCents));
    const currency = normalizeCurrency(plan.currency);
    const interval = normalizeInterval(plan.interval);
    let stripePriceId = plan.stripePriceId || null;

    if (stripePriceId) {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        const matches =
            existingPrice.active &&
            existingPrice.currency === currency &&
            existingPrice.unit_amount === amountCents &&
            existingPrice.recurring?.interval === interval &&
            existingPrice.product === stripeProductId;

        if (!matches) {
            stripePriceId = null;
        }
    }

    if (!stripePriceId) {
        const price = await stripe.prices.create({
            product: stripeProductId,
            currency,
            unit_amount: amountCents,
            recurring: {
                interval,
            },
            metadata: {
                planId: plan.id,
                slug: plan.slug,
            },
        });
        stripePriceId = price.id;
    }

    return prisma.billingPlan.update({
        where: { id: plan.id },
        data: {
            stripeProductId,
            stripePriceId,
            currency,
            interval,
            amountCents,
        },
    });
}
