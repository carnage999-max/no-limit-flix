# Worker Local Media HLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the ingest worker off S3 for server deployment so movie imports can be written into `/app/media` as local assets, default movie playback can use HLS, reels stay MP4, and deployment artifacts exist for Docker Compose on the server.

**Architecture:** Keep the worker’s public import API intact and replace the storage backend behind it. Movies will generate either HLS output or MP4 output on local disk and persist relative media paths plus a public media URL; reels will continue to store MP4 files on local disk. Deployment will mount the server media directory into the worker container and install ffmpeg so HLS generation works in-container.

**Tech Stack:** Node.js, Express, PostgreSQL (`pg`), ffmpeg, Docker multi-stage build, Docker Compose

---

### Task 1: Lock the behavior with tests

**Files:**
- Create: `worker/tests/media-storage.test.js`
- Create: `worker/tests/ingest-config.test.js`
- Modify: `worker/package.json`

- [ ] **Step 1: Write the failing tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');

test('buildMediaPath creates movie HLS manifest paths under ia/<identifier>/hls', () => {
  const { buildMediaPath } = require('../src/ingest');
  assert.equal(
    buildMediaPath('publicmovies212', 'Karate Kids.mp4', { kind: 'movie', playbackType: 'hls' }),
    'ia/publicmovies212/hls/master.m3u8'
  );
});

test('buildMediaPath keeps reels as mp4 files under ia/reels/<identifier>', () => {
  const { buildMediaPath } = require('../src/ingest');
  assert.equal(
    buildMediaPath('reel-id', 'clip.mov', { kind: 'reel', playbackType: 'mp4' }),
    'ia/reels/reel-id/clip.mov'
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && node --test tests/*.test.js`
Expected: FAIL because the helper functions and scripts do not exist yet.

- [ ] **Step 3: Add test script**

```json
{
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test tests/*.test.js"
  }
}
```

- [ ] **Step 4: Re-run tests**

Run: `cd worker && npm test`
Expected: FAIL with missing exports or wrong behavior.

### Task 2: Replace S3-backed worker storage with local media helpers

**Files:**
- Modify: `worker/src/ingest.js`
- Create: `worker/src/local-media.js`

- [ ] **Step 1: Add local media path and URL helpers**

```js
function buildPublicMediaUrl(relativePath) {
  const base = (process.env.MEDIA_BASE_URL || 'https://nolimitflix.com/media').replace(/\/$/, '');
  return `${base}/${String(relativePath).replace(/^\/+/, '')}`;
}
```

- [ ] **Step 2: Add local storage copy/download flow**

```js
async function downloadToFile(downloadUrl, destinationPath) {
  // fetch remote source
  // stream to destination on disk
  // create parent directories first
}
```

- [ ] **Step 3: Keep reels on MP4 while allowing movie HLS**

```js
// reels => store original/transcoded mp4 file on disk
// movies => optionally create HLS output directory ending in master.m3u8
```

- [ ] **Step 4: Run tests**

Run: `cd worker && npm test`
Expected: PASS for path/url helper behavior.

### Task 3: Switch movie import records to local HLS-friendly playback metadata

**Files:**
- Modify: `worker/src/index.js`
- Modify: `worker/src/db.js`

- [ ] **Step 1: Update movie import to call the new local-storage function**

```js
const storedPlayback = await storeMoviePlayback(playbackUrl, identifier, bestFile);
```

- [ ] **Step 2: Persist relative playback path and local media URL**

```js
playbackType: storedPlayback.playbackType,
s3KeyPlayback: storedPlayback.relativePath,
cloudfrontPath: `/${storedPlayback.relativePath}`,
s3Url: storedPlayback.publicUrl
```

- [ ] **Step 3: Keep reel import on MP4 local files**

```js
playbackType: 'mp4'
```

- [ ] **Step 4: Run tests**

Run: `cd worker && npm test`
Expected: PASS.

### Task 4: Add worker deployment assets for se7en

**Files:**
- Create: `worker/Dockerfile`
- Create: `worker/docker-compose.yml`
- Modify: `worker/README.md`
- Create: `worker/.env.example`

- [ ] **Step 1: Add Dockerfile with ffmpeg and production start command**

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY src ./src
CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Add compose service**

```yaml
services:
  nolimitflix-worker:
    build: .
    env_file: .env
    volumes:
      - /mnt/data/media/no-limit-flix:/app/media
    networks:
      - shared-net
```

- [ ] **Step 3: Update docs and env template**

```env
DATABASE_URL=postgresql://nolimitflix_user:<password>@postgres:5432/nolimitflix_db
MEDIA_ROOT=/app/media
MEDIA_BASE_URL=https://nolimitflix.com/media
```

- [ ] **Step 4: Run tests**

Run: `cd worker && npm test`
Expected: PASS.

### Task 5: Final verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run worker tests**

Run: `cd worker && npm test`
Expected: PASS.

- [ ] **Step 2: Validate startup**

Run: `cd worker && node src/index.js`
Expected: server starts or fails only on missing required env vars.

- [ ] **Step 3: Record deployment notes**

```text
- Rebuild the worker image after env changes.
- HLS generation requires ffmpeg inside the container.
- Movies may be HLS or MP4 during transition; player support remains intact.
```
