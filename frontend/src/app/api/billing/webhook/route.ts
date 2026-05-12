import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { markSubscriptionCanceled, syncSubscriptionFromStripe } from '@/lib/billing';
import { getStripe } from '@/lib/stripe';

const getSubscriptionFromEvent = async (stripe: Stripe, subscriptionId: string) => {
    return stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
    });
};

export async function POST(request: NextRequest) {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
        return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 500 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    const payload = await request.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
        console.error('Stripe webhook signature error:', error);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
                if (session.mode === 'subscription' && subscriptionId) {
                    const subscription = await getSubscriptionFromEvent(stripe, subscriptionId);
                    await syncSubscriptionFromStripe(subscription);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.resumed': {
                const subscription = event.data.object as Stripe.Subscription;
                await syncSubscriptionFromStripe(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await markSubscriptionCanceled(subscription.id);
                break;
            }
            case 'invoice.paid':
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const sourceSubscription = invoice.parent?.subscription_details?.subscription;
                const subscriptionId = typeof sourceSubscription === 'string' ? sourceSubscription : sourceSubscription?.id;
                if (subscriptionId) {
                    const subscription = await getSubscriptionFromEvent(stripe, subscriptionId);
                    await syncSubscriptionFromStripe(subscription);
                }
                break;
            }
            default:
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook handling error:', error);
        return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
    }
}
