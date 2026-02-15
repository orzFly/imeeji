import { assertEquals } from "@std/assert";
import { findImages } from "./parser.ts";
import { applyUpdates } from "./patcher.ts";

Deno.test("findImages ignores # comments by default", () => {
  const content = "# image: nginx:alpine";
  assertEquals(findImages(content, "test.yaml").length, 0);
});

Deno.test("findImages ignores ; comments by default", () => {
  const content = ";  docker.io/library/nginx:alpine";
  assertEquals(findImages(content, "test.service").length, 0);
});

Deno.test("findImages ignores // comments by default", () => {
  const content = "// docker.io/library/nginx:alpine";
  assertEquals(findImages(content, "test.js").length, 0);
});

Deno.test("findImages parses comments with --allow-comments", () => {
  const content = "# docker.io/library/nginx:alpine";
  assertEquals(findImages(content, "test.yaml", true).length, 1);
});

Deno.test("findImages parses YAML shorthand with tag", () => {
  const content = "    image: postgres:16-alpine";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].tag, "16-alpine");
  assertEquals(images[0].full, "postgres:16-alpine");
  assertEquals(images[0].hasExplicitTag, true);
});

Deno.test("findImages parses YAML shorthand without tag", () => {
  const content = "    image: nginx";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/nginx");
  assertEquals(images[0].tag, "latest");
  assertEquals(images[0].full, "nginx");
  assertEquals(images[0].hasExplicitTag, false);
});

Deno.test("findImages parses YAML org/repo with tag", () => {
  const content = "    image: looplj/axonhub:latest";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "looplj/axonhub");
  assertEquals(images[0].tag, "latest");
  assertEquals(images[0].full, "looplj/axonhub:latest");
});

Deno.test("findImages parses YAML org/repo without tag", () => {
  const content = "    image: looplj/axonhub";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "looplj/axonhub");
  assertEquals(images[0].tag, "latest");
  assertEquals(images[0].hasExplicitTag, false);
});

Deno.test("findImages parses double-quoted shorthand", () => {
  const content = '    image: "nginx:alpine"';
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/nginx");
  assertEquals(images[0].tag, "alpine");
  assertEquals(images[0].full, '"nginx:alpine"');
  assertEquals(images[0].hasExplicitTag, true);
});

Deno.test("findImages parses single-quoted shorthand", () => {
  const content = "    image: 'postgres:16-alpine'";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].tag, "16-alpine");
});

Deno.test("findImages parses quoted tagless shorthand", () => {
  const content = '    image: "nginx"';
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].tag, "latest");
  assertEquals(images[0].hasExplicitTag, false);
});

Deno.test("findImages still parses full specifiers", () => {
  const content = 'image = "docker.io/library/postgres:18.1-alpine";';
  const images = findImages(content, "test.nix");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].hasExplicitTag, undefined);
});

Deno.test("findImages prefers full specifier over shorthand", () => {
  const content = "    image: docker.io/library/nginx:alpine";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(images[0].full, "docker.io/library/nginx:alpine");
  assertEquals(images[0].hasExplicitTag, undefined);
});

Deno.test("findImages ignores non-image keys", () => {
  const content = "base_image: nginx:alpine";
  assertEquals(findImages(content, "test.yaml").length, 0);
});

Deno.test("findImages parses indented YAML", () => {
  const content = "      image: nginx:alpine";
  assertEquals(findImages(content, "compose.yaml").length, 1);
});

Deno.test("findImages finds multiple images", () => {
  const content = `
services:
  app:
    image: nginx:alpine
  db:
    image: postgres:16
`;
  assertEquals(findImages(content, "compose.yaml").length, 2);
});

Deno.test("findImages computes correct byte offsets for shorthand", () => {
  const content = "foo: bar\n    image: nginx:alpine";
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(
    content.slice(
      images[0].startIndex,
      images[0].startIndex + images[0].matchedLength,
    ),
    "nginx:alpine",
  );
});

Deno.test("findImages byte offsets include quotes for quoted shorthand", () => {
  const content = '    image: "nginx:alpine"';
  const images = findImages(content, "compose.yaml");
  assertEquals(images.length, 1);
  assertEquals(
    content.slice(
      images[0].startIndex,
      images[0].startIndex + images[0].matchedLength,
    ),
    '"nginx:alpine"',
  );
});

Deno.test("escaper preserves shorthand format", () => {
  const content = "    image: postgres:16-alpine";
  const images = findImages(content, "compose.yaml");
  assertEquals(images[0].escaper!("18-alpine"), "postgres:18-alpine");
});

Deno.test("escaper adds tag to tagless shorthand", () => {
  const content = "    image: nginx";
  const images = findImages(content, "compose.yaml");
  assertEquals(images[0].escaper!("1.25-alpine"), "nginx:1.25-alpine");
});

Deno.test("escaper preserves quotes", () => {
  const content = '    image: "postgres:16-alpine"';
  const images = findImages(content, "compose.yaml");
  assertEquals(images[0].escaper!("18-alpine"), '"postgres:18-alpine"');
});

Deno.test("escaper for full specifier uses registry/repo:tag", () => {
  const content = "docker.io/library/postgres:16-alpine";
  const images = findImages(content, "test.nix");
  assertEquals(
    images[0].escaper!("18-alpine"),
    "docker.io/library/postgres:18-alpine",
  );
});

Deno.test("patcher preserves shorthand format", () => {
  const content = "    image: postgres:16-alpine";
  const images = findImages(content, "compose.yaml");
  const updated = images.map((img) => ({
    ...img,
    tag: "18-alpine",
    full: `${img.registry}/${img.repository}:18-alpine`,
    originalFull: img.full,
  }));
  const result = applyUpdates(content, updated);
  assertEquals(result, "    image: postgres:18-alpine");
});

Deno.test("patcher adds tag to tagless shorthand", () => {
  const content = "    image: nginx";
  const images = findImages(content, "compose.yaml");
  const updated = images.map((img) => ({
    ...img,
    tag: "1.25-alpine",
    full: `${img.registry}/${img.repository}:1.25-alpine`,
    originalFull: img.full,
  }));
  const result = applyUpdates(content, updated);
  assertEquals(result, "    image: nginx:1.25-alpine");
});

Deno.test("patcher preserves quotes around shorthand", () => {
  const content = '    image: "postgres:16-alpine"';
  const images = findImages(content, "compose.yaml");
  const updated = images.map((img) => ({
    ...img,
    tag: "18-alpine",
    full: `${img.registry}/${img.repository}:18-alpine`,
    originalFull: img.full,
  }));
  const result = applyUpdates(content, updated);
  assertEquals(result, '    image: "postgres:18-alpine"');
});
