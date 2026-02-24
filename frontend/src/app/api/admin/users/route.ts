import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users (admin only) with pagination and search
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

        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '10'));
        const search = searchParams.get('search') || '';

        // Build search query
        const whereClause: any = {};
        if (search) {
            whereClause.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Get total count
        const total = await prisma.user.count({
            where: whereClause
        });

        const totalPages = Math.ceil(total / pageSize);

        // Get paginated users
        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                username: true,
                role: true
            },
            orderBy: [
                { role: 'desc' }, // Admins first
                { createdAt: 'desc' }
            ],
            skip: (page - 1) * pageSize,
            take: pageSize
        });

        return NextResponse.json({
            users,
            total,
            page,
            pageSize,
            totalPages
        });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
