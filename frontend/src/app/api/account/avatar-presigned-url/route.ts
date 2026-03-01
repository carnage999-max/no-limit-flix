import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { s3Client, BUCKET_NAME, CLOUDFRONT_URL } from '@/lib/s3';
import { getSessionUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileName, fileType } = await request.json();
        if (!fileName || !fileType) {
            return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
        }

        if (!fileType.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
        }

        const extension = fileName.split('.').pop() || 'jpg';
        const uniqueId = crypto.randomUUID();
        const key = `avatars/${sessionUser.id}/${uniqueId}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const publicUrl = CLOUDFRONT_URL
            ? `https://${CLOUDFRONT_URL.endsWith('/') ? CLOUDFRONT_URL.slice(0, -1) : CLOUDFRONT_URL}/${key}`
            : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

        return NextResponse.json({ presignedUrl, publicUrl, key });
    } catch (error) {
        console.error('Avatar presigned URL error:', error);
        return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }
}
