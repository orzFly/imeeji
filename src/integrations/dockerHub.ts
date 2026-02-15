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
  foundCurrentTag?: boolean;
}

const DOCKER_HUB_API = "https://hub.docker.com";

export function isDockerHubRepository(registry: string): boolean {
  return registry === "docker.io" || registry === "registry.hub.docker.com";
}

const MAX_PAGES = 10;

export async function fetchDockerHubTags(
  repository: string,
  currentTag?: string,
): Promise<DockerHubFetchResult> {
  let namespace = "library";
  let repo = repository;

  if (repository.includes("/")) {
    const parts = repository.split("/");
    namespace = parts[0];
    repo = parts.slice(1).join("/");
  }

  const tags: string[] = [];
  const digestMap = new Map<string, string>();
  let foundCurrentTag = currentTag ? false : undefined;
  let page = 1;
  let nextUrl: string | null = `${DOCKER_HUB_API}/v2/namespaces/${namespace}/repositories/${repo}/tags?page_size=100`;

  while (nextUrl && page <= MAX_PAGES) {
    try {
      const response = await myFetch(nextUrl);
      if (!response.ok) {
        break;
      }

      const data: DockerHubTagsResponse = await response.json();

      for (const tag of data.results) {
        tags.push(tag.name);
        if (tag.digest) {
          digestMap.set(tag.name, tag.digest);
        }
        if (currentTag && tag.name === currentTag) {
          foundCurrentTag = true;
        }
      }

      if (currentTag && foundCurrentTag) {
        if (data.next) {
          const nextResponse = await myFetch(data.next);
          if (nextResponse.ok) {
            const nextData: DockerHubTagsResponse = await nextResponse.json();
            for (const tag of nextData.results) {
              tags.push(tag.name);
              if (tag.digest) {
                digestMap.set(tag.name, tag.digest);
              }
            }
          }
        }
        break;
      }

      nextUrl = data.next;
      page++;
    } catch {
      break;
    }
  }

  if (currentTag && !foundCurrentTag) {
    foundCurrentTag = false;
  }

  return { tags, digestMap, foundCurrentTag };
}
