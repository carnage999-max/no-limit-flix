import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users (admin only)
export async function GET(request: NextRequest) {
    try {
        // Check admin session
        const adminSession = request.headers.get('cookie')?.includes('adminSession');
        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true
            },
            orderBy: [
                { role: 'desc' }, // Admins first
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
