import { myFetch } from "../fetch.ts";

export interface DockerHubTag {
  name: string;
  digest: string;
  tag_last_pushed?: string;
}

export interface DockerHubTagsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DockerHubTag[];
}

export interface DockerHubFetchResult {
  tags: string[];
  digestMap: Map<string, string>;
}

const DOCKER_HUB_API = "https://hub.docker.com";

export function isDockerHubRepository(registry: string): boolean {
  return registry === "docker.io" || registry === "registry.hub.docker.com";
}

export async function fetchDockerHubTags(
  repository: string,
  pageSize = 100,
): Promise<DockerHubFetchResult> {
  let namespace = "library";
  let repo = repository;

  if (repository.includes("/")) {
    const parts = repository.split("/");
    namespace = parts[0];
    repo = parts.slice(1).join("/");
  }

  const url = `${DOCKER_HUB_API}/v2/namespaces/${namespace}/repositories/${repo}/tags?page_size=${pageSize}`;

  try {
    const response = await myFetch(url);
    if (!response.ok) {
      return { tags: [], digestMap: new Map() };
    }

    const data: DockerHubTagsResponse = await response.json();
    const tags: string[] = [];
    const digestMap = new Map<string, string>();

    for (const tag of data.results) {
      tags.push(tag.name);
      if (tag.digest) {
        digestMap.set(tag.name, tag.digest);
      }
    }

    return { tags, digestMap };
  } catch {
    return { tags: [], digestMap: new Map() };
  }
}
