-- Alter user records with Stripe and entitlement state.
ALTER TABLE "User"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trialUsedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE INDEX "User_subscriptionStatus_idx" ON "User"("subscriptionStatus");

-- Billing plan config stored in the app database so pricing can be managed operationally.
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'standard',
    "name" TEXT NOT NULL DEFAULT 'Standard',
    "description" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPlan_slug_key" ON "BillingPlan"("slug");
CREATE INDEX "BillingPlan_isActive_idx" ON "BillingPlan"("isActive");
CREATE INDEX "BillingPlan_isDefault_idx" ON "BillingPlan"("isDefault");

INSERT INTO "BillingPlan" ("id", "slug", "name", "description", "amountCents", "currency", "interval", "isActive", "isDefault")
VALUES (
    'billing_plan_standard',
    'standard',
    'Standard',
    'Default streaming membership plan',
    0,
    'usd',
    'month',
    true,
    true
)
ON CONFLICT ("slug") DO NOTHING;

-- Subscription records mirror Stripe and drive access gating.
CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingSubscription_stripeSubscriptionId_key" ON "BillingSubscription"("stripeSubscriptionId");
CREATE INDEX "BillingSubscription_userId_idx" ON "BillingSubscription"("userId");
CREATE INDEX "BillingSubscription_planId_idx" ON "BillingSubscription"("planId");
CREATE INDEX "BillingSubscription_status_idx" ON "BillingSubscription"("status");
CREATE INDEX "BillingSubscription_stripeCustomerId_idx" ON "BillingSubscription"("stripeCustomerId");

ALTER TABLE "BillingSubscription"
ADD CONSTRAINT "BillingSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingSubscription"
ADD CONSTRAINT "BillingSubscription_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
