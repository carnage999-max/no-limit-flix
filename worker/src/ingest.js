const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { spawn, spawnSync } = require('child_process');

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
let ffmpegAvailable;

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

const buildS3Key = (identifier, fileName, kind = '') => {
    const normalizedKind = String(kind || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
    if (normalizedKind) {
        return `ia/${normalizedKind}/${identifier}/${sanitizeFileName(fileName)}`;
    }
    return `ia/${identifier}/${sanitizeFileName(fileName)}`;
};

const buildPublicUrl = (key) => {
    if (cloudfrontUrl) {
        return `${cloudfrontUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`;
};

const checkFfmpegAvailable = () => {
    if (typeof ffmpegAvailable === 'boolean') return ffmpegAvailable;
    try {
        const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
        ffmpegAvailable = probe.status === 0;
    } catch {
        ffmpegAvailable = false;
    }
    return ffmpegAvailable;
};

const isTranscoderAvailable = () => checkFfmpegAvailable();

const toPositiveInt = (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return Math.round(numeric);
};

const toKbps = (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return `${Math.round(numeric)}k`;
};

const buildTranscodeArgs = (inputUrl, options = {}) => {
    const maxWidth = toPositiveInt(options.maxWidth || process.env.REELS_TRANSCODE_MAX_WIDTH, 1280);
    const crf = toPositiveInt(options.crf || process.env.REELS_TRANSCODE_CRF, 28);
    const preset = String(options.preset || process.env.REELS_TRANSCODE_PRESET || 'veryfast');
    const maxRate = toKbps(options.maxRateKbps || process.env.REELS_TRANSCODE_MAXRATE_KBPS, 2200);
    const bufSize = toKbps(options.bufSizeKbps || process.env.REELS_TRANSCODE_BUFSIZE_KBPS, 4400);
    const audioBitrate = toKbps(options.audioBitrateKbps || process.env.REELS_TRANSCODE_AUDIO_KBPS, 96);

    return [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', inputUrl,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf),
        '-maxrate', maxRate,
        '-bufsize', bufSize,
        '-vf', `scale='min(${maxWidth},iw)':-2:force_original_aspect_ratio=decrease`,
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4',
        'pipe:1'
    ];
};

async function uploadToS3(downloadUrl, key, fileMeta, options = {}) {
    const requestedTranscode = Boolean(options.transcode);
    if (requestedTranscode && checkFfmpegAvailable()) {
        let stderr = '';
        const ffmpeg = spawn('ffmpeg', buildTranscodeArgs(downloadUrl, options), {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        ffmpeg.stderr.on('data', (chunk) => {
            if (stderr.length < 6000) {
                stderr += chunk.toString();
            }
        });

        try {
            const upload = new Upload({
                client: s3Client,
                params: {
                    Bucket: s3Bucket,
                    Key: key,
                    Body: ffmpeg.stdout,
                    ContentType: 'video/mp4'
                }
            });

            const uploadPromise = upload.done();
            const ffmpegPromise = new Promise((resolve, reject) => {
                ffmpeg.on('error', reject);
                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        resolve(true);
                    } else {
                        reject(new Error(`ffmpeg exited with code ${code}: ${stderr || 'unknown ffmpeg error'}`));
                    }
                });
            });

            await Promise.all([uploadPromise, ffmpegPromise]);
            return {
                s3Url: buildPublicUrl(key),
                contentType: 'video/mp4',
                transcoded: true
            };
        } catch (error) {
            console.warn(`Transcode upload failed for ${key}; falling back to direct upload.`, error?.message || error);
            try {
                ffmpeg.kill('SIGKILL');
            } catch {
                // no-op
            }
        }
    } else if (requestedTranscode) {
        console.warn(`ffmpeg unavailable; uploading original stream for ${key}`);
    }

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
        contentType,
        transcoded: false
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
    listS3Objects,
    isTranscoderAvailable
};
