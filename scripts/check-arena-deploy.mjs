import {
  createArenaState,
  DEFAULT_ARENA_CHANNEL,
  fetchArenaResources,
} from "./arena-state.mjs";

const channel = process.env.ARENA_CHANNEL ?? DEFAULT_ARENA_CHANNEL;
const stateUrl =
  process.env.SITE_STATE_URL ??
  "https://sandwichmaxxing.com/arena-state.json";
const deployHook = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK;
const dryRun = process.env.DRY_RUN === "true";
const forceDeploy = process.env.FORCE_DEPLOY === "true";

if (!deployHook && !dryRun) {
  throw new Error(
    "Missing CLOUDFLARE_PAGES_DEPLOY_HOOK. Add it as a GitHub Actions repository secret.",
  );
}

async function wait(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);

      if (response.ok || response.status === 404) return response;

      throw new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await wait(1_000 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError;
}

const resources = await fetchArenaResources({
  channel,
  fetchImpl: fetchWithRetry,
});
const arenaState = createArenaState(resources, channel);
const deployedStateRequest = new URL(stateUrl);
deployedStateRequest.searchParams.set("check", String(Date.now()));

const deployedStateResponse = await fetchWithRetry(deployedStateRequest, {
  headers: { "Cache-Control": "no-cache" },
});
const deployedStateContentType =
  deployedStateResponse.headers.get("content-type") ?? "";
const deployedState =
  deployedStateResponse.ok &&
  deployedStateContentType.includes("application/json")
    ? await deployedStateResponse.json()
    : undefined;
const changed = deployedState?.fingerprint !== arenaState.fingerprint;

console.log(
  `Are.na: ${arenaState.count} blocks (${arenaState.fingerprint.slice(0, 12)})`,
);
console.log(
  deployedState
    ? `Deployed: ${deployedState.count} blocks (${String(deployedState.fingerprint).slice(0, 12)})`
    : "Deployed state: not found",
);

if (!changed && !forceDeploy) {
  console.log("No channel changes. Skipping deployment.");
  process.exit(0);
}

if (dryRun) {
  console.log("A deployment would be triggered (dry run).");
  process.exit(0);
}

const deployResponse = await fetch(deployHook, {
  method: "POST",
  redirect: "error",
});

if (!deployResponse.ok) {
  throw new Error(
    `Cloudflare deploy hook returned ${deployResponse.status} ${deployResponse.statusText}`,
  );
}

console.log(
  forceDeploy
    ? "Forced Cloudflare Pages deployment triggered."
    : "Channel changed. Cloudflare Pages deployment triggered.",
);
