'use client';

import { useState } from 'react';
import { ArrowRight, Check, Loader2, LogOut, X } from 'lucide-react';
import BillingCheckoutEmbed from '@/components/BillingCheckoutEmbed';

interface GatePlan {
    name: string;
    amountCents: number;
    currency: string;
    interval: string;
    isActive: boolean;
}

interface GateBilling {
    trialEligible: boolean;
    freeTrialEnabled: boolean;
    freeTrialDays: number;
}

const posterTiles = [
    ['Last Horizon', '#7C2D12', '#111827'],
    ['Signal Lost', '#164E63', '#020617'],
    ['Night Run', '#581C87', '#111827'],
    ['Gold Coast', '#92400E', '#1F2937'],
    ['Cold Frame', '#1E3A8A', '#020617'],
    ['After Hours', '#881337', '#111827'],
    ['Deep Cover', '#064E3B', '#020617'],
    ['Zero Hour', '#7F1D1D', '#111827'],
    ['The Return', '#312E81', '#020617'],
    ['North Line', '#0F766E', '#111827'],
    ['Dark Water', '#1F2937', '#020617'],
    ['Final Cut', '#B45309', '#111827'],
    ['Open Road', '#365314', '#020617'],
    ['The Watch', '#4C1D95', '#111827'],
    ['Black Signal', '#172554', '#020617'],
    ['Crossfade', '#9F1239', '#111827'],
];

const compactPrice = (amountCents: number, currency: string, interval: string) => {
    const amount = amountCents / 100;
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    }).format(amount);

    return `${formatted}/${interval}`;
};

