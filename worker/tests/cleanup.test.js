const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { cleanupConvertedMp4 } = require('../src/cleanup');

const makeLibrary = ({ withEndList = true, missingSegment = false } = {}) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
    const hlsDir = path.join(root, 'ia/film/hls/film-mp4');
    fs.mkdirSync(hlsDir, { recursive: true });
    fs.writeFileSync(path.join(root, 'ia/film/film.mp4'), 'x'.repeat(2048));
    fs.writeFileSync(path.join(hlsDir, 'segment-00000.ts'), 'a');
    if (!missingSegment) fs.writeFileSync(path.join(hlsDir, 'segment-00001.ts'), 'b');
    fs.writeFileSync(
        path.join(hlsDir, 'master.m3u8'),
        `#EXTM3U\n#EXTINF:10,\nsegment-00000.ts\n#EXTINF:10,\nsegment-00001.ts\n${withEndList ? '#EXT-X-ENDLIST\n' : ''}`
    );
    return root;
};

const row = {
    id: 'v1',
    s3KeySource: 'ia/film/film.mp4',
    s3KeyPlayback: 'ia/film/hls/film-mp4/master.m3u8'
};

const deps = (root, overrides = {}) => ({
    resolvePath: (key) => path.join(root, key),
    isReferencedElsewhere: async () => false,
    dryRun: false,
    ...overrides
});

test('deletes the mp4 once the hls output is complete', async () => {
    const root = makeLibrary();
    const outcome = await cleanupConvertedMp4(row, deps(root));

    assert.deepEqual(outcome, { status: 'deleted', bytes: 2048 });
    assert.equal(fs.existsSync(path.join(root, 'ia/film/film.mp4')), false);
    assert.equal(fs.existsSync(path.join(root, 'ia/film/hls/film-mp4/master.m3u8')), true);
});

test('a dry run reports the size but keeps the file', async () => {
    const root = makeLibrary();
    const outcome = await cleanupConvertedMp4(row, deps(root, { dryRun: true }));

    assert.deepEqual(outcome, { status: 'would-delete', bytes: 2048 });
    assert.equal(fs.existsSync(path.join(root, 'ia/film/film.mp4')), true);
});

test('keeps the mp4 when the playlist is unfinished or a segment is missing', async () => {
    for (const options of [{ withEndList: false }, { missingSegment: true }]) {
        const root = makeLibrary(options);
        const outcome = await cleanupConvertedMp4(row, deps(root));

        assert.equal(outcome.status, 'skipped');
        assert.equal(fs.existsSync(path.join(root, 'ia/film/film.mp4')), true);
    }
});

test('keeps the mp4 when another video points at it', async () => {
    const root = makeLibrary();
    const outcome = await cleanupConvertedMp4(row, deps(root, { isReferencedElsewhere: async () => true }));

    assert.equal(outcome.status, 'skipped');
    assert.equal(fs.existsSync(path.join(root, 'ia/film/film.mp4')), true);
});

test('only touches imported ia/ mp4 files', async () => {
    const root = makeLibrary();
    for (const s3KeySource of ['videos/upload.mp4', 'ia/../videos/upload.mp4', 'ia/film/film.mkv']) {
        const outcome = await cleanupConvertedMp4({ ...row, s3KeySource }, deps(root));
        assert.equal(outcome.status, 'skipped');
    }
});

test('reports gone when the mp4 was already removed', async () => {
    const root = makeLibrary();
    fs.unlinkSync(path.join(root, 'ia/film/film.mp4'));

    assert.deepEqual(await cleanupConvertedMp4(row, deps(root)), { status: 'gone' });
});
