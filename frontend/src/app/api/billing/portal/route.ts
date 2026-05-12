import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getAppUrl, getStripe } from '@/lib/stripe';

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

        if (!user.stripeCustomerId) {
            return NextResponse.json({ error: 'No Stripe customer found for this account' }, { status: 409 });
        }

        const portal = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${getAppUrl(request.nextUrl.origin)}/account/billing`,
        });

        return NextResponse.json({ url: portal.url });
    } catch (error) {
        console.error('Billing portal error:', error);
        return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
    }
}
