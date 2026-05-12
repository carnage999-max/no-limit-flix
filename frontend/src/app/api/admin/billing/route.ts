import { NextRequest, NextResponse } from 'next/server';
import { getDefaultBillingPlan, getFreeTrialDays, isFreeTrialEnabled } from '@/lib/billing';
import { syncStripePlanPrice } from '@/lib/stripe';
import prisma from '@/lib/db';

const isAuthorized = (request: NextRequest) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const session = request.cookies.get('admin_session')?.value;
    return Boolean(adminPassword && session === adminPassword);
};

export async function GET(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const plan = await getDefaultBillingPlan();
        return NextResponse.json({
            plan,
            trial: {
                enabled: isFreeTrialEnabled(),
                days: getFreeTrialDays(),
            },
        });
    } catch (error) {
        console.error('Admin billing GET error:', error);
        return NextResponse.json({ error: 'Failed to load billing settings' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const plan = await getDefaultBillingPlan();
        const amountCents = Math.max(0, Math.round(Number(body?.amountCents) || 0));
        const currency = typeof body?.currency === 'string' && body.currency.trim() ? body.currency.trim().toLowerCase() : 'usd';
        const interval = body?.interval === 'year' ? 'year' : 'month';
        const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Standard';
        const description = typeof body?.description === 'string' ? body.description.trim() : '';
        const isActive = body?.isActive !== false;

        await prisma.billingPlan.update({
            where: { id: plan.id },
            data: {
                amountCents,
                currency,
                interval,
                name,
                description: description || null,
                isActive,
            },
        });

        const syncedPlan = await syncStripePlanPrice(plan.id);

        return NextResponse.json({
            success: true,
            plan: syncedPlan,
            trial: {
                enabled: isFreeTrialEnabled(),
                days: getFreeTrialDays(),
            },
        });
    } catch (error) {
        console.error('Admin billing PUT error:', error);
        return NextResponse.json({ error: 'Failed to update billing settings' }, { status: 500 });
    }
}
