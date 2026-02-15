import { assertEquals } from "@std/assert";
import { findBestUpgrade, findMatchingVariant, groupByVariant, parseTag } from "./analyzer.ts";
import { findImages } from "./parser.ts";

Deno.test("parseTag - standard version with suffix", () => {
  const result = parseTag("8.6.0-alpine3.23");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8.6.0");
  assertEquals(result.suffix, "alpine3.23");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - standard version with alpine suffix", () => {
  const result = parseTag("8.6.0-alpine");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8.6.0");
  assertEquals(result.suffix, "alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - standard version no suffix", () => {
  const result = parseTag("8.6.0");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8.6.0");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - v prefix with slim suffix", () => {
  const result = parseTag("v1.2.3-slim");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "1.2.3");
  assertEquals(result.suffix, "slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - v prefix with complex suffix", () => {
  const result = parseTag("v3.6.8-nanoserver-ltsc2022");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "3.6.8");
  assertEquals(result.suffix, "nanoserver-ltsc2022");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - gradle jdk21-corretto-al2023", () => {
  const result = parseTag("9.3.1-jdk21-corretto-al2023");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "9.3.1");
  assertEquals(result.suffix, "jdk21-corretto-al2023");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - gradle jdk25-corretto", () => {
  const result = parseTag("9.3.1-jdk25-corretto");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "9.3.1");
  assertEquals(result.suffix, "jdk25-corretto");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - percona with build number", () => {
  const result = parseTag("8.0.44-35");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8.0.44-35");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - percona with build number and centos", () => {
  const result = parseTag("8.0.44-35-centos");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8.0.44-35");
  assertEquals(result.suffix, "centos");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - nginx alpine3.23-perl", () => {
  const result = parseTag("1.28.2-alpine3.23-perl");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "1.28.2");
  assertEquals(result.suffix, "alpine3.23-perl");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - nginx trixie-perl", () => {
  const result = parseTag("1.28.2-trixie-perl");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "1.28.2");
  assertEquals(result.suffix, "trixie-perl");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - node bookworm-slim", () => {
  const result = parseTag("25.6.1-bookworm-slim");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "25.6.1");
  assertEquals(result.suffix, "bookworm-slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - debian slim", () => {
  const result = parseTag("13.3-slim");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "13.3");
  assertEquals(result.suffix, "slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - maven amazoncorretto", () => {
  const result = parseTag("3.9.12-amazoncorretto-25");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "3.9.12");
  assertEquals(result.suffix, "amazoncorretto-25");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - aws-fluent-bit date version", () => {
  const result = parseTag("2.34.3.20260209");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "2.34.3.20260209");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - eclipse-temurin java style", () => {
  const result = parseTag("8u482-b08-jre");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8u482-b08");
  assertEquals(result.suffix, "jre");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - eclipse-temurin java style no suffix", () => {
  const result = parseTag("8u482-b08");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "8u482-b08");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - prerelease rc1", () => {
  const result = parseTag("1.0.0-rc1");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "1.0.0-rc1");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - prerelease rc1 with suffix", () => {
  const result = parseTag("1.0.0-rc1-alpine");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "1.0.0-rc1");
  assertEquals(result.suffix, "alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - prerelease beta2 with suffix", () => {
  const result = parseTag("1.0.0-beta2-slim");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "1.0.0-beta2");
  assertEquals(result.suffix, "slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - maven rc with amazoncorretto", () => {
  const result = parseTag("4.0.0-rc-5-amazoncorretto-25");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "4.0.0-rc-5");
  assertEquals(result.suffix, "amazoncorretto-25");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - floating alpine", () => {
  const result = parseTag("alpine");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "alpine");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating latest", () => {
  const result = parseTag("latest");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "latest");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating bookworm-slim", () => {
  const result = parseTag("bookworm-slim");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "bookworm-slim");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating stable-alpine3.23", () => {
  const result = parseTag("stable-alpine3.23");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "stable-alpine3.23");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating stable-trixie", () => {
  const result = parseTag("stable-trixie");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "stable-trixie");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating stable", () => {
  const result = parseTag("stable");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "stable");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating mainline", () => {
  const result = parseTag("mainline");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "mainline");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating lts-alpine3.23", () => {
  const result = parseTag("lts-alpine3.23");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "lts-alpine3.23");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating current-alpine3.23", () => {
  const result = parseTag("current-alpine3.23");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "current-alpine3.23");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating krypton-alpine3.22", () => {
  const result = parseTag("krypton-alpine3.22");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "krypton-alpine3.22");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating enterprise-7.6.9", () => {
  const result = parseTag("enterprise-7.6.9");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "enterprise-7.6.9");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating ps-8.0.44-35", () => {
  const result = parseTag("ps-8.0.44-35");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "ps-8.0.44-35");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating psmdb-8.0.17", () => {
  const result = parseTag("psmdb-8.0.17");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "psmdb-8.0.17");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating community-8.0.0", () => {
  const result = parseTag("community-8.0.0");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "community-8.0.0");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating php8.4-fpm-alpine3.22", () => {
  const result = parseTag("php8.4-fpm-alpine3.22");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "php8.4-fpm-alpine3.22");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating centos7.9.2009", () => {
  const result = parseTag("centos7.9.2009");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "centos7.9.2009");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating trixie-20260202-slim", () => {
  const result = parseTag("trixie-20260202-slim");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "trixie-20260202-slim");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating trixie", () => {
  const result = parseTag("trixie");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "trixie");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating rc1", () => {
  const result = parseTag("rc1");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "rc1");
  assertEquals(result.isFloating, true);
});

