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

        console.log('Completing upload for videoId:', videoId);

        if (!videoId) {
            return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
        }

        const completeRes = await (prisma.video as any).update({
            where: { id: videoId },
            data: {
                status: 'completed',
                fileSize: fileSize ? BigInt(fileSize) : null,
            },
        });

        console.log('Record marked as completed in DB');

        // Construct the public URL (CloudFront or direct S3)
        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const publicUrl = cloudFrontUrl
            ? `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${completeRes.s3Key}`
            : completeRes.s3Url;

        let publicThumbUrl = completeRes.thumbnailUrl;
        if (cloudFrontUrl && completeRes.thumbnailUrl) {
            const thumbS3Key = completeRes.thumbnailUrl.split('.com/').pop();
            if (thumbS3Key) {
                publicThumbUrl = `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${thumbS3Key}`;
            }
        }

        const video = await (prisma.video as any).update({
            where: { id: videoId },
            data: {
                s3Url: publicUrl,
                thumbnailUrl: publicThumbUrl
            },
        });

        console.log('Public URLs synced');

        // Serialize BigInt for JSON response
        const serializedVideo = {
            ...video,
            fileSize: video.fileSize?.toString() || null
        };

        return NextResponse.json({ success: true, video: serializedVideo });
    } catch (error: any) {
        console.error('CRITICAL ERROR in /api/admin/upload/complete:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
