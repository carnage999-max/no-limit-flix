const fsp = require('fs/promises');
const path = require('path');

// Removes the original MP4 of a movie once its HLS copy is safely on disk. Deleting is only ever
// done for imported files under ia/, and only after the playlist and every segment it lists exist.

const MP4_PATTERN = /\.mp4$/i;
const MANIFEST_PATTERN = /\.m3u8$/i;

const isHostedImportMp4 = (key) =>
    typeof key === 'string' &&
    key.startsWith('ia/') &&
    MP4_PATTERN.test(key) &&
    !key.split('/').includes('..');

const statOrNull = async (targetPath) => {
    try {
        return await fsp.stat(targetPath);
    } catch {
        return null;
    }
};

const isHlsComplete = async (manifestPath) => {
    let text;
    try {
        text = await fsp.readFile(manifestPath, 'utf8');
    } catch {
        return false;
    }
    if (!text.includes('#EXT-X-ENDLIST')) return false;

    const segments = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
    if (segments.length === 0) return false;

    const dir = path.dirname(manifestPath);
    for (const segment of segments) {
        if (!(await statOrNull(path.join(dir, segment)))) return false;
    }
    return true;
};

/**
 * Decides what to do with one converted movie and, unless dryRun, deletes its MP4.
 * Returns { status: 'deleted' | 'would-delete' | 'gone' | 'skipped', bytes?, reason? }.
 * 'gone' means the MP4 was already missing, so the caller only needs to clear the pointer.
 */
const cleanupConvertedMp4 = async (row, { resolvePath, isReferencedElsewhere, dryRun }) => {
    const mp4Key = row.s3KeySource;
    if (!isHostedImportMp4(mp4Key)) {
        return { status: 'skipped', reason: 'Source is not an imported ia/ MP4' };
    }
    if (!MANIFEST_PATTERN.test(row.s3KeyPlayback || '')) {
        return { status: 'skipped', reason: 'Playback is not an HLS playlist' };
    }

    const mp4Path = resolvePath(mp4Key);
    const stat = await statOrNull(mp4Path);
    if (!stat) return { status: 'gone' };

    if (!(await isHlsComplete(resolvePath(row.s3KeyPlayback)))) {
        return { status: 'skipped', reason: 'HLS output is missing or incomplete' };
    }
    if (await isReferencedElsewhere(row.id, mp4Key)) {
        return { status: 'skipped', reason: 'MP4 is used by another video' };
    }

    if (dryRun) return { status: 'would-delete', bytes: stat.size };
    await fsp.unlink(mp4Path);
    return { status: 'deleted', bytes: stat.size };
};

module.exports = { cleanupConvertedMp4, isHostedImportMp4, isHlsComplete };
