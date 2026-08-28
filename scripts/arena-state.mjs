import { createHash } from "node:crypto";

export const DEFAULT_ARENA_CHANNEL = "sandwich-maxxing";

export function createArenaState(
  resources,
  channel = DEFAULT_ARENA_CHANNEL,
) {
  const signature = resources
    .filter((resource) => resource.base_type === "Block")
    .map((resource) => [
      resource.id,
      resource.type,
      resource.updated_at ?? null,
      resource.connection?.id ?? null,
      resource.connection?.position ?? null,
      "image" in resource ? (resource.image?.updated_at ?? null) : null,
    ])
    .sort((a, b) => a[0] - b[0]);

  return {
    channel,
    count: signature.length,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(signature))
      .digest("hex"),
  };
}

export async function fetchArenaResources({
  channel = DEFAULT_ARENA_CHANNEL,
  fetchImpl = fetch,
} = {}) {
  const resources = [];
  let page = 1;

  while (page) {
    const url = new URL(
      `https://api.are.na/v3/channels/${encodeURIComponent(channel)}/contents`,
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("per", "100");
    url.searchParams.set("sort", "position_desc");

    const response = await fetchImpl(url, {
      headers: { "User-Agent": "sandwichmaxxing.com content sync" },
    });

    if (!response.ok) {
      throw new Error(
        `Are.na returned ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    if (!Array.isArray(result.data) || !result.meta) {
      throw new Error("Are.na returned an unexpected response shape");
    }

    resources.push(...result.data);
    page = result.meta.has_more_pages ? result.meta.next_page : 0;
  }

  return resources;
}
