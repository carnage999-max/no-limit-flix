const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const { inferMimeType } = require('./internet-archive');

const requiredEnv = (name) => {
    if (!process.env[name]) {
        throw new Error(`${name} is required`);
    }
    return process.env[name];
};

const s3Bucket = requiredEnv('S3_BUCKET');
const s3Region = process.env.S3_REGION || process.env.AWS_REGION;
if (!s3Region) {
    throw new Error('S3_REGION or AWS_REGION is required');
}
const cloudfrontUrl = process.env.CLOUDFRONT_URL || '';

const s3Client = new S3Client({
    region: s3Region,
    credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN || undefined
        }
        : undefined
});

const sanitizeFileName = (name) => {
    if (!name) return 'video.mp4';
    return name.replace(/[\\/]+/g, '_').trim();
};

const buildS3Key = (identifier, fileName) => {
    return `ia/${identifier}/${sanitizeFileName(fileName)}`;
};

const buildPublicUrl = (key) => {
    if (cloudfrontUrl) {
        return `${cloudfrontUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`;
};

async function uploadToS3(downloadUrl, key, fileMeta) {
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
        throw new Error(`Failed to download source file (${response.status})`);
    }

    const contentType = inferMimeType(fileMeta) || response.headers.get('content-type') || 'application/octet-stream';

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: s3Bucket,
            Key: key,
            Body: response.body,
            ContentType: contentType
        }
    });

    await upload.done();

    return {
        s3Url: buildPublicUrl(key),
        contentType
    };
}

async function listS3Objects(prefix, limit = 1000) {
    const keys = [];
    let continuationToken;

    while (keys.length < limit) {
        const response = await s3Client.send(new ListObjectsV2Command({
            Bucket: s3Bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            MaxKeys: Math.min(1000, limit - keys.length)
        }));

        const contents = response.Contents || [];
        for (const entry of contents) {
            if (entry?.Key) {
                keys.push(entry.Key);
            }
        }

        if (!response.IsTruncated || !response.NextContinuationToken) {
            break;
        }
        continuationToken = response.NextContinuationToken;
    }

    return keys;
}

module.exports = {
    buildS3Key,
    buildPublicUrl,
    uploadToS3,
    listS3Objects
};
