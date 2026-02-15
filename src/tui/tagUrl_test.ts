import { assertEquals } from "@std/assert";
import { getTagUrl } from "./tagUrl.ts";

Deno.test("getTagUrl - Docker Hub library image", () => {
  const url = getTagUrl("docker.io", "library/nginx", "1.25");
  assertEquals(url, "https://hub.docker.com/_/nginx/tags?name=1.25");
});

Deno.test("getTagUrl - Docker Hub user image", () => {
  const url = getTagUrl("docker.io", "user/myimage", "v2.0");
  assertEquals(url, "https://hub.docker.com/r/user/myimage/tags?name=v2.0");
});

Deno.test("getTagUrl - Docker Hub encodes special chars in tag", () => {
  const url = getTagUrl("docker.io", "library/nginx", "1.25-alpine");
  assertEquals(url, "https://hub.docker.com/_/nginx/tags?name=1.25-alpine");
});

Deno.test("getTagUrl - GHCR image", () => {
  const url = getTagUrl("ghcr.io", "owner/myimage", "v1.0.0");
  assertEquals(url, "https://github.com/owner/pkgs/container/myimage");
});

Deno.test("getTagUrl - GHCR nested image path", () => {
  const url = getTagUrl("ghcr.io", "org/team/image", "latest");
  assertEquals(url, "https://github.com/org/pkgs/container/team/image");
});

Deno.test("getTagUrl - GHCR without slash returns null", () => {
  const url = getTagUrl("ghcr.io", "singlepart", "latest");
  assertEquals(url, null);
});

Deno.test("getTagUrl - Quay.io image", () => {
  const url = getTagUrl("quay.io", "myorg/myapp", "3.0");
  assertEquals(url, "https://quay.io/repository/myorg/myapp?tab=tags&tag=3.0");
});

Deno.test("getTagUrl - Quay.io encodes special chars in tag", () => {
  const url = getTagUrl("quay.io", "myorg/myapp", "v1.2-beta");
  assertEquals(
    url,
    "https://quay.io/repository/myorg/myapp?tab=tags&tag=v1.2-beta",
  );
});

Deno.test("getTagUrl - Unknown registry returns null", () => {
  const url = getTagUrl("gcr.io", "myproject/myimage", "latest");
  assertEquals(url, null);
});

Deno.test("getTagUrl - Custom registry returns null", () => {
  const url = getTagUrl("registry.example.com", "myimage", "1.0");
  assertEquals(url, null);
});
