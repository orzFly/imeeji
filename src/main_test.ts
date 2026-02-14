import { assertEquals } from "@std/assert";
import { parseTag, groupByVariant, findBestUpgrade } from "./analyzer.ts";
import { findImages } from "./parser.ts";

Deno.test("parseTag handles semver with suffix", () => {
  const result = parseTag("v1.2.3-alpine");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "1.2.3");
  assertEquals(result.suffix, "-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag handles numeric version with suffix", () => {
  const result = parseTag("18.1-alpine");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "18.1");
  assertEquals(result.suffix, "-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag handles plain version", () => {
  const result = parseTag("0.1.81");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "0.1.81");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag marks floating tags correctly", () => {
  const latest = parseTag("latest");
  assertEquals(latest.isFloating, true);
  assertEquals(latest.version, "latest");

  const alpine = parseTag("alpine");
  assertEquals(alpine.isFloating, true);
  assertEquals(alpine.suffix, "");

  const rcAlpine = parseTag("rc-alpine");
  assertEquals(rcAlpine.isFloating, true);
  assertEquals(rcAlpine.prefix, "rc");
  assertEquals(rcAlpine.suffix, "-alpine");
});

Deno.test("parseTag handles prerelease prefixes", () => {
  const rc = parseTag("rc1.0.0");
  assertEquals(rc.prefix, "rc");
  assertEquals(rc.version, "1.0.0");
  assertEquals(rc.isFloating, false);

  const beta = parseTag("beta-alpine");
  assertEquals(beta.prefix, "beta");
  assertEquals(beta.version, "");
  assertEquals(beta.suffix, "-alpine");
  assertEquals(beta.isFloating, true);
});

Deno.test("groupByVariant groups by suffix", () => {
  const tags = ["v1.0.0", "v1.0.0-alpine", "v1.1.0", "v1.1.0-alpine", "latest", "alpine"];
  const variants = groupByVariant(tags);

  assertEquals(variants.length, 2);

  const defaultVariant = variants.find((v) => v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "v1.1.0");
  assertEquals(defaultVariant?.older.length, 1);
  assertEquals(defaultVariant?.older[0].original, "v1.0.0");
  assertEquals(defaultVariant?.floating.length, 2);

  const alpineVariant = variants.find((v) => v.suffix === "-alpine");
  assertEquals(alpineVariant?.latest?.original, "v1.1.0-alpine");
  assertEquals(alpineVariant?.older.length, 1);
  assertEquals(alpineVariant?.older[0].original, "v1.0.0-alpine");
});

Deno.test("findImages extracts docker images", () => {
  const content = `image = "docker.io/library/postgres:18.1-alpine";`;
  const images = findImages(content);
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].tag, "18.1-alpine");
});
