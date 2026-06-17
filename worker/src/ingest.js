const fs = require('fs');
const { promises: fsp } = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const { inferMimeType } = require('./internet-archive');

let ffmpegAvailable;

const getMediaRoot = () => process.env.MEDIA_ROOT || '/app/media';
const getMediaBaseUrl = () => (process.env.MEDIA_BASE_URL || 'https://nolimitflix.com/media').replace(/\/+$/, '');

const collapsePath = (value) =>
    String(value || '')
        .replace(/\\/g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\/+/, '')
        .replace(/^\.\//, '')
        .trim();

const normalizeMediaPath = (value) => {
    const normalized = collapsePath(value);
    if (!normalized) return '';

    const safeSegments = normalized
        .split('/')
        .filter(Boolean)
        .filter((segment) => segment !== '.');

    const resolved = [];
    for (const segment of safeSegments) {
        if (segment === '..') {
            resolved.pop();
            continue;
        }
        resolved.push(segment);
    }

    return resolved.join('/');
};

const sanitizeFileName = (name) => {
    if (!name) return 'video.mp4';
    const baseName = path.basename(String(name).trim()) || 'video.mp4';
    return baseName.replace(/[\\/]+/g, '_');
};

const normalizeKind = (kind) => String(kind || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
const isMp4FileName = (name) => /\.mp4$/i.test(String(name || ''));
const toMp4Name = (name) => sanitizeFileName(String(name || 'video.mp4').replace(/\.[^.]+$/, '') + '.mp4');

const resolveMoviePlaybackMode = () => {
    const value = String(process.env.MOVIE_PLAYBACK_MODE || 'hls').trim().toLowerCase();
    return value === 'mp4' ? 'mp4' : 'hls';
};

const buildMediaPath = (identifier, fileName, options = {}) => {
    const normalizedKind = normalizeKind(options.kind);
    const playbackType = String(options.playbackType || 'mp4').toLowerCase();

    if (normalizedKind === 'reels' || normalizedKind === 'reel') {
        return normalizeMediaPath(`ia/reels/${identifier}/${sanitizeFileName(fileName)}`);
    }

    if (playbackType === 'hls') {
        return normalizeMediaPath(`ia/${identifier}/hls/master.m3u8`);
    }

    if (normalizedKind) {
        return normalizeMediaPath(`ia/${normalizedKind}/${identifier}/${sanitizeFileName(fileName)}`);
    }

    return normalizeMediaPath(`ia/${identifier}/${sanitizeFileName(fileName)}`);
};

const buildS3Key = (identifier, fileName, kind = '') =>
    buildMediaPath(identifier, fileName, { kind, playbackType: 'mp4' });

const buildPublicMediaUrl = (relativePath) => {
    const mediaPath = normalizeMediaPath(relativePath);
    if (!mediaPath) return getMediaBaseUrl();
    return `${getMediaBaseUrl()}/${mediaPath}`;
};

const buildPublicUrl = (key) => buildPublicMediaUrl(key);

const getAbsoluteMediaPath = (relativePath) => path.join(getMediaRoot(), normalizeMediaPath(relativePath));

const ensureParentDirectory = async (targetPath) => {
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
};

const ensureCleanDirectory = async (targetDir) => {
    await fsp.rm(targetDir, { recursive: true, force: true });
    await fsp.mkdir(targetDir, { recursive: true });
};

const cleanupPath = async (targetPath) => {
    if (!targetPath) return;
    try {
        await fsp.rm(targetPath, { recursive: true, force: true });
    } catch {
        // best effort cleanup
    }
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

class DownloadFetchError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'DownloadFetchError';
        this.statusCode = statusCode;
    }
}

const toNodeReadable = (body) => {
    if (!body) return null;
    if (typeof body.pipe === 'function') return body;
    if (typeof Readable.fromWeb === 'function') {
        return Readable.fromWeb(body);
    }
    throw new Error('Unable to convert response body to Node stream');
};

const fetchDownload = async (downloadUrl) => {
    const response = await fetch(downloadUrl, {
        headers: {
            Accept: '*/*',
            'User-Agent': 'NoLimitFlix-Ingest/1.0'
        }
    });

    if (!response.ok || !response.body) {
        throw new DownloadFetchError(
            response.status,
            `Failed to download source file (${response.status})`
        );
    }

    return {
        response,
        stream: toNodeReadable(response.body)
    };
};

const downloadToFile = async (downloadUrl, destinationPath) => {
    const { response, stream } = await fetchDownload(downloadUrl);
    await ensureParentDirectory(destinationPath);
    await pipeline(stream, fs.createWriteStream(destinationPath));
    return response;
};

const downloadToTempFile = async (downloadUrl, fileName = 'source.mp4') => {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nlf-ingest-'));
    const tempPath = path.join(tempDir, sanitizeFileName(fileName));
    const response = await downloadToFile(downloadUrl, tempPath);
    return { tempDir, tempPath, response };
};

const runFfmpeg = (args) =>
    new Promise((resolve, reject) => {
        let stderr = '';
        const ffmpeg = spawn('ffmpeg', args, {
            stdio: ['ignore', 'ignore', 'pipe']
        });

        ffmpeg.stderr.on('data', (chunk) => {
            if (stderr.length < 6000) {
                stderr += chunk.toString();
            }
        });

        ffmpeg.on('error', reject);
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve(true);
                return;
            }
            reject(new Error(`ffmpeg exited with code ${code}: ${stderr || 'unknown ffmpeg error'}`));
        });
    });

