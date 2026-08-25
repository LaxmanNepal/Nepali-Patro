# 1-minute news sync

This Worker updates `feeds/news.json` every minute from the RSS URLs defined in `feeds/feeds.js`.

## Deploy

1. Create a Cloudflare Worker named `nepali-patro-news-sync`.
2. From this directory run:

```bash
npx wrangler deploy
```

3. Add a Worker secret named `GITHUB_TOKEN` with a GitHub fine-grained token that has **Contents: Read and write** permission for `LaxmanNepal/Nepali-Patro`.
4. Keep the Cron Trigger `* * * * *` enabled.
5. Test the worker's `/health` endpoint.

The worker intentionally writes only to `feeds/news.json`; the browser continues to consume local JSON and never calls news RSS sources directly.

## Important

Cloudflare Cron Trigger provides the one-minute schedule. GitHub Actions can remain as a backup generator, but it is not relied upon for the one-minute SLA.
