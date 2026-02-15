export function getTagUrl(
  registry: string,
  repository: string,
  tag: string,
): string | null {
  if (registry === "docker.io") {
    if (repository.startsWith("library/")) {
      const image = repository.slice("library/".length);
      return `https://hub.docker.com/_/${image}/tags?name=${encodeURIComponent(tag)}`;
    }
    return `https://hub.docker.com/r/${repository}/tags?name=${encodeURIComponent(tag)}`;
  }

  if (registry === "ghcr.io") {
    const slashIdx = repository.indexOf("/");
    if (slashIdx === -1) return null;
    const owner = repository.slice(0, slashIdx);
    const image = repository.slice(slashIdx + 1);
    return `https://github.com/${owner}/pkgs/container/${image}`;
  }

  if (registry === "quay.io") {
    return `https://quay.io/repository/${repository}?tab=tags&tag=${encodeURIComponent(tag)}`;
  }

  return null;
}
