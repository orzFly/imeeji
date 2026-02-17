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
  timestampMap: Map<string, Date>;
  foundCurrentTag?: boolean;
}

const DOCKER_HUB_API = "https://hub.docker.com";

export function isDockerHubRepository(registry: string): boolean {
  return registry === "docker.io" || registry === "registry.hub.docker.com";
}

export async function fetchDockerHubTags(
  repository: string,
  currentTag?: string,
  allTags?: boolean,
): Promise<DockerHubFetchResult> {
  const maxPages = allTags ? Infinity : 10;
  let namespace = "library";
  let repo = repository;

  if (repository.includes("/")) {
    const parts = repository.split("/");
    namespace = parts[0];
    repo = parts.slice(1).join("/");
  }

  const tags: string[] = [];
  const digestMap = new Map<string, string>();
  const timestampMap = new Map<string, Date>();
  let foundCurrentTag = currentTag ? false : undefined;
  let page = 1;
  let nextUrl: string | null =
    `${DOCKER_HUB_API}/v2/namespaces/${namespace}/repositories/${repo}/tags?page_size=100`;

  while (nextUrl && page <= maxPages) {
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
        if (tag.tag_last_pushed) {
          const ts = new Date(tag.tag_last_pushed);
          if (!isNaN(ts.getTime())) {
            timestampMap.set(tag.name, ts);
          }
        }
        if (currentTag && tag.name === currentTag) {
          foundCurrentTag = true;
        }
      }

      if (!allTags && currentTag && foundCurrentTag) {
        if (data.next) {
          const nextResponse = await myFetch(data.next);
          if (nextResponse.ok) {
            const nextData: DockerHubTagsResponse = await nextResponse.json();
            for (const tag of nextData.results) {
              tags.push(tag.name);
              if (tag.digest) {
                digestMap.set(tag.name, tag.digest);
              }
              if (tag.tag_last_pushed) {
                const ts = new Date(tag.tag_last_pushed);
                if (!isNaN(ts.getTime())) {
                  timestampMap.set(tag.name, ts);
                }
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

  return { tags, digestMap, timestampMap, foundCurrentTag };
}
