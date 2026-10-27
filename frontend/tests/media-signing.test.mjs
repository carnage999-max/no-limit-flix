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
