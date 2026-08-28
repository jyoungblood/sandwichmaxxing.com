# Are.na deployment automation

The Worker reads the public `sandwich-maxxing` Are.na channel every 30 minutes. It rebuilds the site only when the channel changes.

```text
Are.na channel
    ↓ every 30 minutes
Cloudflare Worker compares fingerprints
    ↓ only when different
Cloudflare Pages Deploy Hook
    ↓
Astro rebuilds the site and publishes a new fingerprint
```

## How change detection works

Each production build publishes `/arena-state.json`. Its fingerprint includes every block and its position.

The Worker gets all pages from the Are.na channel. It creates the same fingerprint and compares both values.

If the values match, the Worker stops. If the values differ, the Worker calls the private Pages Deploy Hook.

The Cron Trigger runs at 13 and 43 minutes past each hour. Cloudflare uses UTC, but the minutes stay the same.

## One-time setup

1. Install the project dependencies with `npm install`.
2. Sign in to Cloudflare with `npx wrangler login`.
3. Run `npx wrangler secret put CLOUDFLARE_PAGES_DEPLOY_HOOK`.
4. Paste the existing Pages Deploy Hook URL at the prompt.
5. Deploy the Worker with `npm run worker:deploy`.

Cloudflare can take 15 minutes to activate a new Cron Trigger.

The Worker name is `sandwichmaxxing-arena-sync`. No Are.na token is necessary because the channel is public.

## Make sure that the Worker runs

1. Open **Cloudflare → Workers & Pages → sandwichmaxxing-arena-sync**.
2. Open **Settings → Triggers**.
3. Make sure that the Cron Trigger shows `13,43 * * * *`.
4. Open **Logs** after the next scheduled time.

An `arena_check` log shows both block counts and fingerprint prefixes. A `pages_deploy_triggered` log means that the Worker started a Pages build.

## Manual fallback

The GitHub workflow no longer has a schedule. It remains available as a manual fallback.

Open **GitHub → Actions → Manual Are.na content sync → Run workflow**. Select the checkbox to force a Pages build.

The GitHub repository secret remains necessary for this manual fallback. The Worker stores a separate copy of the same secret in Cloudflare.

## Local commands

- `npm run worker:types` updates the generated Worker types.
- `npm run worker:check` finds type errors and creates a dry-run bundle.
- `npm run worker:dev` starts the Worker for local scheduled-event tests.
- `npm run worker:deploy` deploys the Worker and its Cron Trigger.

For a local test, add the hook URL to `.dev.vars`. Never commit that file.

```text
CLOUDFLARE_PAGES_DEPLOY_HOOK=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...
```

Then run `npm run worker:dev`. Open `http://localhost:8787/cdn-cgi/handler/scheduled?format=json` to run the scheduled handler.

## Build usage

Scheduled Worker runs do not use Pages builds. Channel changes, manual runs, and pushes to `main` use Pages builds.

## Relevant files

- `wrangler.jsonc` defines the Worker, secret, logs, and Cron Trigger.
- `workers/arena-sync.ts` compares the fingerprints and calls the deploy hook.
- `.github/workflows/arena-sync.yml` provides the manual fallback.
- `scripts/arena-state.mjs` provides pagination and fingerprint logic.
- `src/pages/arena-state.json.ts` publishes the fingerprint for each build.

## References

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Pages Deploy Hooks](https://developers.cloudflare.com/pages/configuration/deploy-hooks/)
- [Are.na developer API](https://www.are.na/developers)
