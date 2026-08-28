import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import {
  arena,
  arenaEntrySchema,
  type ArenaChannelContent,
} from "astro-arena";

const sandwiches = defineCollection({
  loader: async () => {
    const client = arena.client({ token: false });
    const blocks: ArenaChannelContent[] = [];

    for await (const page of client.channels.paginateContents(
      "sandwich-maxxing",
      {
        per: 100,
        sort: "position_desc",
      },
    )) {
      blocks.push(...page.data.filter((resource) => resource.base_type === "Block"));
    }

    return blocks.map((block) => ({
      id: String(block.id),
      resource: block,
    }));
  },
  schema: z.object({ resource: arenaEntrySchema }),
});

export const collections = { sandwiches };
