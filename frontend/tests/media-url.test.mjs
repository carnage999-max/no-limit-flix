import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveMediaUrl } = await import('../src/lib/media.ts');

test('resolveMediaUrl converts hostless cloudfront paths to the local media origin', () => {
  assert.equal(
    resolveMediaUrl('d3716xz37ie3f5.cloudfront.net/ia/publicmovies212/Karate_Kids_USA.mp4'),
    'https://nolimitflix.com/media/ia/publicmovies212/Karate_Kids_USA.mp4'
  );
});

test('resolveMediaUrl converts relative media keys to the local media origin', () => {
  assert.equal(
    resolveMediaUrl('ia/publicmovies212/Karate_Kids_USA.mp4'),
    'https://nolimitflix.com/media/ia/publicmovies212/Karate_Kids_USA.mp4'
  );
});
