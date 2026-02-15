import { myFetch } from "./fetch.ts";
import { fetchDockerHubTags, isDockerHubRepository } from "./integrations/dockerHub.ts";

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

function getRegistryHost(registry: string): string {
  return REGISTRY_ALIASES[registry] ?? registry;
}

export function parseWwwAuthenticate(header: string): AuthChallenge | null {
  if (header.length < 7 || header.slice(0, 7).toLowerCase() !== "bearer ") return null;
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
    const response = await myFetch(url);
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
  return myFetch(url, { headers });
}

async function fetchOciTags(
  registry: string,
  repository: string,
): Promise<string[]> {
  const host = getRegistryHost(registry);
  const allTags: string[] = [];
  let token: string | undefined;

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

export async function fetchTagsEnriched(
  registry: string,
  repository: string,
): Promise<{ tags: string[]; digestMap?: Map<string, string> }> {
  if (isDockerHubRepository(registry)) {
    return fetchDockerHubTags(repository);
  }

  const tags = await fetchOciTags(registry, repository);
  return { tags };
}