const buildTranscodeArgs = (inputPath, outputPath, options = {}) => {
    const maxWidth = toPositiveInt(options.maxWidth || process.env.REELS_TRANSCODE_MAX_WIDTH, 1280);
    const crf = toPositiveInt(options.crf || process.env.REELS_TRANSCODE_CRF, 28);
    const preset = String(options.preset || process.env.REELS_TRANSCODE_PRESET || 'veryfast');
    const maxRate = toKbps(options.maxRateKbps || process.env.REELS_TRANSCODE_MAXRATE_KBPS, 2200);
    const bufSize = toKbps(options.bufSizeKbps || process.env.REELS_TRANSCODE_BUFSIZE_KBPS, 4400);
    const audioBitrate = toKbps(options.audioBitrateKbps || process.env.REELS_TRANSCODE_AUDIO_KBPS, 96);

    return [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf),
        '-maxrate', maxRate,
        '-bufsize', bufSize,
        '-vf', `scale='trunc(if(gt(iw,${maxWidth}),${maxWidth},iw)/2)*2':'-2'`,
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-movflags', 'faststart',
        '-f', 'mp4',
        outputPath
    ];
};

const buildHlsArgs = (inputPath, outputDir) => {
    const segmentDuration = String(toPositiveInt(process.env.MOVIE_HLS_SEGMENT_SECONDS, 10));
    const crf = String(toPositiveInt(process.env.MOVIE_HLS_CRF, 23));
    const preset = String(process.env.MOVIE_HLS_PRESET || 'veryfast');

    return [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf,
        '-c:a', 'aac',
        '-hls_time', segmentDuration,
        '-hls_list_size', '0',
        '-hls_segment_filename', path.join(outputDir, 'segment-%05d.ts'),
        '-f', 'hls',
        path.join(outputDir, 'master.m3u8')
    ];
};

const copyDirectory = async (sourceDir, destinationDir) => {
    await fsp.mkdir(path.dirname(destinationDir), { recursive: true });
    await fsp.rm(destinationDir, { recursive: true, force: true });
    await fsp.cp(sourceDir, destinationDir, { recursive: true });
};

const storeFileAtRelativePath = async (downloadUrl, relativePath, fileMeta, options = {}) => {
    const destinationPath = getAbsoluteMediaPath(relativePath);
    const shouldTranscode = Boolean(options.transcode);

    if (!shouldTranscode) {
        const response = await downloadToFile(downloadUrl, destinationPath);
        const contentType = inferMimeType(fileMeta) || response.headers.get('content-type') || 'application/octet-stream';
        return {
            s3Url: buildPublicMediaUrl(relativePath),
            publicUrl: buildPublicMediaUrl(relativePath),
            relativePath,
            contentType,
            transcoded: false,
            playbackType: 'mp4'
        };
    }

    if (!checkFfmpegAvailable()) {
        throw new Error('ffmpeg is required for MP4 transcoding');
    }

    const source = await downloadToTempFile(downloadUrl, fileMeta?.name || 'source.mp4');
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nlf-transcode-'));
    const outputPath = path.join(tempDir, path.basename(destinationPath));

    try {
        await runFfmpeg(buildTranscodeArgs(source.tempPath, outputPath, options));
        await ensureParentDirectory(destinationPath);
        await fsp.copyFile(outputPath, destinationPath);
        return {
            s3Url: buildPublicMediaUrl(relativePath),
            publicUrl: buildPublicMediaUrl(relativePath),
            relativePath,
            contentType: 'video/mp4',
            transcoded: true,
            playbackType: 'mp4'
        };
    } finally {
        await cleanupPath(source.tempDir);
        await cleanupPath(tempDir);
    }
};

