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
        const { fileName, fileType, title, description, type, seasonNumber, episodeNumber } = body;

        if (!fileName || !fileType || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const fileExtension = fileName.split('.').pop();
        const s3Key = `videos/${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ContentType: fileType,
        });

        // Generate presigned URL (expires in 1 hour)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // Create a pending record in the database
        const video = await prisma.video.create({
            data: {
                title,
                description,
                type: type || 'movie',
                seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
                episodeNumber: episodeNumber ? parseInt(episodeNumber) : null,
                s3Key,
                s3Url: `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
                status: 'pending',
                mimeType: fileType,
            },
        });

        return NextResponse.json({
            presignedUrl,
            s3Key,
            videoId: video.id,
        });
    } catch (error: any) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
