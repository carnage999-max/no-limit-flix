import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/s3';

export async function POST(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { fileName, fileType, videoId } = body;

        if (!fileName || !videoId) {
            return NextResponse.json(
                { error: 'Missing required fields: fileName and videoId' },
                { status: 400 }
            );
        }

        const thumbExtension = fileName.split('.').pop();
        const thumbS3Key = `thumbnails/${videoId}.${thumbExtension}`;

        const thumbCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: thumbS3Key,
            ContentType: fileType || 'image/jpeg',
        });

        const presignedUrl = await getSignedUrl(s3Client, thumbCommand, { expiresIn: 3600 });

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const s3Url = cloudFrontUrl
            ? `https://${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${thumbS3Key}`
            : `https://${BUCKET_NAME}.s3.amazonaws.com/${thumbS3Key}`;

        return NextResponse.json({
            presignedUrl,
            s3Url,
        });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate presigned URL' },
            { status: 500 }
        );
    }
}