Deno.test("groupByVariant - redis tags", () => {
  const tags = [
    "8.6.0-alpine3.23",
    "8.6.0-alpine",
    "8.6.0-trixie",
    "8.6.0",
    "8.2.4-alpine3.22",
    "8.2.4-alpine",
    "8.2.4",
    "alpine",
    "latest",
    "trixie",
  ];
  const variants = groupByVariant(tags);

  const defaultVariant = variants.find((v) => v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "8.6.0");
  assertEquals(defaultVariant?.older.length, 1);
  assertEquals(defaultVariant?.older[0].original, "8.2.4");
  assertEquals(defaultVariant?.floating.length, 1);
  assertEquals(defaultVariant?.floating[0].original, "latest");

  const alpine3_23 = variants.find((v) => v.suffix === "alpine3.23");
  assertEquals(alpine3_23?.latest?.original, "8.6.0-alpine3.23");
  assertEquals(alpine3_23?.older.length, 0);

  const alpine3_22 = variants.find((v) => v.suffix === "alpine3.22");
  assertEquals(alpine3_22?.latest?.original, "8.2.4-alpine3.22");

  const alpine = variants.find((v) => v.suffix === "alpine");
  assertEquals(alpine?.latest?.original, "8.6.0-alpine");
  assertEquals(alpine?.older.length, 1);
  assertEquals(alpine?.older[0].original, "8.2.4-alpine");
  assertEquals(alpine?.floating.length, 1);
  assertEquals(alpine?.floating[0].original, "alpine");

  const trixie = variants.find((v) => v.suffix === "trixie");
  assertEquals(trixie?.latest?.original, "8.6.0-trixie");
  assertEquals(trixie?.floating.length, 1);
  assertEquals(trixie?.floating[0].original, "trixie");
});

Deno.test("groupByVariant - gradle tags", () => {
  const tags = [
    "9.3.1-jdk21-corretto-al2023",
    "9.3.1-jdk21-corretto",
    "9.3.1-jdk17-corretto-al2023",
    "9.3.1-jdk17-corretto",
    "jdk21-corretto-al2023",
    "jdk21-corretto",
    "corretto",
  ];
  const variants = groupByVariant(tags);

  const jdk21Al2023 = variants.find((v) =>
    v.suffix === "jdk21-corretto-al2023"
  );
  assertEquals(jdk21Al2023?.latest?.original, "9.3.1-jdk21-corretto-al2023");
  assertEquals(jdk21Al2023?.floating.length, 1);
  assertEquals(jdk21Al2023?.floating[0].original, "jdk21-corretto-al2023");

  const jdk21 = variants.find((v) => v.suffix === "jdk21-corretto");
  assertEquals(jdk21?.latest?.original, "9.3.1-jdk21-corretto");
  assertEquals(jdk21?.floating.length, 1);
  assertEquals(jdk21?.floating[0].original, "jdk21-corretto");

  const jdk17Al2023 = variants.find((v) =>
    v.suffix === "jdk17-corretto-al2023"
  );
  assertEquals(jdk17Al2023?.latest?.original, "9.3.1-jdk17-corretto-al2023");
  assertEquals(jdk17Al2023?.floating.length, 0);

  const jdk17 = variants.find((v) => v.suffix === "jdk17-corretto");
  assertEquals(jdk17?.latest?.original, "9.3.1-jdk17-corretto");

  const defaultVariant = variants.find((v) => v.suffix === "");
  assertEquals(defaultVariant?.floating.length, 1);
  assertEquals(defaultVariant?.floating[0].original, "corretto");
});

