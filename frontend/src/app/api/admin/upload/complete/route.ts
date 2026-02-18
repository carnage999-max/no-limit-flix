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

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

        // Fetch current record to get the s3Key if not already in memory
        // completeRes contains it from the previous implementation, but let's do one clean update.
        // We first need the s3Key and existing thumbnailUrl to re-calculate urls if env changed.
        const currentRecord = await (prisma.video as any).findUnique({ where: { id: videoId } });
        if (!currentRecord) {
            return NextResponse.json({ error: 'Video record not found' }, { status: 404 });
        }

        const publicUrl = cloudFrontUrl
            ? `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${currentRecord.s3Key}`
            : `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${currentRecord.s3Key}`;

        let publicThumbUrl = currentRecord.thumbnailUrl;
        if (currentRecord.s3Key && currentRecord.thumbnailUrl) {
            // Re-identify thumbnail key if we need to map to CloudFront
            // Usually thumb key is stored in currentRecord.thumbnailUrl as an S3 URL or CF URL
            // It's safer to use the thumbS3Key logic if we had it, but we can extract it.
            const s3Pattern = `.s3.amazonaws.com/`;
            if (currentRecord.thumbnailUrl.includes(s3Pattern)) {
                const thumbS3Key = currentRecord.thumbnailUrl.split(s3Pattern).pop();
                if (thumbS3Key && cloudFrontUrl) {
                    publicThumbUrl = `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${thumbS3Key}`;
                }
            }
        }

        const video = await (prisma.video as any).update({
            where: { id: videoId },
            data: {
                status: 'completed',
                fileSize: fileSize ? BigInt(fileSize) : null,
                s3Url: publicUrl,
                thumbnailUrl: publicThumbUrl
            },
        });

        console.log('Record fully synchronized in DB');

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