async function uploadToS3(downloadUrl, key, fileMeta, options = {}) {
    return storeFileAtRelativePath(downloadUrl, normalizeMediaPath(key), fileMeta, options);
}

const storeMoviePlayback = async (downloadUrl, identifier, fileMeta) => {
    const preferredPlaybackType = resolveMoviePlaybackMode();

    if (preferredPlaybackType === 'hls') {
        if (!checkFfmpegAvailable()) {
            if (!isMp4FileName(fileMeta?.name)) {
                throw new Error('ffmpeg is required to import non-MP4 movies when HLS playback is enabled');
            }

            const relativePath = buildMediaPath(identifier, fileMeta?.name, { playbackType: 'mp4' });
            return storeFileAtRelativePath(downloadUrl, relativePath, fileMeta, { transcode: false });
        }

        const relativeManifestPath = buildMediaPath(identifier, fileMeta?.name, { playbackType: 'hls' });
        const finalOutputDir = path.dirname(getAbsoluteMediaPath(relativeManifestPath));
        const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nlf-hls-'));
        const sourcePath = path.join(workDir, sanitizeFileName(fileMeta?.name || 'source.mp4'));
        const tempOutputDir = path.join(workDir, 'output');

        try {
            await downloadToFile(downloadUrl, sourcePath);
            await ensureCleanDirectory(tempOutputDir);
            await runFfmpeg(buildHlsArgs(sourcePath, tempOutputDir));
            await copyDirectory(tempOutputDir, finalOutputDir);

            return {
                s3Url: buildPublicMediaUrl(relativeManifestPath),
                publicUrl: buildPublicMediaUrl(relativeManifestPath),
                relativePath: relativeManifestPath,
                contentType: 'application/vnd.apple.mpegurl',
                transcoded: true,
                playbackType: 'hls'
            };
        } finally {
            await cleanupPath(workDir);
        }
    }

    const outputName = isMp4FileName(fileMeta?.name) ? sanitizeFileName(fileMeta.name) : toMp4Name(fileMeta?.name);
    const relativePath = buildMediaPath(identifier, outputName, { playbackType: 'mp4' });
    const requiresTranscode = !isMp4FileName(fileMeta?.name);

    return storeFileAtRelativePath(downloadUrl, relativePath, fileMeta, { transcode: requiresTranscode });
};

async function listS3Objects(prefix, limit = 1000) {
    const normalizedPrefix = normalizeMediaPath(prefix);
    const startingPath = getAbsoluteMediaPath(normalizedPrefix);
    const keys = [];

    const walk = async (currentPath, currentRelativePath) => {
        if (keys.length >= limit) return;

        let stat;
        try {
            stat = await fsp.stat(currentPath);
        } catch {
            return;
        }

        if (stat.isFile()) {
            keys.push(normalizeMediaPath(currentRelativePath));
            return;
        }

        const entries = await fsp.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (keys.length >= limit) break;
            const nextRelativePath = normalizeMediaPath(path.posix.join(currentRelativePath, entry.name));
            const nextAbsolutePath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                await walk(nextAbsolutePath, nextRelativePath);
            } else if (entry.isFile()) {
                keys.push(nextRelativePath);
            }
        }
    };

    await walk(startingPath, normalizedPrefix);
    return keys.sort().slice(0, limit);
}

module.exports = {
    buildMediaPath,
    buildS3Key,
    buildPublicMediaUrl,
    buildPublicUrl,
    uploadToS3,
    storeMoviePlayback,
    listS3Objects,
    isTranscoderAvailable,
    resolveMoviePlaybackMode,
    DownloadFetchError
};
