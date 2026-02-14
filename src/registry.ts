const REGISTRY_ALIASES: Record<string, string> = {
  "docker.io": "registry.hub.docker.com",
};

export interface TagsResponse {
  name: string;
  tags: string[];
}

function getRegistryHost(registry: string): string {
  return REGISTRY_ALIASES[registry] ?? registry;
}

async function getDockerHubToken(repository: string): Promise<string | null> {
  const authUrl =
    `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull`;
  try {
    const response = await fetch(authUrl);
    if (!response.ok) return null;
    const data = await response.json();
    return data.token;
  } catch {
    return null;
  }
}

function fetchWithAuth(
  url: string,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}

export async function fetchTags(
  registry: string,
  repository: string,
): Promise<string[]> {
  const host = getRegistryHost(registry);
  const allTags: string[] = [];

  let token: string | undefined;

  if (registry === "docker.io") {
    const t = await getDockerHubToken(repository);
    if (!t) {
      console.error(`Failed to get auth token for docker.io/${repository}`);
      return [];
    }
    token = t;
  }

  let url: string | null = `https://${host}/v2/${repository}/tags/list?n=100`;
  const seenUrls = new Set<string>();

  while (url && !seenUrls.has(url)) {
    seenUrls.add(url);

    let response: Response;
    try {
      response = await fetchWithAuth(url, token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `Failed to fetch tags from ${registry}/${repository}: ${msg}`,
      );
      return [];
    }

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`Repository not found: ${registry}/${repository}`);
      } else if (response.status === 401 || response.status === 403) {
        console.error(
          `Authentication required for ${registry}/${repository}. Skipping.`,
        );
      } else {
        console.error(
          `Error fetching tags from ${registry}/${repository}: ${response.status}`,
        );
      }
      return [];
    }

    const data: TagsResponse = await response.json();
    if (data.tags) {
      allTags.push(...data.tags);
    }

    const linkHeader = response.headers.get("Link");
    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>/);
      if (match) {
        const nextUrl = match[1];
        url = nextUrl.startsWith("http")
          ? nextUrl
          : `https://${host}${nextUrl}`;
      } else {
        url = null;
      }
    } else {
      url = null;
    }
  }

  return [...new Set(allTags)];
}

export function getRepositoryKey(
  registry: string,
  repository: string,
): string {
  return `${registry}/${repository}`;
}
