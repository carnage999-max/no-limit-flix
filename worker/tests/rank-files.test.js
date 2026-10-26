const test = require('node:test');
const assert = require('node:assert/strict');

const { rankPlayableFiles, pickBestPlayableFile } = require('../src/internet-archive');

const mp4 = (name, size, height, extra = {}) => ({
    name,
    format: 'h.264',
    size: String(size),
    height: height === null ? undefined : String(height),
    length: '5400',
    ...extra
});

test('prefers the smallest watchable mp4 over the largest', () => {
    const files = [
        mp4('big.mp4', 4_000_000_000, 1080),
        mp4('small.mp4', 600_000_000, 480),
        mp4('medium.mp4', 1_500_000_000, 720)
    ];

    assert.equal(pickBestPlayableFile(files, false).name, 'small.mp4');
});

test('does not pick a file below the minimum resolution when a watchable one exists', () => {
    const files = [
        mp4('tiny.mp4', 80_000_000, 240),
        mp4('ok.mp4', 700_000_000, 480)
    ];

    assert.equal(pickBestPlayableFile(files, false).name, 'ok.mp4');
});

test('falls back to the smallest file when every option is low-res', () => {
    const files = [
        mp4('a.mp4', 300_000_000, 240),
        mp4('b.mp4', 200_000_000, 240)
    ];

    assert.equal(pickBestPlayableFile(files, false).name, 'b.mp4');
});

test('ranks files with unknown size after files with a known size', () => {
    const files = [
        { name: 'unknown.mp4', format: 'h.264', height: '480' },
        mp4('known.mp4', 900_000_000, 480)
    ];

    assert.deepEqual(rankPlayableFiles(files, false).map((f) => f.name), ['known.mp4', 'unknown.mp4']);
});

test('returns null instead of throwing when nothing is playable', () => {
    assert.equal(pickBestPlayableFile([{ name: 'notes.txt', format: 'Text' }], false), null);
});
