import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

process.env.MEDIA_SIGNING_SECRET = 'test-secret';
process.env.MEDIA_URL_TTL_SECONDS = '600';

const { signMediaUrl, computeMediaSignature } = await import('../src/lib/media-signing.ts');

const NOW = 1_700_000_000_000;
const parse = (url) => {
  const match = url.match(/^\/media\/s\/(\d+)\/([A-Za-z0-9_-]+)\/(.+)$/);
  assert.ok(match, `not a signed media url: ${url}`);
  return { expires: Number(match[1]), signature: match[2], path: match[3] };
};

test('signs an hls manifest for its whole folder so segments inherit the token', () => {
  const signed = parse(signMediaUrl('/media/ia/some-film/hls/master.m3u8', NOW));

  assert.equal(signed.path, 'ia/some-film/hls/master.m3u8');
  assert.equal(signed.expires, NOW / 1000 + 600);
  const expected = createHash('md5').update(`${signed.expires}/ia/some-film/hls test-secret`).digest('base64url');
  assert.equal(signed.signature, expected);
});

test('signs a plain mp4 for that exact file only', () => {
  const a = parse(signMediaUrl('/media/ia/bundle/Film A.mp4', NOW));
  const b = parse(signMediaUrl('/media/ia/bundle/Film B.mp4', NOW));

  assert.notEqual(a.signature, b.signature);
  assert.equal(a.signature, computeMediaSignature(a.expires, 'ia/bundle/Film A.mp4', 'test-secret'));
});

test('leaves posters, external links and already-signed urls alone', () => {
  assert.equal(signMediaUrl('/media/thumbnails/poster.jpg', NOW), '/media/thumbnails/poster.jpg');
  assert.equal(signMediaUrl('https://archive.org/download/x/y.mp4', NOW), 'https://archive.org/download/x/y.mp4');
  const signed = signMediaUrl('/media/ia/x/hls/master.m3u8', NOW);
  assert.equal(signMediaUrl(signed, NOW), signed);
});

test('returns the url unchanged when no signing secret is configured', async () => {
  const saved = process.env.MEDIA_SIGNING_SECRET;
  delete process.env.MEDIA_SIGNING_SECRET;
  assert.equal(signMediaUrl('/media/ia/x/hls/master.m3u8', NOW), '/media/ia/x/hls/master.m3u8');
  process.env.MEDIA_SIGNING_SECRET = saved;
});

const { verifyMediaRequest } = await import('../src/lib/media-signing.ts');

test('verifyMediaRequest accepts the playlist and its segments from a signed folder', () => {
  const signed = signMediaUrl('/media/ia/some-film/hls/master.m3u8', NOW);
  const segment = signed.replace('master.m3u8', 'segment-00007.ts');

  assert.deepEqual(verifyMediaRequest(signed, 'test-secret', NOW), { ok: true });
  assert.deepEqual(verifyMediaRequest(segment, 'test-secret', NOW), { ok: true });
});

test('verifyMediaRequest accepts url-encoded paths (spaces) for single files', () => {
  const signed = signMediaUrl('/media/ia/bundle/Film A (1950).mp4', NOW);
  const encoded = encodeURI(signed);

  assert.deepEqual(verifyMediaRequest(encoded, 'test-secret', NOW), { ok: true });
});

test('verifyMediaRequest rejects expired, tampered, wrong-secret and wrong-file requests', () => {
  const signed = signMediaUrl('/media/ia/some-film/hls/master.m3u8', NOW);

  assert.deepEqual(verifyMediaRequest(signed, 'test-secret', NOW + 601_000), { ok: false, reason: 'expired' });
  assert.deepEqual(verifyMediaRequest(signed, 'other-secret', NOW), { ok: false, reason: 'bad-signature' });
  assert.deepEqual(
    verifyMediaRequest(signed.replace('some-film', 'another-film'), 'test-secret', NOW),
    { ok: false, reason: 'bad-signature' }
  );
  assert.deepEqual(verifyMediaRequest('/media/ia/some-film/hls/master.m3u8', 'test-secret', NOW), { ok: false, reason: 'malformed' });
});

test('a folder token does not unlock an mp4 in that folder, and mp4 tokens are per file', () => {
  const folder = signMediaUrl('/media/ia/bundle/hls/master.m3u8', NOW);
  const mp4Attempt = folder.replace('hls/master.m3u8', 'hls/movie.mp4');
  const a = signMediaUrl('/media/ia/bundle/a.mp4', NOW);

  assert.equal(verifyMediaRequest(mp4Attempt, 'test-secret', NOW).ok, false);
  assert.equal(verifyMediaRequest(a.replace('a.mp4', 'b.mp4'), 'test-secret', NOW).ok, false);
});

test('verifyMediaRequest rejects path traversal', () => {
  const signed = signMediaUrl('/media/ia/x/a.mp4', NOW);
  assert.equal(verifyMediaRequest(signed.replace('ia/x/a.mp4', 'ia/x/../../etc/a.mp4'), 'test-secret', NOW).ok, false);
});
