# Signed video URLs

Video files under `/media/` used to be downloadable by anyone who knew (or guessed) the path. Now
`/api/watch/start` (which already requires a login) returns a short-lived signed URL, and nginx
refuses unsigned requests for video files.

```
/media/s/<expires>/<signature>/ia/<id>/hls/<film>/master.m3u8
```

- nginx asks the app (`/api/media-auth`, via the stock `auth_request` module) whether the signature
  is valid and unexpired. It checks **no cookie or login**, so the mobile app is unaffected: it plays
  whatever URL `/api/watch/start` returns, as before.
- The secret (`MEDIA_SIGNING_SECRET`) lives only in the app. Nothing secret goes in nginx config, and
  no nginx modules or packages need to change.
- HLS: one signature covers the playlist's folder, so the `.ts` segments the player requests relative
  to the playlist are allowed too. Single files (`.mp4`, ...): the signature covers exactly that file.
- Posters and thumbnails are not signed.
- Links expire after `MEDIA_URL_TTL_SECONDS` (default 6 hours, so a long film can be paused).
- Each video request costs one small extra call from nginx to the app. If the app is down, signed
  video requests fail until it is back (posters keep working).

A logged-in viewer can still save a stream they are allowed to watch (for example with yt-dlp);
this stops anonymous downloads, URL guessing, and long-lived shared links, not capture.

## Rollout (order matters)

Do these in order. Each step is safe on its own; the app only starts handing out signed links in step 3.

### Step 1 - deploy the new frontend (signing still off)

Pull and redeploy the frontend as usual. Without `MEDIA_SIGNING_SECRET` set, `/api/watch/start` keeps
returning plain URLs, so nothing changes yet. The new `/api/media-auth` route is now available.

### Step 2 - nginx accepts signed URLs

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp docs/nginx/media-signed.conf /etc/nginx/snippets/nolimitflix-media-signed.conf
```

Edit `/etc/nginx/sites-available/nolimitflix.com` and add one `include` line inside the **first**
`server { }` (the 443 one), right above `location /media/`. Nothing else in the file changes:

```nginx
server {
    server_name nolimitflix.com www.nolimitflix.com;
    client_max_body_size 20M;

    include /etc/nginx/snippets/nolimitflix-media-signed.conf;

    location /media/ {
        alias /mnt/data/media/no-limit-flix/;
        ...
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

This needs only `auth_request`, which stock Ubuntu nginx includes (`nginx -V 2>&1 | grep -o auth_request`).

### Step 3 - the app starts signing

Add to the frontend's `.env` on the server (the file the `nolimitflix` container loads), then restart it:

```
MEDIA_SIGNING_SECRET=<output of: openssl rand -hex 32>
MEDIA_URL_TTL_SECONDS=21600
```

Play a film on the website and in the mobile app. Old unsigned links keep working during this step.

### Step 4 - refuse unsigned video (last)

Check that nothing legitimate still fetches unsigned video (older app builds, other clients):

```bash
sudo grep -E '"GET /media/[^ ]+\.(mp4|m3u8|ts|mkv)' /var/log/nginx/access.log | grep -v '/media/s/' \
  | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head
```

If only browsers you recognise appear (or nothing), enforce:

```bash
sudo cp docs/nginx/media-enforce.conf /etc/nginx/snippets/nolimitflix-media-enforce.conf
# add under the other include:  include /etc/nginx/snippets/nolimitflix-media-enforce.conf;
sudo nginx -t && sudo systemctl reload nginx
curl -I https://nolimitflix.com/media/ia/<id>/<file>.mp4      # now 403
```

Rolling back: delete the enforce `include` and reload (step 4), and/or remove `MEDIA_SIGNING_SECRET`
and restart the frontend (back to plain URLs). Posters and thumbnails are never affected.
