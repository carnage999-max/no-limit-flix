# Ingest Worker

This worker imports Internet Archive media into the NoLimitFlix Postgres catalog and stores playback assets on local disk.

Movies:
- stream as HLS (`master.m3u8` + `.ts` segments) when `MOVIE_PLAYBACK_MODE=hls` (recommended; the admin import sends `playbackMode: "hls"` by default)
- bundle items (many films in one archive.org item) get one HLS folder per film under `/app/media/ia/<identifier>/hls/<film-slug>/`
- `MP4` single files remain available with `MOVIE_PLAYBACK_MODE=mp4`
- films already in the library are skipped before any download; send `force: true` to re-import

Convert movies that were imported earlier as plain MP4:

```bash
curl -X POST http://127.0.0.1:8080/convert-hls \
  -H "Authorization: Bearer $INGEST_WORKER_SECRET" -H 'Content-Type: application/json' \
  -d '{"limit": 10, "offset": 0}'
```

It remuxes without re-encoding where possible, switches the DB row to `hls`, and leaves the original MP4 on disk. Repeat until `moreRemaining` is `false`; if any item failed, pass the returned `nextOffset` as `offset` so the next call steps past it.

Reels:
- stay `MP4`
- can still be compressed through ffmpeg before being written to disk

The worker keeps writing the existing DB fields (`s3KeyPlayback`, `cloudfrontPath`, `s3Url`) for compatibility, but they now hold local media paths/URLs instead of S3 data.

## Required env vars

- `INGEST_WORKER_SECRET`
- `DATABASE_URL`
- `MEDIA_ROOT` (use `/app/media` in Docker)
- `MEDIA_BASE_URL` (use `/media` for same-origin web playback)
- `OMDB_API_KEY`

## Optional env vars

- `PORT` (defaults to `8080`)
- `MEDIA_MIN_FREE_GB` (default `600`): free space on the media volume that imports and HLS conversion must leave untouched; once it is reached they stop and report `stoppedForDisk`. `0` disables the guard. `/health` shows current free space.
- `MOVIE_PLAYBACK_MODE` (`mp4` by default, set to `hls` only when HLS generation is needed)
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
