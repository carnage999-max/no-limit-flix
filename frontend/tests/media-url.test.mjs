import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveMediaUrl } = await import('../src/lib/media.ts');

test('resolveMediaUrl converts hostless cloudfront paths to the local media origin', () => {
  assert.equal(
    resolveMediaUrl('d3716xz37ie3f5.cloudfront.net/ia/publicmovies212/Karate_Kids_USA.mp4'),
    '/media/ia/publicmovies212/Karate_Kids_USA.mp4'
  );
});

test('resolveMediaUrl converts relative media keys to the local media origin', () => {
  assert.equal(
    resolveMediaUrl('ia/publicmovies212/Karate_Kids_USA.mp4'),
    '/media/ia/publicmovies212/Karate_Kids_USA.mp4'
  );
});

test('resolveMediaUrl normalizes same-site absolute media env values to current origin paths', () => {
  const original = process.env.NEXT_PUBLIC_MEDIA_URL;
  process.env.NEXT_PUBLIC_MEDIA_URL = 'https://nolimitflix.com/media';

  try {
    assert.equal(
      resolveMediaUrl('thumbnails/example.jpg'),
      '/media/thumbnails/example.jpg'
    );
  } finally {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_MEDIA_URL;
    } else {
      process.env.NEXT_PUBLIC_MEDIA_URL = original;
    }
  }
});
