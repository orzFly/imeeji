export const LSIO_FLOATING_TAGS = new Set([
  "latest",
  "develop",
  "gpu",
  "alpine-kde",
  "alpine-mate",
  "alpine-xfce",
  "alpine-znc",
  "web",
  "stable",
  "nightly",
  "master",
  "main",
  "edge",
  "test",
  "testing",
  "beta",
  "alpha",
  "dev",
  "rc",
  "v4",
  "v3",
  "v2",
  "v1",
  "amd64",
  "arm64",
  "arm32v7",
  "x86",
  "legacy",
  "minimal",
]);

export function isLinuxServerRepo(repository: string): boolean {
  return repository.startsWith("linuxserver/");
}

export interface LsioChangelogEntry {
  version: string;
  date: string;
  description: string;
}

export interface LsioTag {
  name: string;
  description: string;
  deprecated: boolean;
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
    const response = await fetch(LSIO_API_URL);
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
