import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const { userId, query } = await request.json();
        const normalizedQuery = typeof query === 'string' ? query.trim() : '';

        if (!userId && !normalizedQuery) {
            return NextResponse.json(
                { error: 'Email or username is required' },
                { status: 400 }
            );
        }

        const where: Prisma.UserWhereInput = userId
            ? { id: userId }
            : {
                OR: [
                    { email: { equals: normalizedQuery.toLowerCase(), mode: 'insensitive' } },
                    { username: { equals: normalizedQuery, mode: 'insensitive' } },
                ],
            };

        const user = await prisma.user.findFirst({ where });

        if (!user) {
            return NextResponse.json(
                { error: 'No user found for that email or username' },
                { status: 404 }
            );
        }

        if (user.role === 'admin') {
            return NextResponse.json(
                { error: 'User is already an admin' },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'admin' },
            select: {
                id: true,
                email: true,
                username: true,
                role: true
            }
        });

        return NextResponse.json({
            success: true,
            message: `${updatedUser.username} has been promoted to admin`,
            user: updatedUser
        });
    } catch (error) {
        console.error('Promote user error:', error);
        return NextResponse.json(
            { error: 'Failed to promote user' },
            { status: 500 }
        );
    }
}
