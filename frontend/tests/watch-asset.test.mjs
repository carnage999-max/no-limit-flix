import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildWatchHref,
  getAssetReferenceCandidates,
} = await import('../src/lib/watch-asset.js');

test('buildWatchHref encodes slash-containing legacy asset references into a single route segment', () => {
  assert.equal(
    buildWatchHref('d3716xz37ie3f5.cloudfront.net/ia/publicmovies212/Karate_Kids_USA.mp4'),
    '/watch/d3716xz37ie3f5.cloudfront.net%2Fia%2Fpublicmovies212%2FKarate_Kids_USA.mp4'
  );
});

test('getAssetReferenceCandidates includes route-safe and local-media variants for legacy asset references', () => {
  const candidates = getAssetReferenceCandidates('d3716xz37ie3f5.cloudfront.net/ia/publicmovies212/Karate_Kids_USA.mp4');

  assert.deepEqual(
    candidates,
    [
      'd3716xz37ie3f5.cloudfront.net/ia/publicmovies212/Karate_Kids_USA.mp4',
      'https://d3716xz37ie3f5.cloudfront.net/ia/publicmovies212/Karate_Kids_USA.mp4',
      'ia/publicmovies212/Karate_Kids_USA.mp4',
      '/ia/publicmovies212/Karate_Kids_USA.mp4',
      '/media/ia/publicmovies212/Karate_Kids_USA.mp4',
      'https://nolimitflix.com/media/ia/publicmovies212/Karate_Kids_USA.mp4',
    ]
  );
});
