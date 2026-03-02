import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword, verifyPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_AGE, verifySessionToken } from '@/lib/auth';
import { parseUserAgent, lookupLocation } from '@/lib/device';
import { sendEmail } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { action, email, password, username, deviceId, deviceName } = await request.json();
        const normalizedDeviceId = typeof deviceId === 'string' && deviceId.trim().length > 0
            ? deviceId.trim()
            : null;
        const normalizedDeviceName = typeof deviceName === 'string' && deviceName.trim().length > 0
            ? deviceName.trim()
            : null;

        const upsertSession = async (userId: string, role: string, userEmail: string) => {
            const sessionId = crypto.randomUUID();
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

            const maxDevicesDefault = Number(process.env.MAX_ACTIVE_DEVICES || 5);
            const userRecord = await prisma.user.findUnique({
                where: { id: userId },
                select: { maxDevices: true, primaryDeviceId: true }
            });
            const maxDevices = userRecord?.maxDevices ?? maxDevicesDefault;
            const primaryDeviceId = userRecord?.primaryDeviceId || null;

            const activeSessions = await prisma.userSession.findMany({
                where: { userId, revokedAt: null },
                select: { deviceId: true }
            });
            const activeDeviceIds = new Set(activeSessions.map((s) => s.deviceId).filter(Boolean) as string[]);
            const isExistingActive = effectiveDeviceId ? activeDeviceIds.has(effectiveDeviceId) : false;

            if (!isExistingActive && activeDeviceIds.size >= maxDevices) {
                const location = await lookupLocation(ipAddress);
                const locationText = location
                    ? [location.city, location.region, location.country].filter(Boolean).join(', ')
                    : 'Unknown location';
                try {
                    await sendEmail({
                        to: userEmail,
                        subject: 'New device sign-in blocked',
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #111;">
                              <h2>New device sign-in blocked</h2>
                              <p>We blocked a sign-in because your account has reached the maximum number of active devices.</p>
                              <p><strong>Device:</strong> ${effectiveDeviceName}</p>
                              <p><strong>IP:</strong> ${ipAddress || 'Unknown'}</p>
                              <p><strong>Location:</strong> ${locationText}</p>
                              <p>If this was you, log out of another device and try again.</p>
                            </div>
                        `,
                    });
                } catch (err) {
                    console.warn('Device limit email failed', err);
                }
                throw new Error('MAX_DEVICES_REACHED');
            }

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
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #111;">
                              <h2>New device signed in</h2>
                              <p>We noticed a new device sign-in to your account.</p>
                              <p><strong>Device:</strong> ${effectiveDeviceName}</p>
                              <p><strong>IP:</strong> ${ipAddress || 'Unknown'}</p>
                              <p><strong>Location:</strong> ${locationText}</p>
                              <p>If this wasn’t you, please log out of all devices immediately.</p>
                            </div>
                        `,
                    });
                } catch (err) {
                    console.warn('Device login email failed', err);
                }
            }

            return createSessionToken({
                userId,
                role,
                expiresAt: Date.now() + SESSION_COOKIE_AGE * 1000,
                sessionId,
            });
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
            const user = await prisma.user.create({
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
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #111;">
                          <h2>Welcome to No Limit Flix</h2>
                          <p>Your account has been created successfully.</p>
                          <p>You can now sign in and start exploring the catalog.</p>
                        </div>
                    `,
                });
            } catch (err) {
                console.warn('Signup email failed', err);
            }

            let token: string;
            try {
                token = await upsertSession(user.id, user.role, user.email);
            } catch (err: any) {
                if (err?.message === 'MAX_DEVICES_REACHED') {
                    return NextResponse.json(
                        { error: 'Maximum active devices reached. Log out another device to continue.' },
                        { status: 403 }
                    );
                }
                throw err;
            }

            // Set session cookie
            const response = NextResponse.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: user.avatar,
                    showWelcomeScreen: user.showWelcomeScreen,
                    role: user.role
                }
            });

            response.cookies.set(SESSION_COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: SESSION_COOKIE_AGE,
                path: '/'
            });

            return response;
        } else if (action === 'login') {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user || !verifyPassword(password, user.password)) {
                return NextResponse.json(
                    { error: 'Invalid email or password' },
                    { status: 401 }
                );
            }

            let token: string;
            try {
                token = await upsertSession(user.id, user.role, user.email);
            } catch (err: any) {
                if (err?.message === 'MAX_DEVICES_REACHED') {
                    return NextResponse.json(
                        { error: 'Maximum active devices reached. Log out another device to continue.' },
                        { status: 403 }
                    );
                }
                throw err;
            }

            const response = NextResponse.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: user.avatar,
                    showWelcomeScreen: user.showWelcomeScreen,
                    role: user.role
                }
            });

            response.cookies.set(SESSION_COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: SESSION_COOKIE_AGE,
                path: '/'
            });

            return response;
        } else if (action === 'logout') {
            const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
            const payload = verifySessionToken(token);
            if (payload?.sessionId) {
                await prisma.userSession.updateMany({
                    where: { sessionId: payload.sessionId },
                    data: { revokedAt: new Date() }
                });
            }

            const response = NextResponse.json({ success: true });
            response.cookies.delete(SESSION_COOKIE_NAME);
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
