import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Promote user to admin (admin only)
export async function POST(request: NextRequest) {
    try {
        // Check admin session
        const adminSession = request.headers.get('cookie')?.includes('adminSession');
        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if already admin
        if (user.role === 'admin') {
            return NextResponse.json(
                { error: 'User is already an admin' },
                { status: 400 }
            );
        }

        // Promote to admin
        const updatedUser = await prisma.user.update({
            where: { id: userId },
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
