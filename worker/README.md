# Ingest Worker

This worker imports Internet Archive media into the NoLimitFlix Postgres catalog and stores playback assets on local disk.

Movies:
- default to `HLS` output under `/app/media/ia/<identifier>/hls/`
- can be forced back to MP4 with `MOVIE_PLAYBACK_MODE=mp4`

Reels:
- stay `MP4`
- can still be compressed through ffmpeg before being written to disk

The worker keeps writing the existing DB fields (`s3KeyPlayback`, `cloudfrontPath`, `s3Url`) for compatibility, but they now hold local media paths/URLs instead of S3 data.

## Required env vars

- `INGEST_WORKER_SECRET`
- `DATABASE_URL`
- `MEDIA_ROOT` (use `/app/media` in Docker)
- `MEDIA_BASE_URL` (for example `https://nolimitflix.com/media`)
- `OMDB_API_KEY`

## Optional env vars

- `PORT` (defaults to `8080`)
- `MOVIE_PLAYBACK_MODE` (`hls` by default, set to `mp4` to disable HLS generation)
- `MOVIE_HLS_SEGMENT_SECONDS`
- `MOVIE_HLS_PRESET`
- `MOVIE_HLS_CRF`
- `REELS_TRANSCODE_MAX_WIDTH`
- `REELS_TRANSCODE_CRF`
- `REELS_TRANSCODE_PRESET`
- `REELS_TRANSCODE_MAXRATE_KBPS`
- `REELS_TRANSCODE_BUFSIZE_KBPS`
- `REELS_TRANSCODE_AUDIO_KBPS`

## Local run

```bash
cd worker
pnpm install
pnpm start
```

## Test

```bash
cd worker
pnpm test
```

## Docker deployment

The included `Dockerfile` installs `ffmpeg` and `openssl`, and `docker-compose.yml` mounts the server media directory into `/app/media`.

Recommended frontend worker env on the shared Docker network:

```env
INGEST_WORKER_URL=http://nolimitflix-worker:8080
INGEST_WORKER_SECRET=<same secret as worker>
```

## API

### `POST /import`

- Auth: `Authorization: Bearer <INGEST_WORKER_SECRET>`
- Imports movies/series from Internet Archive
- Writes playback files to local media storage

### `POST /reels/import`

- Auth: `Authorization: Bearer <INGEST_WORKER_SECRET>`
- Imports short-form reel content
- Keeps playback as MP4
