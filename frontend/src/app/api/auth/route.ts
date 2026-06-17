import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword, verifyPassword, createSessionToken, generateRefreshToken, hashToken, SESSION_COOKIE_NAME, SESSION_COOKIE_AGE, REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_AGE, verifySessionToken, getAuthCookieOptions, clearAuthCookieOptions } from '@/lib/auth';
import { parseUserAgent, lookupLocation } from '@/lib/device';
import { sendEmail } from '@/lib/email';
import { buildNewDeviceEmail, buildWelcomeEmail } from '@/lib/email-templates';
import { getOrCreateStripeCustomer } from '@/lib/stripe';
import { resolveMediaUrl } from '@/lib/media';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const prisma = new PrismaClient();
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const DEFAULT_APPLE_BUNDLE_ID = 'com.nolimitflix.app';
const EXPO_GO_APPLE_AUDIENCE = 'host.exp.Exponent';
const APPLE_SYNTHETIC_EMAIL_DOMAIN = 'users.nolimitflix.local';

const verifyAppleIdentityToken = async (identityToken: string) => {
    const extraAudiences = (process.env.APPLE_EXTRA_AUDIENCES || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const allowExpoGoAudience = process.env.NODE_ENV !== 'production'
        || process.env.APPLE_ALLOW_EXPO_GO_AUDIENCE === 'true';
    const audiences = Array.from(
        new Set(
            [
                process.env.APPLE_BUNDLE_ID,
                process.env.APPLE_SERVICE_ID,
                process.env.APPLE_CLIENT_ID,
                DEFAULT_APPLE_BUNDLE_ID,
                ...(allowExpoGoAudience ? [EXPO_GO_APPLE_AUDIENCE] : []),
                ...extraAudiences,
            ].filter(Boolean) as string[]
        )
    );
    if (!audiences.length) return null;

    try {
        const { payload } = await jwtVerify(identityToken, appleJWKS, {
            issuer: 'https://appleid.apple.com',
            audience: audiences,
        });
        const appleId = typeof payload.sub === 'string' ? payload.sub : null;
        const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
        const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
        if (!appleId) return null;
        return { appleId, email, emailVerified };
    } catch {
        return null;
    }
};

export async function POST(request: NextRequest) {
    try {
        const {
            action,
            email,
            password,
            username,
            deviceId,
            deviceName,
            idToken,
            identityToken,
            appleEmail,
            appleName,
        } = await request.json();
        const normalizedDeviceId = typeof deviceId === 'string' && deviceId.trim().length > 0
            ? deviceId.trim()
            : null;
        const normalizedDeviceName = typeof deviceName === 'string' && deviceName.trim().length > 0
            ? deviceName.trim()
            : null;

        type StripeCustomerUser = {
            id: string;
            email: string;
            username: string;
            stripeCustomerId?: string | null;
        };

        async function ensureStripeCustomer<T extends StripeCustomerUser>(user: T): Promise<T>;
        async function ensureStripeCustomer<T extends StripeCustomerUser>(user: T | null): Promise<T | null>;
        async function ensureStripeCustomer<T extends StripeCustomerUser>(user: T | null): Promise<T | null> {
            if (!user) return null;

            try {
                const stripeCustomerId = await getOrCreateStripeCustomer({
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    stripeCustomerId: user.stripeCustomerId || null,
                });

                if (user.stripeCustomerId === stripeCustomerId) return user;
                await prisma.user.update({
                    where: { id: user.id },
                    data: { stripeCustomerId },
                });
                return {
                    ...user,
                    stripeCustomerId,
                };
            } catch (error) {
                console.error('Stripe customer ensure error:', error);
                return user;
            }
        }

        const upsertSession = async (userId: string, role: string, userEmail: string) => {
            const sessionId = crypto.randomUUID();
            const refreshToken = generateRefreshToken();
            const refreshHash = hashToken(refreshToken);
            const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE * 1000);
            const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || request.headers.get('x-real-ip')
                || undefined;
            const userAgent = request.headers.get('user-agent') || undefined;
            const derivedDeviceId = !normalizedDeviceId && userAgent
                ? crypto.createHash('sha256').update(`${userAgent}-${ipAddress || ''}`).digest('hex').slice(0, 32)
                : null;
            const effectiveDeviceId = normalizedDeviceId || derivedDeviceId;
            const uaInfo = parseUserAgent(userAgent);
            const effectiveDeviceName = normalizedDeviceName || uaInfo.deviceLabel;

            const userRecord = await prisma.user.findUnique({
                where: { id: userId },
                select: { primaryDeviceId: true }
            });
            const primaryDeviceId = userRecord?.primaryDeviceId || null;

            let isNewDevice = false;
            if (effectiveDeviceId) {
                const existing = await prisma.userSession.findFirst({
                    where: {
                        userId,
                        deviceId: effectiveDeviceId,
                    }
                });
                if (existing) {
                    await prisma.userSession.update({
                        where: { id: existing.id },
                        data: {
                            sessionId,
                            userAgent,
                            ipAddress,
                            revokedAt: null,
                            lastUsedAt: new Date(),
                            deviceName: effectiveDeviceName || existing.deviceName,
                            refreshTokenHash: refreshHash,
                            refreshTokenExpiresAt: refreshExpiresAt,
                        }
                    });
                } else {
                    isNewDevice = true;
                    await prisma.userSession.create({
                        data: {
                            userId,
                            sessionId,
                            deviceId: effectiveDeviceId,
                            deviceName: effectiveDeviceName || undefined,
                            refreshTokenHash: refreshHash,
                            refreshTokenExpiresAt: refreshExpiresAt,
                            userAgent,
                            ipAddress,
                        }
                    });
                }
            } else {
                isNewDevice = true;
                await prisma.userSession.create({
                    data: {
                        userId,
                        sessionId,
                        deviceName: effectiveDeviceName || undefined,
                        refreshTokenHash: refreshHash,
                        refreshTokenExpiresAt: refreshExpiresAt,
                        userAgent,
                        ipAddress,
                    }
                });
            }

            if (!primaryDeviceId && effectiveDeviceId) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { primaryDeviceId: effectiveDeviceId }
                });
            }

            if (isNewDevice && effectiveDeviceId && primaryDeviceId && effectiveDeviceId !== primaryDeviceId) {
                const location = await lookupLocation(ipAddress);
                const locationText = location
                    ? [location.city, location.region, location.country].filter(Boolean).join(', ')
                    : 'Unknown location';
                try {
                    await sendEmail({
                        to: userEmail,
                        subject: 'New device signed in',
                        html: buildNewDeviceEmail({
                            device: effectiveDeviceName,
                            ip: ipAddress || 'Unknown',
                            location: locationText,
                        }),
                    });
                } catch (err) {
                    console.warn('Device login email failed', err);
                }
            }

            const accessToken = createSessionToken({
                userId,
                role,
                expiresAt: Date.now() + SESSION_COOKIE_AGE * 1000,
                sessionId,
            });
            return { accessToken, refreshToken };
        };

        if (action === 'signup') {
            // Check if user already exists
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: email.toLowerCase() },
                        { username }
                    ]
                }
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: 'Email or username already exists' },
                    { status: 400 }
                );
            }

            // Create new user
            const hashedPassword = hashPassword(password);
            let user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    username,
                    password: hashedPassword,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    role: 'user' // Default new users to 'user' role
                }
            });

            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Welcome to No Limit Flix',
                    html: buildWelcomeEmail(),
                });
            } catch (err) {
                console.warn('Signup email failed', err);
            }

            user = await ensureStripeCustomer(user);

            const { accessToken: token, refreshToken } = await upsertSession(user.id, user.role, user.email);

            // Set session cookie
            const response = NextResponse.json({
                success: true,
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: resolveMediaUrl(user.avatar),
                    showWelcomeScreen: user.showWelcomeScreen,
                    role: user.role,
                    googleId: user.googleId,
                    appleId: user.appleId,
                }
            });

            response.cookies.set(SESSION_COOKIE_NAME, token, getAuthCookieOptions(SESSION_COOKIE_AGE));
            response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getAuthCookieOptions(REFRESH_TOKEN_AGE));

            return response;
        } else if (action === 'login') {
            let user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user || !verifyPassword(password, user.password)) {
                return NextResponse.json(
                    { error: 'Invalid email or password' },
                    { status: 401 }
                );
            }

            user = await ensureStripeCustomer(user);

            const { accessToken: token, refreshToken } = await upsertSession(user.id, user.role, user.email);

            const response = NextResponse.json({
                success: true,
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: resolveMediaUrl(user.avatar),
                    showWelcomeScreen: user.showWelcomeScreen,
                    role: user.role,
                    googleId: user.googleId,
                    appleId: user.appleId,
                }
            });

            response.cookies.set(SESSION_COOKIE_NAME, token, getAuthCookieOptions(SESSION_COOKIE_AGE));
            response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getAuthCookieOptions(REFRESH_TOKEN_AGE));

            return response;
        } else if (action === 'google') {
            if (!idToken || typeof idToken !== 'string') {
                return NextResponse.json({ error: 'Missing Google token' }, { status: 400 });
            }

            const verifyGoogleToken = async () => {
                const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
                    cache: 'no-store',
                });
                if (!response.ok) return null;
                const data = await response.json();
                const validAudiences = [
                    process.env.GOOGLE_WEB_CLIENT_ID,
                    process.env.GOOGLE_ANDROID_CLIENT_ID,
                    process.env.GOOGLE_IOS_CLIENT_ID,
                ].filter(Boolean);
                if (!validAudiences.length || !validAudiences.includes(data.aud)) {
                    return null;
                }
                if (data.email_verified !== 'true' && data.email_verified !== true) return null;
                return data;
            };

            const tokenInfo = await verifyGoogleToken();
            const googleId = tokenInfo?.sub ? String(tokenInfo.sub) : null;
            if (!tokenInfo?.email || !googleId) {
                return NextResponse.json({ error: 'Google token invalid' }, { status: 401 });
            }

            let user = await prisma.user.findFirst({
                where: { googleId }
            });

            if (!user) {
                const emailLower = tokenInfo.email.toLowerCase();
                const byEmail = await prisma.user.findUnique({ where: { email: emailLower } });
                if (byEmail) {
                    if (byEmail.googleId && byEmail.googleId !== googleId) {
                        return NextResponse.json(
                            { error: 'Account is already linked to a different Google profile.' },
                            { status: 409 }
                        );
                    }
                    user = await prisma.user.update({
                        where: { id: byEmail.id },
                        data: {
                            googleId,
                            avatar: byEmail.avatar || tokenInfo.picture || undefined,
                        }
                    });
                }
            }

            user = await ensureStripeCustomer(user);

            if (!user) {
                const baseUsername = tokenInfo.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'user';
                let candidate = baseUsername;
                let attempts = 0;
                while (attempts < 5) {
                    const exists = await prisma.user.findUnique({ where: { username: candidate } });
                    if (!exists) break;
                    candidate = `${baseUsername}${Math.floor(Math.random() * 9999)}`;
                    attempts += 1;
                }
                const hashedPassword = hashPassword(crypto.randomUUID());
                user = await prisma.user.create({
                    data: {
                        email: tokenInfo.email.toLowerCase(),
                        username: candidate,
                        password: hashedPassword,
                        googleId,
                        avatar: tokenInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate}`,
                        role: 'user'
                    }
                });

                try {
                    await sendEmail({
                        to: user.email,
                        subject: 'Welcome to No Limit Flix',
                        html: buildWelcomeEmail(),
                    });
                } catch (err) {
                    console.warn('Signup email failed', err);
                }
            }

            const { accessToken: token, refreshToken } = await upsertSession(user.id, user.role, user.email);

            const response = NextResponse.json({
                success: true,
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: resolveMediaUrl(user.avatar),
                    showWelcomeScreen: user.showWelcomeScreen,
                    role: user.role,
                    googleId: user.googleId,
                    appleId: user.appleId,
                }
            });

            response.cookies.set(SESSION_COOKIE_NAME, token, getAuthCookieOptions(SESSION_COOKIE_AGE));
            response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getAuthCookieOptions(REFRESH_TOKEN_AGE));

            return response;
        } else if (action === 'apple') {
            if (!identityToken || typeof identityToken !== 'string') {
                return NextResponse.json({ error: 'Missing Apple token' }, { status: 400 });
            }

            const tokenInfo = await verifyAppleIdentityToken(identityToken);
            const appleId = tokenInfo?.appleId || null;
            if (!appleId) {
                return NextResponse.json({ error: 'Apple token invalid' }, { status: 401 });
            }

            const normalizedAppleEmail = typeof appleEmail === 'string' && appleEmail.trim().length > 0
                ? appleEmail.trim().toLowerCase()
                : null;
            const normalizedAppleName = typeof appleName === 'string' && appleName.trim().length > 0
                ? appleName.trim()
                : null;
            const syntheticEmail = `apple-${crypto.createHash('sha256').update(appleId).digest('hex').slice(0, 24)}@${APPLE_SYNTHETIC_EMAIL_DOMAIN}`;
            const resolvedEmail = tokenInfo?.email || normalizedAppleEmail || syntheticEmail;
            const isSyntheticEmail = resolvedEmail.endsWith(`@${APPLE_SYNTHETIC_EMAIL_DOMAIN}`);

            let user = await prisma.user.findFirst({
                where: { appleId }
            });

            if (user && tokenInfo?.email && user.email.endsWith(`@${APPLE_SYNTHETIC_EMAIL_DOMAIN}`)) {
                const conflictUser = await prisma.user.findUnique({ where: { email: tokenInfo.email } });
                if (!conflictUser || conflictUser.id === user.id) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { email: tokenInfo.email },
                    });
                }
            }

            user = await ensureStripeCustomer(user);

            if (!user && resolvedEmail) {
                const byEmail = await prisma.user.findUnique({ where: { email: resolvedEmail } });
                if (byEmail) {
                    if (byEmail.appleId && byEmail.appleId !== appleId) {
                        return NextResponse.json(
                            { error: 'Account is already linked to a different Apple profile.' },
                            { status: 409 }
                        );
                    }
                    user = await prisma.user.update({
                        where: { id: byEmail.id },
                        data: { appleId }
                    });
                }
            }

            if (!user) {
                const baseUsername = (normalizedAppleName || resolvedEmail.split('@')[0] || 'appleuser')
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .slice(0, 16) || 'appleuser';
                let candidate = baseUsername;
                let attempts = 0;
                while (attempts < 5) {
                    const exists = await prisma.user.findUnique({ where: { username: candidate } });
                    if (!exists) break;
                    candidate = `${baseUsername}${Math.floor(Math.random() * 9999)}`;
                    attempts += 1;
                }

                const hashedPassword = hashPassword(crypto.randomUUID());
                user = await prisma.user.create({
                    data: {
                        email: resolvedEmail,
                        username: candidate,
                        password: hashedPassword,
                        appleId,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate}`,
                        role: 'user'
                    }
                });

                try {
                    if (!isSyntheticEmail) {
                        await sendEmail({
                            to: user.email,
                            subject: 'Welcome to No Limit Flix',
                            html: buildWelcomeEmail(),
                        });
                    }
                } catch (err) {
                    console.warn('Signup email failed', err);
                }
            }

            const { accessToken: token, refreshToken } = await upsertSession(user.id, user.role, user.email);

            const response = NextResponse.json({
                success: true,
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: resolveMediaUrl(user.avatar),
                    showWelcomeScreen: user.showWelcomeScreen,
                    role: user.role,
                    googleId: user.googleId,
                    appleId: user.appleId,
                }
            });

            response.cookies.set(SESSION_COOKIE_NAME, token, getAuthCookieOptions(SESSION_COOKIE_AGE));
            response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getAuthCookieOptions(REFRESH_TOKEN_AGE));

            return response;
        } else if (action === 'logout') {
            const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
            const payload = verifySessionToken(token);
            if (payload?.sessionId) {
                await prisma.userSession.updateMany({
                    where: { sessionId: payload.sessionId },
                    data: { revokedAt: new Date(), refreshTokenHash: null, refreshTokenExpiresAt: null }
                });
            }

            const response = NextResponse.json({ success: true });
            response.cookies.set(SESSION_COOKIE_NAME, '', clearAuthCookieOptions());
            response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, '', clearAuthCookieOptions());
            return response;
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
