import { assertEquals } from "@std/assert";
import { parseTag, groupTags, findBestUpgrade } from "./analyzer.ts";
import { findImages } from "./parser.ts";

Deno.test("parseTag handles semver with suffix", () => {
  const result = parseTag("v1.2.3-alpine");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "1.2.3");
  assertEquals(result.suffix, "-alpine");
});

Deno.test("parseTag handles numeric version with suffix", () => {
  const result = parseTag("18.1-alpine");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "18.1");
  assertEquals(result.suffix, "-alpine");
});

Deno.test("parseTag handles plain version", () => {
  const result = parseTag("0.1.81");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "0.1.81");
  assertEquals(result.suffix, "");
});

Deno.test("findImages extracts docker images", () => {
  const content = `image = "docker.io/library/postgres:18.1-alpine";`;
  const images = findImages(content);
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].tag, "18.1-alpine");
});
