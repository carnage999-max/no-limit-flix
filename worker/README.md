# Ingest Worker (Render Web Service)

This worker ingests Internet Archive videos into S3 and writes the final metadata into Postgres.

## Required env vars

- `INGEST_WORKER_SECRET` (shared secret for auth)
- `DATABASE_URL` (Neon/Postgres)
- `S3_BUCKET`
- `S3_REGION` (or `AWS_REGION`)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (optional)

## Optional env vars

- `CLOUDFRONT_URL` (if you want playback URLs to use CloudFront)
- `PORT` (Render sets this automatically)

## Run locally

```bash
cd worker
npm install
npm run start
```

## API

### POST `/import`

Headers:

- `Authorization: Bearer <INGEST_WORKER_SECRET>`

Body (JSON):

```json
{
  "items": [
    { "identifier": "example_id", "fileName": "example.mp4" }
  ],
  "allowMkv": false
}
```

If `items` is omitted, you can provide `identifiers` or a `presetQuery` + `limit`.
