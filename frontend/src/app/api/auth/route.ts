import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, generateSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_AGE } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { action, email, password, username } = await request.json();

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
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
                }
            });

            // Generate session token
            const token = generateSessionToken();

            // Set session cookie
            const response = NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: user.avatar
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

            // Generate session token
            const token = generateSessionToken();

            const response = NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatar: user.avatar
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
