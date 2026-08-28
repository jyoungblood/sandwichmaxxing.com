import { getCollection } from "astro:content";
import { createArenaState } from "../../scripts/arena-state.mjs";

export const prerender = true;

export async function GET() {
  const resources = (await getCollection("sandwiches")).map(
    ({ data }) => data.resource,
  );
  const state = createArenaState(resources);

  return new Response(
    JSON.stringify({
      ...state,
      generatedAt: new Date().toISOString(),
    }),
    {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
