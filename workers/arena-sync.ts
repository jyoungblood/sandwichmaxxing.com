import {
  createArenaState,
  fetchArenaResources,
} from "../scripts/arena-state.mjs";

const MAX_FETCH_ATTEMPTS = 3;

type DeployedState = {
  count: number;
  fingerprint: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDeployedState(value: unknown): DeployedState | undefined {
  if (
    !isRecord(value) ||
    typeof value.count !== "number" ||
    typeof value.fingerprint !== "string"
  ) {
    return undefined;
  }

  return {
    count: value.count,
    fingerprint: value.fingerprint,
  };
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const fetchWithRetry: typeof fetch = async (input, init) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (response.ok || response.status === 404) return response;

      throw new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;

      if (attempt < MAX_FETCH_ATTEMPTS) {
        await wait(1_000 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("The request failed after three attempts.");
};

async function syncArena(env: Env): Promise<void> {
  const resources = await fetchArenaResources({
    channel: env.ARENA_CHANNEL,
    fetchImpl: fetchWithRetry,
  });
  const arenaState = createArenaState(resources, env.ARENA_CHANNEL);
  const stateUrl = new URL(env.SITE_STATE_URL);
  stateUrl.searchParams.set("check", String(Date.now()));

  const stateResponse = await fetchWithRetry(stateUrl, {
    headers: { "Cache-Control": "no-cache" },
  });
  const contentType = stateResponse.headers.get("content-type") ?? "";
  const deployedState =
    stateResponse.ok && contentType.includes("application/json")
      ? parseDeployedState(await stateResponse.json())
      : undefined;
  const changed = deployedState?.fingerprint !== arenaState.fingerprint;

  console.log(
    JSON.stringify({
      event: "arena_check",
      changed,
      arenaCount: arenaState.count,
      deployedCount: deployedState?.count ?? null,
      arenaFingerprint: arenaState.fingerprint.slice(0, 12),
      deployedFingerprint: deployedState?.fingerprint.slice(0, 12) ?? null,
    }),
  );

  if (!changed) return;

  const deployResponse = await fetch(env.CLOUDFLARE_PAGES_DEPLOY_HOOK, {
    method: "POST",
    redirect: "manual",
  });

  if (!deployResponse.ok) {
    throw new Error(
      `The Pages deploy hook returned ${deployResponse.status} ${deployResponse.statusText}.`,
    );
  }

  console.log(
    JSON.stringify({
      event: "pages_deploy_triggered",
      arenaCount: arenaState.count,
      arenaFingerprint: arenaState.fingerprint.slice(0, 12),
    }),
  );
}

export default {
  async scheduled(controller, env) {
    try {
      await syncArena(env);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "arena_sync_failed",
          cron: controller.cron,
          scheduledTime: controller.scheduledTime,
          error: errorMessage(error),
        }),
      );
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