Deno.test("findBestUpgrade - same suffix upgrade", () => {
  const tags = ["8.6.0-alpine", "8.2.4-alpine", "alpine"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("8.2.4-alpine", variants);
  assertEquals(result, "8.6.0-alpine");
});

Deno.test("findBestUpgrade - no other alpine3.22 tags", () => {
  const tags = ["8.6.0-alpine3.23", "8.2.4-alpine3.22"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("8.2.4-alpine3.22", variants);
  assertEquals(result, null);
});

Deno.test("findBestUpgrade - floating tag upgrades to versioned", () => {
  const tags = ["8.6.0-alpine", "8.2.4-alpine", "alpine"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("alpine", variants);
  assertEquals(result, "8.6.0-alpine");
});

Deno.test("findBestUpgrade - floating latest upgrades to versioned default", () => {
  const tags = ["8.6.0", "8.2.4", "latest"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("latest", variants);
  assertEquals(result, "8.6.0");
});

Deno.test("groupByVariant - with digest map re-parsing", () => {
  const tags = [
    "ps-8.0.44-35",
    "ps-8.0.43-34",
    "8.0.44-35",
    "8.0.43-34",
    "8.0",
  ];
  const digestMap = new Map<string, string>([
    ["ps-8.0.44-35", "D1"],
    ["8.0.44-35", "D1"],
    ["ps-8.0.43-34", "D2"],
    ["8.0.43-34", "D2"],
    ["8.0", "D3"],
  ]);
  const variants = groupByVariant(tags, digestMap);

  const defaultVariant = variants.find((v) => v.prefix === "" && v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "8.0.44-35");
  assertEquals(defaultVariant?.older.length, 2);

  const psVariant = variants.find((v) => v.prefix === "ps-" && v.suffix === "");
  assertEquals(psVariant?.latest?.original, "ps-8.0.44-35");
  assertEquals(psVariant?.older.length, 1);
  assertEquals(psVariant?.older[0].original, "ps-8.0.43-34");
});

Deno.test("findBestUpgrade - preserves prefix from re-parsed tag", () => {
  const tags = ["ps-8.0.44-35", "ps-8.0.43-34", "8.0.44-35", "8.0.43-34"];
  const digestMap = new Map<string, string>([
    ["ps-8.0.44-35", "D1"],
    ["8.0.44-35", "D1"],
    ["ps-8.0.43-34", "D2"],
    ["8.0.43-34", "D2"],
  ]);
  const variants = groupByVariant(tags, digestMap);
  const result = findBestUpgrade("ps-8.0.43-34", variants);
  assertEquals(result, "ps-8.0.44-35");
});

Deno.test("findImages extracts docker images", () => {
  const content = `image = "docker.io/library/postgres:18.1-alpine";`;
  const images = findImages(content);
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].tag, "18.1-alpine");
});

Deno.test("parseTag - milestone M02 no suffix", () => {
  const result = parseTag("8.0-M02");
  assertEquals(result.version, "8.0-M02");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M02 with alpine suffix", () => {
  const result = parseTag("8.0-M02-alpine");
  assertEquals(result.version, "8.0-M02");
  assertEquals(result.suffix, "alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M02 with alpine3.21 suffix", () => {
  const result = parseTag("8.0-M02-alpine3.21");
  assertEquals(result.version, "8.0-M02");
  assertEquals(result.suffix, "alpine3.21");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M02 with bookworm suffix", () => {
  const result = parseTag("8.0-M02-bookworm");
  assertEquals(result.version, "8.0-M02");
  assertEquals(result.suffix, "bookworm");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M1 no suffix", () => {
  const result = parseTag("5.0-M1");
  assertEquals(result.version, "5.0-M1");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash no suffix", () => {
  const result = parseTag("1.2.3-35-g3a810da");
  assertEquals(result.version, "1.2.3-35-g3a810da");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash with alpine suffix", () => {
  const result = parseTag("1.2.3-35-g3a810da-alpine");
  assertEquals(result.version, "1.2.3-35-g3a810da");
  assertEquals(result.suffix, "alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash only", () => {
  const result = parseTag("1.2.3-a1b2c3d4");
  assertEquals(result.version, "1.2.3-a1b2c3d4");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - minimal suffix not hex", () => {
  const result = parseTag("8.0-minimal");
  assertEquals(result.version, "8.0");
  assertEquals(result.suffix, "minimal");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - alpine suffix not hex", () => {
  const result = parseTag("1.2.3-alpine");
  assertEquals(result.version, "1.2.3");
  assertEquals(result.suffix, "alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - milestone tags merge into correct variant", () => {
  const tags = ["8.0-M02-alpine", "8.0-M01-alpine"];
  const variants = groupByVariant(tags);
  const alpine = variants.find((v) => v.suffix === "alpine");
  assertEquals(alpine?.latest?.original, "8.0-M02-alpine");
  assertEquals(alpine?.older.length, 1);
  assertEquals(alpine?.older[0].original, "8.0-M01-alpine");
});

Deno.test("findBestUpgrade - milestone upgrade", () => {
  const tags = ["8.0-M02-alpine", "8.0-M01-alpine"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("8.0-M01-alpine", variants);
  assertEquals(result, "8.0-M02-alpine");
});

Deno.test("findBestUpgrade - rc1 to stable", () => {
  const tags = ["1.0.0", "1.0.0-rc1"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("1.0.0-rc1", variants);
  assertEquals(result, "1.0.0");
});

Deno.test("groupByVariant - stable sorts above milestone", () => {
  const tags = ["8.0", "8.0-M02", "8.0-M01"];
  const variants = groupByVariant(tags);
  const defaultVariant = variants.find((v) => v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "8.0");
  assertEquals(defaultVariant?.older.length, 2);
  assertEquals(defaultVariant?.older[0].original, "8.0-M02");
  assertEquals(defaultVariant?.older[1].original, "8.0-M01");
});

Deno.test("parseTag - build counter ig446", () => {
  const result = parseTag("v2.5.6-ig446");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "2.5.6-ig446");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - build counter ls189", () => {
  const result = parseTag("v1.0.0-ls189");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "1.0.0-ls189");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - build counter with suffix", () => {
  const result = parseTag("v2.5.6-ig446-noml");
  assertEquals(result.prefix, "v");
  assertEquals(result.version, "2.5.6-ig446");
  assertEquals(result.suffix, "noml");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix amd64", () => {
  const result = parseTag("amd64-2.5.6");
  assertEquals(result.prefix, "amd64-");
  assertEquals(result.version, "2.5.6");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix with suffix", () => {
  const result = parseTag("arm64v8-2.5.6-noml");
  assertEquals(result.prefix, "arm64v8-");
  assertEquals(result.version, "2.5.6");
  assertEquals(result.suffix, "noml");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix with v and build counter", () => {
  const result = parseTag("amd64-v2.5.6-ig446");
  assertEquals(result.prefix, "amd64-v");
  assertEquals(result.version, "2.5.6-ig446");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - version-v prefix", () => {
  const result = parseTag("version-v2.5.6");
  assertEquals(result.prefix, "version-v");
  assertEquals(result.version, "2.5.6");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix with version-v", () => {
  const result = parseTag("arm64v8-version-v2.5.6");
  assertEquals(result.prefix, "arm64v8-version-v");
  assertEquals(result.version, "2.5.6");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - floating arch-prefixed", () => {
  const result = parseTag("amd64-noml");
  assertEquals(result.prefix, "amd64-");
  assertEquals(result.suffix, "noml");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating arm64v8-latest", () => {
  const result = parseTag("arm64v8-latest");
  assertEquals(result.prefix, "arm64v8-");
  assertEquals(result.suffix, "latest");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - enterprise still floating", () => {
  const result = parseTag("enterprise-7.6.9");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "enterprise-7.6.9");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - ps still floating", () => {
  const result = parseTag("ps-8.0.44-35");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "");
  assertEquals(result.suffix, "ps-8.0.44-35");
  assertEquals(result.isFloating, true);
});

Deno.test("groupByVariant - imagegenius with suffix inference", () => {
  const tags = [
    "2.5.6-noml",
    "2.4.1-noml",
    "noml-v2.5.6-ig356",
    "noml-v2.4.1-ig300",
    "noml",
  ];
  const variants = groupByVariant(tags);

  const suffixNoml = variants.find((v) => v.prefix === "" && v.suffix === "noml");
  assertEquals(suffixNoml?.latest?.original, "2.5.6-noml");
  assertEquals(suffixNoml?.older.length, 1);
  assertEquals(suffixNoml?.older[0].original, "2.4.1-noml");

  const prefixNoml = variants.find((v) => v.prefix === "noml-v" && v.suffix === "");
  assertEquals(prefixNoml?.latest?.original, "noml-v2.5.6-ig356");
  assertEquals(prefixNoml?.older.length, 1);
  assertEquals(prefixNoml?.older[0].original, "noml-v2.4.1-ig300");
});

Deno.test("findBestUpgrade - imagegenius pinned tag", () => {
  const tags = [
    "noml-v2.5.6-ig356",
    "noml-v2.4.1-ig300",
    "2.5.6-noml",
    "2.4.1-noml",
  ];
  const variants = groupByVariant(tags);

  const result1 = findBestUpgrade("noml-v2.4.1-ig300", variants);
  assertEquals(result1, "noml-v2.5.6-ig356");

  const result2 = findBestUpgrade("2.4.1-noml", variants);
  assertEquals(result2, "2.5.6-noml");
});

Deno.test("groupByVariant - arch tags separate groups", () => {
  const tags = ["amd64-2.5.6", "2.5.6"];
  const variants = groupByVariant(tags);

  const amd64Variant = variants.find((v) => v.prefix === "amd64-" && v.suffix === "");
  assertEquals(amd64Variant?.latest?.original, "amd64-2.5.6");

  const defaultVariant = variants.find((v) => v.prefix === "" && v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "2.5.6");
});

Deno.test("groupByVariant - v-prefix separate group", () => {
  const tags = ["v1.2.3-alpine", "1.3.0-alpine"];
  const variants = groupByVariant(tags);

  const vAlpine = variants.find((v) => v.prefix === "v" && v.suffix === "alpine");
  assertEquals(vAlpine?.latest?.original, "v1.2.3-alpine");

  const alpine = variants.find((v) => v.prefix === "" && v.suffix === "alpine");
  assertEquals(alpine?.latest?.original, "1.3.0-alpine");
});

Deno.test("findMatchingVariant - prefix+suffix match", () => {
  const tags = ["v1.2.3-alpine", "1.3.0-alpine"];
  const variants = groupByVariant(tags);

  const vMatch = findMatchingVariant("v1.2.3-alpine", variants);
  assertEquals(vMatch?.prefix, "v");
  assertEquals(vMatch?.suffix, "alpine");

  const noPrefixMatch = findMatchingVariant("1.3.0-alpine", variants);
  assertEquals(noPrefixMatch?.prefix, "");
  assertEquals(noPrefixMatch?.suffix, "alpine");
});

Deno.test("parseTag - git hash build ls37", () => {
  const result = parseTag("b3d6b63f-ls37");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "b3d6b63f-ls37");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash build ig94", () => {
  const result = parseTag("289c0610-ig94");
  assertEquals(result.prefix, "");
  assertEquals(result.version, "289c0610-ig94");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash build with arch prefix", () => {
  const result = parseTag("amd64-a1b2c3d4-ls50");
  assertEquals(result.prefix, "amd64-");
  assertEquals(result.version, "a1b2c3d4-ls50");
  assertEquals(result.suffix, "");
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - git hash build tags", () => {
  const tags = ["b3d6b63f-ls37", "a1c2d3e4-ls45", "latest"];
  const variants = groupByVariant(tags);
  const defaultVariant = variants.find((v) => v.prefix === "" && v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "a1c2d3e4-ls45");
  assertEquals(defaultVariant?.older.length, 1);
  assertEquals(defaultVariant?.older[0].original, "b3d6b63f-ls37");
});

Deno.test("findBestUpgrade - git hash build", () => {
  const tags = ["b3d6b63f-ls37", "a1c2d3e4-ls45", "latest"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("b3d6b63f-ls37", variants);
  assertEquals(result, "a1c2d3e4-ls45");
});

Deno.test("groupByVariant - lsio v4 as floating", () => {
  const tags = ["v4", "4.0.0"];
  const variants = groupByVariant(tags, undefined, "linuxserver/emby");
  const defaultVariant = variants.find((v) => v.prefix === "" && v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "4.0.0");
  assertEquals(defaultVariant?.floating.length, 1);
  assertEquals(defaultVariant?.floating[0].original, "v4");
});

Deno.test("groupByVariant - lsio develop nightly floating", () => {
  const tags = ["develop", "nightly", "3.0.0"];
  const variants = groupByVariant(tags, undefined, "linuxserver/plex");
  const defaultVariant = variants.find((v) => v.prefix === "" && v.suffix === "");
  assertEquals(defaultVariant?.latest?.original, "3.0.0");
  assertEquals(defaultVariant?.floating.length, 2);
  const floatingNames = defaultVariant?.floating.map((t) => t.original) ?? [];
  assertEquals(floatingNames.includes("develop"), true);
  assertEquals(floatingNames.includes("nightly"), true);
});

Deno.test("groupByVariant - non-lsio v4 versioned", () => {
  const tags = ["v4", "v3"];
  const variants = groupByVariant(tags, undefined, "library/nginx");
  const vVariant = variants.find((v) => v.prefix === "v" && v.suffix === "");
  assertEquals(vVariant?.latest?.original, "v4");
  assertEquals(vVariant?.older.length, 1);
  assertEquals(vVariant?.older[0].original, "v3");
  assertEquals(vVariant?.floating.length, 0);
});

