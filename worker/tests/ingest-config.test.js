const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMediaPath, buildPublicMediaUrl, resolveMoviePlaybackMode } = require('../src/ingest');

test('buildMediaPath creates movie hls manifests under ia/<identifier>/hls', () => {
    assert.equal(
        buildMediaPath('some-movie', 'some-movie.mp4', { playbackType: 'hls' }),
        'ia/some-movie/hls/master.m3u8'
    );
});

test('buildMediaPath gives each bundle film its own hls folder', () => {
    const a = buildMediaPath('publicmovies212', 'Karate Kids USA.mp4', { playbackType: 'hls', bundle: true });
    const b = buildMediaPath('publicmovies212', 'Other Film (1950).mp4', { playbackType: 'hls', bundle: true });

    assert.equal(a, 'ia/publicmovies212/hls/karate-kids-usa/master.m3u8');
    assert.notEqual(a, b);
});

test('buildMediaPath keeps reels as mp4 files under ia/reels/<identifier>', () => {
    assert.equal(
        buildMediaPath('reel-id', 'clip.mov', { kind: 'reels', playbackType: 'mp4' }),
        'ia/reels/reel-id/clip.mov'
    );
});

test('buildPublicMediaUrl builds local media urls from relative paths', () => {
    process.env.MEDIA_BASE_URL = '/media';

    assert.equal(
        buildPublicMediaUrl('ia/publicmovies212/Karate Kids USA.mp4'),
        '/media/ia/publicmovies212/Karate Kids USA.mp4'
    );
});

test('buildPublicMediaUrl normalizes same-site absolute media urls to current origin paths', () => {
    process.env.MEDIA_BASE_URL = 'https://nolimitflix.com/media';

    assert.equal(
        buildPublicMediaUrl('ia/publicmovies212/Karate Kids USA.mp4'),
        '/media/ia/publicmovies212/Karate Kids USA.mp4'
    );
});

test('resolveMoviePlaybackMode defaults to mp4 and can be overridden to hls', () => {
    delete process.env.MOVIE_PLAYBACK_MODE;
    assert.equal(resolveMoviePlaybackMode(), 'mp4');

    process.env.MOVIE_PLAYBACK_MODE = 'hls';
    assert.equal(resolveMoviePlaybackMode(), 'hls');
});
