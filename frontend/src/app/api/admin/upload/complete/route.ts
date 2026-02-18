import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { videoId, fileSize } = body;

        if (!videoId) {
            return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
        }

        const completeRes = await prisma.video.update({
            where: { id: videoId },
            data: {
                status: 'completed',
                fileSize: fileSize ? BigInt(fileSize) : null,
            },
        });

        // Construct the public URL (CloudFront or direct S3)
        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const publicUrl = cloudFrontUrl
            ? `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${completeRes.s3Key}`
            : completeRes.s3Url;

        const video = await prisma.video.update({
            where: { id: videoId },
            data: { s3Url: publicUrl },
        });

        return NextResponse.json({ success: true, video });
    } catch (error: any) {
        console.error('Error completing upload:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
