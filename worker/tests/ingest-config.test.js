const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMediaPath, buildPublicMediaUrl, resolveMoviePlaybackMode } = require('../src/ingest');

test('buildMediaPath creates movie hls manifests under ia/<identifier>/hls', () => {
    assert.equal(
        buildMediaPath('publicmovies212', 'Karate Kids USA.mp4', { playbackType: 'hls' }),
        'ia/publicmovies212/hls/master.m3u8'
    );
});

test('buildMediaPath keeps reels as mp4 files under ia/reels/<identifier>', () => {
    assert.equal(
        buildMediaPath('reel-id', 'clip.mov', { kind: 'reels', playbackType: 'mp4' }),
        'ia/reels/reel-id/clip.mov'
    );
});

test('buildPublicMediaUrl builds local media urls from relative paths', () => {
    process.env.MEDIA_BASE_URL = 'https://nolimitflix.com/media';

    assert.equal(
        buildPublicMediaUrl('ia/publicmovies212/hls/master.m3u8'),
        'https://nolimitflix.com/media/ia/publicmovies212/hls/master.m3u8'
    );
});

test('resolveMoviePlaybackMode defaults to hls and can be overridden to mp4', () => {
    delete process.env.MOVIE_PLAYBACK_MODE;
    assert.equal(resolveMoviePlaybackMode(), 'hls');

    process.env.MOVIE_PLAYBACK_MODE = 'mp4';
    assert.equal(resolveMoviePlaybackMode(), 'mp4');
});
