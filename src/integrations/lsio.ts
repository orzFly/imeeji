import { myFetch } from "../fetch.ts";

export function isLinuxServerRepo(repository: string): boolean {
  return repository.startsWith("linuxserver/");
}

export interface LsioChangelogEntry {
  version: string;
  date: string;
  description: string;
}

export interface LsioTag {
  tag: string;
  desc: string;
}

export function getLsioFloatingTags(metadata: LsioImageMetadata): Set<string> {
  return new Set(metadata.tags.map((t) => t.tag.toLowerCase()));
}

export interface LsioImageMetadata {
  name: string;
  deprecated: boolean;
  changelog: LsioChangelogEntry[];
  tags: LsioTag[];
}

const LSIO_API_URL = "https://api.linuxserver.io/api/v1/images";

export async function fetchLsioMetadata(): Promise<Map<string, LsioImageMetadata> | null> {
  try {
    const response = await myFetch(LSIO_API_URL);
    if (!response.ok) return null;
    const data = await response.json();
    const map = new Map<string, LsioImageMetadata>();
    for (const image of data) {
      const repoKey = `linuxserver/${image.name}`;
      map.set(repoKey, {
        name: image.name,
        deprecated: image.deprecated ?? false,
        changelog: (image.changelog ?? []).slice(0, 3),
        tags: image.tags ?? [],
      });
    }
    return map;
  } catch {
    return null;
  }
}
