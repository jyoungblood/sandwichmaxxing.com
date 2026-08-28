import type { ArenaChannelContent } from "astro-arena";

export interface ArenaState {
  channel: string;
  count: number;
  fingerprint: string;
}

export const DEFAULT_ARENA_CHANNEL: string;

export function createArenaState(
  resources: ArenaChannelContent[],
  channel?: string,
): ArenaState;

export function fetchArenaResources(options?: {
  channel?: string;
  fetchImpl?: typeof fetch;
}): Promise<ArenaChannelContent[]>;
