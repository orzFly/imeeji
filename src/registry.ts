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
  allTags?: boolean,
): Promise<
  {
    tags: string[];
    digestMap?: Map<string, string>;
    timestampMap?: Map<string, Date>;
    foundCurrentTag?: boolean;
  }
> {
  if (isDockerHubRepository(registry)) {
    return fetchDockerHubTags(repository, currentTag, allTags);
  }

  const tags = await fetchOciTags(registry, repository);
  return { tags };
}
