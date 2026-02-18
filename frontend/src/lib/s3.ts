import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    // We'll log a warning but allow the client to be initialized (it might fail later if used)
    console.warn('AWS credentials are not fully configured in environment variables');
}

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'placeholder',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'placeholder',
    },
});

export const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'no-limit-flix-videos';
export const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || '';
