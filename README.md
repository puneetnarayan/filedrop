# filedrop

Drop files or folders on a page, open the same room link on another desktop, download them there.
Files go browser -> Cloudflare R2 directly (via presigned URLs); Vercel only serves the page and signs URLs.

Anyone with a room link can see and download everything in it. Treat the link as a secret.

## Setup

1. **R2 bucket**: Cloudflare dashboard -> R2 -> create a bucket. Create an API token with
   Object Read & Write limited to that bucket. Note the account ID, access key ID, secret.
2. **CORS** on the bucket (Settings -> CORS policy). Replace the origins with your Vercel domain(s):
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://YOUR-APP.vercel.app"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   `ExposeHeaders: ETag` is required for large (multipart) uploads. Check the field names against Cloudflare's current CORS docs.
3. **Expiry** (recommended, default plan is 24h): bucket -> Settings -> Object lifecycle rules ->
   delete objects with prefix `rooms/` after 1 day.
4. **Env vars**: copy `.env.example` to `.env.local` locally, and set the same variables in Vercel
   (Project -> Settings -> Environment Variables).
5. `npm install && npm run dev`, then open http://localhost:3000.
6. **Deploy**: import this GitHub repo in Vercel.

## How it works

- `/` redirects to `/r/<random id>`.
- `POST /api/upload/start` returns a presigned PUT (files <= 100 MB) or starts a multipart upload.
  Multipart uses `/api/upload/part` and `/api/upload/complete` (16 MB parts).
- `GET /api/list?room=` lists `rooms/<id>/` in R2; the page polls every 3s.
- `GET /api/download?room=&path=` redirects to a short-lived signed GET URL.
- Folder download builds a zip in the browser (in memory, so very large folders may be heavy).

## Not done yet (phase 4/5)

Drag-out to desktop (Chromium `DownloadURL`), per-room size caps, rate limiting, optional password.
