# Signed video URLs

Video files under `/media/` used to be downloadable by anyone who knew (or guessed) the path. Now
`/api/watch/start` (which already requires a login) returns a short-lived signed URL, and nginx
refuses unsigned requests for video files. Nginx does **not** check cookies or sessions, so the
mobile app is unaffected: it plays whatever URL `/api/watch/start` returns, as before.

```
/media/s/<expires>/<signature>/ia/<id>/hls/<film>/master.m3u8
```

- HLS: one signature covers the playlist's folder, so the `.ts` segments the player requests
  relative to the playlist are allowed too.
- Single files (`.mp4`, ...): the signature covers exactly that file.
- Posters and thumbnails are not signed.
- Links expire after `MEDIA_URL_TTL_SECONDS` (default 6 hours, so a long film can be paused).

A logged-in viewer can still save a stream they are allowed to watch (for example with yt-dlp);
this stops anonymous downloads, URL guessing, and long-lived shared links, not capture.

## Rollout (order matters)

Turning on the app side before nginx understands `/media/s/...` breaks playback, so go in this order.

### Step 1 - nginx accepts signed URLs (nothing else changes yet)

On the server (`openssl rand -hex 32` makes a good secret; keep it for step 2):

```bash
nginx -V 2>&1 | grep -o secure_link          # must print: secure_link

sudo mkdir -p /etc/nginx/snippets
sudo cp docs/nginx/media-signed.conf /etc/nginx/snippets/nolimitflix-media-signed.conf
echo 'set $media_secret "PASTE_SECRET_HERE";' | sudo tee /etc/nginx/nolimitflix-media-secret.conf
sudo chmod 600 /etc/nginx/nolimitflix-media-secret.conf
```

Then edit `/etc/nginx/sites-available/nolimitflix.com` and add two `include` lines inside the
**first** `server { }` (the 443 one), right above `location /media/`. Nothing else in the file changes:

```nginx
server {
    server_name nolimitflix.com www.nolimitflix.com;
    client_max_body_size 20M;

    include /etc/nginx/nolimitflix-media-secret.conf;
    include /etc/nginx/snippets/nolimitflix-media-signed.conf;

    location /media/ {
        alias /mnt/data/media/no-limit-flix/;
        ...
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Step 2 - the app starts signing

Set the same secret as `MEDIA_SIGNING_SECRET` in the frontend container's environment (optionally
`MEDIA_URL_TTL_SECONDS`) and redeploy the frontend. Play a film on the website and in the mobile app.
Old unsigned links keep working during this step.

### Step 3 - refuse unsigned video (last)

Check that nothing legitimate still fetches unsigned video (older app builds, other clients):

```bash
sudo grep -E '"GET /media/[^ ]+\.(mp4|m3u8|ts|mkv)' /var/log/nginx/access.log | grep -v '/media/s/' \
  | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head
```

If only browsers you recognise appear (or nothing), enforce:

```bash
sudo cp docs/nginx/media-enforce.conf /etc/nginx/snippets/nolimitflix-media-enforce.conf
# add under the other two includes:  include /etc/nginx/snippets/nolimitflix-media-enforce.conf;
sudo nginx -t && sudo systemctl reload nginx
curl -I https://nolimitflix.com/media/ia/<id>/<file>.mp4      # now 403
```

Rolling back: delete the enforce `include` and reload. Posters and thumbnails are never affected.