export default function SubscriptionGateScreen({
    plan,
    billing,
    checkoutState,
    onCheckoutComplete,
    onSignOut,
    onCheckoutOpen,
    loading = false,
}: {
    plan: GatePlan | null;
    billing: GateBilling | null;
    checkoutState?: string | null;
    onCheckoutComplete: () => void;
    onSignOut: () => void;
    onCheckoutOpen?: () => void;
    loading?: boolean;
}) {
    const [checkoutOpen, setCheckoutOpen] = useState(checkoutState === 'success');
    const price = plan ? compactPrice(plan.amountCents, plan.currency, plan.interval) : '';
    const trialText = !plan
        ? 'Preparing membership.'
        : billing?.freeTrialEnabled && billing.trialEligible && billing.freeTrialDays > 0
        ? `${billing.freeTrialDays}-day free trial. ${price} after.`
        : plan?.amountCents === 0
            ? 'Membership is included for now.'
            : `Starts at ${price}. Cancel anytime.`;
    const ctaText = !plan
        ? 'Loading'
        : billing?.freeTrialEnabled && billing.trialEligible && billing.freeTrialDays > 0
        ? `Start ${billing.freeTrialDays}-day trial`
        : 'Start membership';

    return (
        <main className="subscriptionGate">
            <style>{`
                @keyframes gateDrift {
                    0% { transform: rotate(-8deg) translate3d(-2%, -1%, 0); }
                    100% { transform: rotate(-8deg) translate3d(2%, 1%, 0); }
                }

                @keyframes gateRise {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes checkoutIn {
                    from { opacity: 0; transform: translateY(28px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .subscriptionGate {
                    position: relative;
                    height: 100svh;
                    overflow: hidden;
                    background: #030303;
                    color: #fff;
                    font-family: var(--font-inter), system-ui, sans-serif;
                }

                .subscriptionGatePosterWall {
                    position: absolute;
                    inset: -16vh -12vw -12vh -12vw;
                    display: grid;
                    grid-template-columns: repeat(8, minmax(150px, 1fr));
                    gap: 1rem;
                    opacity: 0.72;
                    transform: rotate(-8deg);
                    animation: gateDrift 18s ease-in-out infinite alternate;
                    filter: saturate(1.05);
                }

                .subscriptionGatePoster {
                    min-height: 230px;
                    border-radius: 0.45rem;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 22px 60px rgba(0, 0, 0, 0.56);
                }

                .subscriptionGatePoster::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at 34% 24%, rgba(255,255,255,0.24), transparent 22%),
                        linear-gradient(140deg, rgba(255,255,255,0.12), transparent 38%),
                        linear-gradient(0deg, rgba(0,0,0,0.78), transparent 62%);
                }

                .subscriptionGatePoster span {
                    position: absolute;
                    left: 0.8rem;
                    right: 0.8rem;
                    bottom: 0.85rem;
                    color: rgba(255,255,255,0.72);
                    font-weight: 800;
                    font-size: 0.78rem;
                    line-height: 1.05;
                    text-transform: uppercase;
                    letter-spacing: 0;
                }

                .subscriptionGateShade {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at 50% 48%, rgba(0,0,0,0.08), rgba(0,0,0,0.78) 58%, #030303 100%),
                        linear-gradient(180deg, rgba(0,0,0,0.58), rgba(0,0,0,0.18) 45%, #030303 95%),
                        linear-gradient(90deg, rgba(0,0,0,0.72), transparent 38%, rgba(0,0,0,0.78));
                }

                .subscriptionGateTop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: clamp(1rem, 2.6vw, 1.75rem) clamp(1.25rem, 5vw, 4.5rem);
                }

                .subscriptionGateLogoFrame {
                    width: clamp(128px, 14vw, 190px);
                    height: clamp(44px, 5vw, 64px);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    filter: drop-shadow(0 14px 34px rgba(0,0,0,0.72));
                }

                .subscriptionGateLogoFrame img {
                    width: 100%;
                    height: 170%;
                    object-fit: contain;
                }

                .subscriptionGateSignOut {
                    border: 0;
                    border-radius: 0.38rem;
                    background: #D4AF37;
                    color: #0B0B0D;
                    padding: 0.72rem 1rem;
                    font-weight: 800;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    box-shadow: 0 12px 32px rgba(212, 175, 55, 0.22);
                }

                .subscriptionGateHero {
                    position: relative;
                    z-index: 2;
                    height: 100svh;
                    display: grid;
                    place-items: center;
                    text-align: center;
                    padding: 5.25rem 1.25rem 5.5rem;
                    box-sizing: border-box;
                }

                .subscriptionGateCopy {
                    width: min(760px, 100%);
                    animation: gateRise 620ms ease-out both;
                }

                .subscriptionGateCopy h1 {
                    margin: 0;
                    font-size: clamp(2.7rem, 7vw, 5.8rem);
                    line-height: 0.96;
                    letter-spacing: 0;
                    font-weight: 900;
                    text-wrap: balance;
                    text-shadow: 0 16px 50px rgba(0,0,0,0.72);
                }

                .subscriptionGateCopy p {
                    margin: 1.2rem 0 0;
                    color: rgba(255,255,255,0.88);
                    font-size: clamp(1rem, 2vw, 1.3rem);
                    font-weight: 700;
                    line-height: 1.4;
                    text-shadow: 0 10px 32px rgba(0,0,0,0.76);
                }

                .subscriptionGateCta {
                    margin-top: 1.85rem;
                    border: 0;
                    border-radius: 0.42rem;
                    background: linear-gradient(135deg, #F6D365, #D4AF37 58%, #B8860B);
                    color: #0B0B0D;
                    padding: 1.05rem 1.45rem 1.05rem 1.65rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: clamp(1rem, 2vw, 1.25rem);
                    font-weight: 900;
                    cursor: pointer;
                    box-shadow: 0 22px 52px rgba(212, 175, 55, 0.28);
                    transition: transform 180ms ease, box-shadow 180ms ease;
                }

                .subscriptionGateCta:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 26px 62px rgba(212, 175, 55, 0.34);
                }

                .subscriptionGateRibbon {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -1px;
                    z-index: 2;
                    height: 90px;
                    background:
                        radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.35), transparent 58%),
                        linear-gradient(180deg, transparent, #030303 56%);
                    border-top: 2px solid rgba(212, 175, 55, 0.42);
                    border-radius: 50% 50% 0 0 / 28% 28% 0 0;
                    pointer-events: none;
                }

                .subscriptionCheckoutLayer {
                    position: fixed;
                    inset: 0;
                    z-index: 20;
                    background: rgba(3, 3, 3, 0.88);
                    backdrop-filter: blur(18px);
                    display: grid;
                    place-items: center;
                    padding: clamp(1rem, 3vw, 2rem);
                    animation: checkoutIn 260ms ease-out both;
                }

                .subscriptionCheckoutShell {
                    width: min(980px, 100%);
                    max-height: min(92svh, 940px);
                    overflow: auto;
                    border-radius: 1rem;
                    background: #0B0B0D;
                    border: 1px solid rgba(255,255,255,0.12);
                    box-shadow: 0 30px 90px rgba(0,0,0,0.72);
                }

                .subscriptionCheckoutHeader {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 1rem 1rem 0.85rem;
                    background: rgba(11,11,13,0.94);
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }

                .subscriptionCheckoutHeader strong {
                    color: #F3F4F6;
                    font-size: 1rem;
                }

                .subscriptionCheckoutHeader span {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    color: rgba(255,255,255,0.62);
                    font-size: 0.85rem;
                    margin-left: 0.7rem;
                }

                .subscriptionCheckoutClose {
                    width: 38px;
                    height: 38px;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.06);
                    color: #fff;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .subscriptionCheckoutBody {
                    padding: 1rem;
                }

                .subscriptionGateStatus {
                    margin-top: 1rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-radius: 999px;
                    padding: 0.6rem 0.9rem;
                    background: rgba(34,197,94,0.14);
                    color: #BBF7D0;
                    font-weight: 800;
                }

                @media (max-width: 760px) {
                    .subscriptionGatePosterWall {
                        grid-template-columns: repeat(4, minmax(118px, 1fr));
                        gap: 0.7rem;
                        inset: -10vh -38vw -8vh -34vw;
                    }

                    .subscriptionGatePoster {
                        min-height: 170px;
                    }

                    .subscriptionGateTop {
                        padding: 1rem;
                    }

                    .subscriptionGateSignOut span {
                        display: none;
                    }

                    .subscriptionGateHero {
                        height: 100svh;
                        padding: 4.75rem 1rem 4.75rem;
                    }

                    .subscriptionCheckoutLayer {
                        align-items: end;
                        padding: 0;
                    }

                    .subscriptionCheckoutShell {
                        width: 100%;
                        max-height: 88svh;
                        border-radius: 1rem 1rem 0 0;
                    }
                }
            `}</style>

            <div className="subscriptionGatePosterWall" aria-hidden="true">
                {posterTiles.map(([title, from, to], index) => (
                    <div
                        key={`${title}-${index}`}
                        className="subscriptionGatePoster"
                        style={{
                            background: `linear-gradient(150deg, ${from}, ${to})`,
                            transform: `translateY(${index % 3 === 0 ? '34px' : index % 3 === 1 ? '-18px' : '8px'})`,
                        }}
                    >
                        <span>{title}</span>
                    </div>
                ))}
            </div>
            <div className="subscriptionGateShade" aria-hidden="true" />

            <div className="subscriptionGateTop">
                <div className="subscriptionGateLogoFrame">
                    <img src="/no-limit-flix-logo.png" alt="No Limit Flix" />
                </div>
                <button className="subscriptionGateSignOut" type="button" onClick={onSignOut}>
                    <LogOut size={17} />
                    <span>Sign out</span>
                </button>
            </div>

            <section className="subscriptionGateHero">
                <div className="subscriptionGateCopy">
                    <h1>Unlimited films, series and more</h1>
                    <p>{trialText}</p>
                    {checkoutState === 'success' ? (
                        <div className="subscriptionGateStatus">
                            <Check size={18} />
                            Account updated
                        </div>
                    ) : (
                        <button
                            className="subscriptionGateCta"
                            type="button"
                            onClick={() => {
                                onCheckoutOpen?.();
                                setCheckoutOpen(true);
                            }}
                            disabled={loading || !plan?.isActive}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : ctaText}
                            {!loading && <ArrowRight size={24} />}
                        </button>
                    )}
                </div>
            </section>

            <div className="subscriptionGateRibbon" aria-hidden="true" />

            {checkoutOpen && plan?.isActive && (
                <div className="subscriptionCheckoutLayer" role="dialog" aria-modal="true" aria-label="Membership checkout">
                    <div className="subscriptionCheckoutShell">
                        <div className="subscriptionCheckoutHeader">
                            <div>
                                <strong>{plan.name}</strong>
                                <span>{price}</span>
                            </div>
                            <button
                                className="subscriptionCheckoutClose"
                                type="button"
                                onClick={() => setCheckoutOpen(false)}
                                aria-label="Close checkout"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="subscriptionCheckoutBody">
                            <BillingCheckoutEmbed onComplete={onCheckoutComplete} />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
