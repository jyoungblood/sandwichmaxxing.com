# Are.na deployment automation

The site checks the public `sandwich-maxxing` Are.na channel every 30 minutes and rebuilds only when its content changes.

```text
Are.na channel
    ↓ every 30 minutes
GitHub Actions compares fingerprints
    ↓ only when different
Cloudflare Pages Deploy Hook
    ↓
Astro rebuilds the site and publishes a new fingerprint
```

## How change detection works

Each production build publishes `/arena-state.json`. Its fingerprint covers every block's ID, type, update time, connection ID and position, and image update time.

The scheduled workflow fetches every current channel page from Are.na and creates the same fingerprint. Matching fingerprints stop the workflow without using a Cloudflare build. A different fingerprint triggers the private Pages Deploy Hook.

The schedule runs at 7 and 37 minutes past every hour. Avoiding the top of the hour reduces the chance of delayed GitHub schedules.

## One-time setup

1. In Cloudflare, open **Workers & Pages → sandwichmaxxing.com → Settings → Builds → Deploy Hooks**.
2. Add a hook named `arena-channel` for the `main` branch.
3. Copy the generated hook URL. Treat it like a password.
4. In GitHub, open **sandwichmaxxing.com → Settings → Secrets and variables → Actions**.
5. Add a repository secret named `CLOUDFLARE_PAGES_DEPLOY_HOOK` containing the hook URL.
6. Push these repository changes. The existing Cloudflare Git integration will deploy the state endpoint and workflow.
7. In GitHub's **Actions** tab, open **Sync Are.na content**, select **Run workflow**, enable **force deploy**, and run it once to verify the hook.

No Are.na token is required because the channel is public.

## Operations

- Use **Run workflow** without force deploy to test change detection.
- Use it with force deploy to rebuild immediately.
- Check workflow logs for the live and deployed block counts and fingerprint prefixes.
- Disable the workflow from GitHub Actions to pause checks.
- Delete or rotate the Cloudflare Deploy Hook if its URL is exposed, then update the GitHub secret.
- GitHub automatically disables scheduled workflows in public repositories after 60 days without repository activity. If checks stop after a quiet period, re-enable **Sync Are.na content** from the Actions tab.

If Are.na or the deployed site cannot be reached after three attempts, the workflow fails safely and does not deploy. The next scheduled check tries again.

## Build usage

The checks themselves run on GitHub and do not use Cloudflare Pages builds. Only detected changes, forced runs, and ordinary Git pushes trigger Pages builds. Cloudflare currently documents 500 Pages builds per month on the Free plan.

## Relevant files

- `.github/workflows/arena-sync.yml` — schedule and manual trigger
- `scripts/check-arena-deploy.mjs` — comparison and deploy-hook request
- `scripts/arena-state.mjs` — shared pagination and fingerprint logic
- `src/pages/arena-state.json.ts` — state published by each build

## References

- [Cloudflare Pages Deploy Hooks](https://developers.cloudflare.com/pages/configuration/deploy-hooks/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [GitHub Actions scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule)
- [GitHub Actions schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Are.na developer API](https://www.are.na/developers)
