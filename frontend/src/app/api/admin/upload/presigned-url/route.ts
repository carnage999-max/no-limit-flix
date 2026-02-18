import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import prisma from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            fileName, fileType,
            thumbFileName, thumbFileType,
            title, description, type, seasonNumber, episodeNumber,
            releaseYear, duration, resolution,
            genre, rating
        } = body;

        if (!fileName || !fileType || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const videoId = uuidv4();
        const fileExtension = fileName.split('.').pop();
        const s3Key = `videos/${videoId}.${fileExtension}`;

        const videoCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ContentType: fileType,
        });

        const presignedUrl = await getSignedUrl(s3Client, videoCommand, { expiresIn: 3600 });

        let thumbPresignedUrl = null;
        let thumbS3Key = null;

        if (thumbFileName && thumbFileType) {
            const thumbExtension = thumbFileName.split('.').pop();
            thumbS3Key = `thumbnails/${videoId}.${thumbExtension}`;

            const thumbCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: thumbS3Key,
                ContentType: thumbFileType,
            });

            thumbPresignedUrl = await getSignedUrl(s3Client, thumbCommand, { expiresIn: 3600 });
        }

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const publicUrl = cloudFrontUrl
            ? `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${s3Key}`
            : `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

        const publicThumbUrl = thumbS3Key
            ? (cloudFrontUrl
                ? `${cloudFrontUrl.endsWith('/') ? cloudFrontUrl.slice(0, -1) : cloudFrontUrl}/${thumbS3Key}`
                : `https://${BUCKET_NAME}.s3.amazonaws.com/${thumbS3Key}`)
            : null;

        // Create a pending record in the database
        const video = await (prisma.video as any).create({
            data: {
                id: videoId,
                title,
                description,
                type: type || 'movie',
                seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
                episodeNumber: episodeNumber ? parseInt(episodeNumber) : null,
                releaseYear: releaseYear ? parseInt(releaseYear) : null,
                duration: duration ? parseFloat(duration) : null,
                resolution,
                genre,
                rating,
                s3Key,
                s3Url: publicUrl,
                thumbnailUrl: publicThumbUrl,
                status: 'pending',
                mimeType: fileType,
            },
        });

        return NextResponse.json({
            presignedUrl,
            s3Key,
            thumbPresignedUrl,
            thumbS3Key,
            videoId: video.id,
        });
    } catch (error: any) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
