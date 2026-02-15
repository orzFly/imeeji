export interface AuthChallenge {
  realm: string;
  service?: string;
  scope?: string;
}

const REGISTRY_ALIASES: Record<string, string> = {
  "docker.io": "registry.hub.docker.com",
};

export interface TagsResponse {
  name: string;
  tags: string[];
}

export interface DockerHubTag {
  name: string;
  digest: string;
}

export interface DockerHubTagsResponse {
  results: DockerHubTag[];
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

export function parseWwwAuthenticate(header: string): AuthChallenge | null {
  if (!header.startsWith("Bearer ")) return null;
  const params = header.slice(7);
  if (!params) return null;

  const result: AuthChallenge = { realm: "" };
  const realmMatch = params.match(/realm="([^"]+)"/);
  const serviceMatch = params.match(/service="([^"]+)"/);
  const scopeMatch = params.match(/scope="([^"]+)"/);

  if (!realmMatch) return null;
  result.realm = realmMatch[1];
  if (serviceMatch) result.service = serviceMatch[1];
  if (scopeMatch) result.scope = scopeMatch[1];

  return result;
}

async function requestOciToken(challenge: AuthChallenge): Promise<string | null> {
  let url = challenge.realm;
  const params = new URLSearchParams();
  if (challenge.service) params.set("service", challenge.service);
  if (challenge.scope) params.set("scope", challenge.scope);
  if (params.toString()) url += `?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.token ?? data.access_token ?? null;
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
        if (!token) {
          const wwwAuth = response.headers.get("WWW-Authenticate");
          const challenge = wwwAuth ? parseWwwAuthenticate(wwwAuth) : null;
          if (challenge) {
            const newToken = await requestOciToken(challenge);
            if (newToken) {
              token = newToken;
              seenUrls.delete(url!);
              continue;
            }
          }
        }
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

async function fetchDockerHubTagsWithDigests(
  repository: string,
): Promise<Map<string, string>> {
  const digestMap = new Map<string, string>();

  let namespace = "library";
  let repo = repository;

  if (repository.includes("/")) {
    const parts = repository.split("/");
    namespace = parts[0];
    repo = parts.slice(1).join("/");
  }

  const url =
    `https://hub.docker.com/v2/namespaces/${namespace}/repositories/${repo}/tags?page_size=100`;

  try {
    const response = await fetch(url);
    if (!response.ok) return digestMap;

    const data: DockerHubTagsResponse = await response.json();

    for (const tag of data.results) {
      digestMap.set(tag.name, tag.digest);
    }
  } catch {
    // Silently fall back to no digest data
  }

  return digestMap;
}

export async function fetchTagsEnriched(
  registry: string,
  repository: string,
): Promise<{ tags: string[]; digestMap?: Map<string, string> }> {
  const tags = await fetchTags(registry, repository);

  if (registry === "docker.io") {
    const digestMap = await fetchDockerHubTagsWithDigests(repository);
    return { tags, digestMap };
  }

  return { tags };
}
