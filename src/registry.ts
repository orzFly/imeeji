import {
  fetchDockerHubTags,
  isDockerHubRepository,
} from "./integrations/dockerHub.ts";
import { fetchOciTags } from "./integrations/ociRegistry.ts";

export { parseWwwAuthenticate } from "./integrations/ociRegistry.ts";
export type { AuthChallenge } from "./integrations/ociRegistry.ts";

export function getRepositoryKey(
  registry: string,
  repository: string,
): string {
  return `${registry}/${repository}`;
}

export async function fetchTagsEnriched(
  registry: string,
  repository: string,
  currentTag?: string,
): Promise<
  { tags: string[]; digestMap?: Map<string, string>; foundCurrentTag?: boolean }
> {
  if (isDockerHubRepository(registry)) {
    return fetchDockerHubTags(repository, currentTag);
  }

  const tags = await fetchOciTags(registry, repository);
  return { tags };
}
