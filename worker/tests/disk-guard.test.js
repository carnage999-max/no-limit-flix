const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');

const { checkDiskSpace } = require('../src/ingest');

test.beforeEach(() => {
    process.env.MEDIA_ROOT = os.tmpdir();
});

test('passes when the reserve is disabled', async () => {
    process.env.MEDIA_MIN_FREE_GB = '0';
    assert.equal((await checkDiskSpace(10 ** 12)).ok, true);
});

test('blocks when free space is below the reserve', async () => {
    process.env.MEDIA_MIN_FREE_GB = '99999999';
    const result = await checkDiskSpace();

    assert.equal(result.ok, false);
    assert.ok(result.freeGb > 0);
});

test('reserves space for the incoming file on top of the minimum', async () => {
    process.env.MEDIA_MIN_FREE_GB = '1';
    assert.equal((await checkDiskSpace(0)).ok, true);
    assert.equal((await checkDiskSpace(10 ** 15)).ok, false);
});

test('defaults to a 600GB reserve when unset', async () => {
    delete process.env.MEDIA_MIN_FREE_GB;
    assert.equal((await checkDiskSpace()).minFreeGb, 600);
});
