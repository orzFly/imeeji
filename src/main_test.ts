import { assertEquals } from "@std/assert";
import {
  findBestUpgrade,
  findMatchingVariant,
  groupByVariant,
  parseTag,
} from "./analyzer.ts";
import { findImages } from "./parser.ts";

Deno.test("parseTag - standard version with suffix", () => {
  const result = parseTag("8.6.0-alpine3.23");
  assertEquals(result.version, ["8.6.0"]);
  assertEquals(result.variantKey, "*-alpine3.23");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - standard version with alpine suffix", () => {
  const result = parseTag("8.6.0-alpine");
  assertEquals(result.version, ["8.6.0"]);
  assertEquals(result.variantKey, "*-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - standard version no suffix", () => {
  const result = parseTag("8.6.0");
  assertEquals(result.version, ["8.6.0"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - v prefix with slim suffix", () => {
  const result = parseTag("v1.2.3-slim");
  assertEquals(result.version, ["1.2.3"]);
  assertEquals(result.variantKey, "v*-slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - v prefix with complex suffix", () => {
  const result = parseTag("v3.6.8-nanoserver-ltsc2022");
  assertEquals(result.version, ["3.6.8"]);
  assertEquals(result.variantKey, "v*-nanoserver-ltsc2022");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - gradle jdk21-corretto-al2023", () => {
  const result = parseTag("9.3.1-jdk21-corretto-al2023");
  assertEquals(result.version, ["9.3.1"]);
  assertEquals(result.variantKey, "*-jdk21-corretto-al2023");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - gradle jdk25-corretto", () => {
  const result = parseTag("9.3.1-jdk25-corretto");
  assertEquals(result.version, ["9.3.1"]);
  assertEquals(result.variantKey, "*-jdk25-corretto");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - percona with build number", () => {
  const result = parseTag("8.0.44-35");
  assertEquals(result.version, ["8.0.44-35"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - percona with build number and centos", () => {
  const result = parseTag("8.0.44-35-centos");
  assertEquals(result.version, ["8.0.44-35"]);
  assertEquals(result.variantKey, "*-centos");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - nginx alpine3.23-perl", () => {
  const result = parseTag("1.28.2-alpine3.23-perl");
  assertEquals(result.version, ["1.28.2"]);
  assertEquals(result.variantKey, "*-alpine3.23-perl");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - nginx trixie-perl", () => {
  const result = parseTag("1.28.2-trixie-perl");
  assertEquals(result.version, ["1.28.2"]);
  assertEquals(result.variantKey, "*-trixie-perl");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - node bookworm-slim", () => {
  const result = parseTag("25.6.1-bookworm-slim");
  assertEquals(result.version, ["25.6.1"]);
  assertEquals(result.variantKey, "*-bookworm-slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - debian slim", () => {
  const result = parseTag("13.3-slim");
  assertEquals(result.version, ["13.3"]);
  assertEquals(result.variantKey, "*-slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - maven amazoncorretto", () => {
  const result = parseTag("3.9.12-amazoncorretto-25");
  assertEquals(result.version, ["3.9.12"]);
  assertEquals(result.variantKey, "*-amazoncorretto-25");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - aws-fluent-bit date version", () => {
  const result = parseTag("2.34.3.20260209");
  assertEquals(result.version, ["2.34.3.20260209"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - eclipse-temurin java style", () => {
  const result = parseTag("8u482-b08-jre");
  assertEquals(result.version, ["8u482-b08"]);
  assertEquals(result.variantKey, "*-jre");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - eclipse-temurin java style no suffix", () => {
  const result = parseTag("8u482-b08");
  assertEquals(result.version, ["8u482-b08"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - prerelease rc1", () => {
  const result = parseTag("1.0.0-rc1");
  assertEquals(result.version, ["1.0.0-rc1"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - prerelease rc1 with suffix", () => {
  const result = parseTag("1.0.0-rc1-alpine");
  assertEquals(result.version, ["1.0.0-rc1"]);
  assertEquals(result.variantKey, "*-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - prerelease beta2 with suffix", () => {
  const result = parseTag("1.0.0-beta2-slim");
  assertEquals(result.version, ["1.0.0-beta2"]);
  assertEquals(result.variantKey, "*-slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - maven rc with amazoncorretto", () => {
  const result = parseTag("4.0.0-rc-5-amazoncorretto-25");
  assertEquals(result.version, ["4.0.0-rc-5"]);
  assertEquals(result.variantKey, "*-amazoncorretto-25");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - floating alpine", () => {
  const result = parseTag("alpine");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "alpine");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating latest", () => {
  const result = parseTag("latest");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "latest");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating bookworm-slim", () => {
  const result = parseTag("bookworm-slim");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "bookworm-slim");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating stable-alpine3.23", () => {
  const result = parseTag("stable-alpine3.23");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "stable-alpine3.23");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating stable-trixie", () => {
  const result = parseTag("stable-trixie");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "stable-trixie");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating stable", () => {
  const result = parseTag("stable");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "stable");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating mainline", () => {
  const result = parseTag("mainline");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "mainline");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating lts-alpine3.23", () => {
  const result = parseTag("lts-alpine3.23");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "lts-alpine3.23");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating current-alpine3.23", () => {
  const result = parseTag("current-alpine3.23");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "current-alpine3.23");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating krypton-alpine3.22", () => {
  const result = parseTag("krypton-alpine3.22");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "krypton-alpine3.22");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - versioned enterprise-7.6.9", () => {
  const result = parseTag("enterprise-7.6.9");
  assertEquals(result.version, ["7.6.9"]);
  assertEquals(result.variantKey, "enterprise-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - versioned ps-8.0.44-35", () => {
  const result = parseTag("ps-8.0.44-35");
  assertEquals(result.version, ["8.0.44-35"]);
  assertEquals(result.variantKey, "ps-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - versioned psmdb-8.0.17", () => {
  const result = parseTag("psmdb-8.0.17");
  assertEquals(result.version, ["8.0.17"]);
  assertEquals(result.variantKey, "psmdb-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - versioned community-8.0.0", () => {
  const result = parseTag("community-8.0.0");
  assertEquals(result.version, ["8.0.0"]);
  assertEquals(result.variantKey, "community-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - floating php8.4-fpm-alpine3.22", () => {
  const result = parseTag("php8.4-fpm-alpine3.22");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "php8.4-fpm-alpine3.22");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating centos7.9.2009", () => {
  const result = parseTag("centos7.9.2009");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "centos7.9.2009");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - versioned trixie-20260202-slim", () => {
  const result = parseTag("trixie-20260202-slim");
  assertEquals(result.version, ["20260202"]);
  assertEquals(result.variantKey, "trixie-*-slim");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - floating trixie", () => {
  const result = parseTag("trixie");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "trixie");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating rc1", () => {
  const result = parseTag("rc1");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "rc1");
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

  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "8.6.0");
  assertEquals(defaultVariant?.older.length, 1);
  assertEquals(defaultVariant?.older[0].original, "8.2.4");
  assertEquals(defaultVariant?.floating.length, 1);
  assertEquals(defaultVariant?.floating[0].original, "latest");

  const alpine3_23 = variants.find((v) => v.variantKey === "*-alpine3.23");
  assertEquals(alpine3_23?.latest?.original, "8.6.0-alpine3.23");
  assertEquals(alpine3_23?.older.length, 0);

  const alpine3_22 = variants.find((v) => v.variantKey === "*-alpine3.22");
  assertEquals(alpine3_22?.latest?.original, "8.2.4-alpine3.22");

  const alpine = variants.find((v) => v.variantKey === "*-alpine");
  assertEquals(alpine?.latest?.original, "8.6.0-alpine");
  assertEquals(alpine?.older.length, 1);
  assertEquals(alpine?.older[0].original, "8.2.4-alpine");
  assertEquals(alpine?.floating.length, 1);
  assertEquals(alpine?.floating[0].original, "alpine");

  const trixie = variants.find((v) => v.variantKey === "*-trixie");
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

  const jdk21Al2023 = variants.find(
    (v) => v.variantKey === "*-jdk21-corretto-al2023",
  );
  assertEquals(jdk21Al2023?.latest?.original, "9.3.1-jdk21-corretto-al2023");
  assertEquals(jdk21Al2023?.floating.length, 1);
  assertEquals(jdk21Al2023?.floating[0].original, "jdk21-corretto-al2023");

  const jdk21 = variants.find((v) => v.variantKey === "*-jdk21-corretto");
  assertEquals(jdk21?.latest?.original, "9.3.1-jdk21-corretto");
  assertEquals(jdk21?.floating.length, 1);
  assertEquals(jdk21?.floating[0].original, "jdk21-corretto");

  const jdk17Al2023 = variants.find(
    (v) => v.variantKey === "*-jdk17-corretto-al2023",
  );
  assertEquals(jdk17Al2023?.latest?.original, "9.3.1-jdk17-corretto-al2023");
  assertEquals(jdk17Al2023?.floating.length, 0);

  const jdk17 = variants.find((v) => v.variantKey === "*-jdk17-corretto");
  assertEquals(jdk17?.latest?.original, "9.3.1-jdk17-corretto");

  const defaultVariant = variants.find((v) => v.variantKey === "*");
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

  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "8.0.44-35");
  assertEquals(defaultVariant?.older.length, 2);

  const psVariant = variants.find((v) => v.variantKey === "ps-*");
  assertEquals(psVariant?.latest?.original, "ps-8.0.44-35");
  assertEquals(psVariant?.older.length, 1);
  assertEquals(psVariant?.older[0].original, "ps-8.0.43-34");
});

Deno.test("parseTag - version- prefix with date", () => {
  const result = parseTag("version-20201102.25-unstable");
  assertEquals(result.version, ["20201102.25-unstable"]);
  assertEquals(result.variantKey, "version-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch version- prefix with date", () => {
  const result = parseTag("amd64-version-20201102.25-unstable");
  assertEquals(result.version, ["20201102.25-unstable"]);
  assertEquals(result.variantKey, "amd64-version-*");
  assertEquals(result.isFloating, false);
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
  const images = findImages(content, "test.nix");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/postgres");
  assertEquals(images[0].tag, "18.1-alpine");
});

Deno.test("findImages extracts FROM directive with tag", () => {
  const content = "FROM node:20-alpine";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/node");
  assertEquals(images[0].tag, "20-alpine");
  assertEquals(images[0].hasExplicitTag, true);
});

Deno.test("findImages extracts FROM directive without tag", () => {
  const content = "FROM nginx";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "docker.io");
  assertEquals(images[0].repository, "library/nginx");
  assertEquals(images[0].tag, "latest");
  assertEquals(images[0].hasExplicitTag, false);
});

Deno.test("findImages extracts FROM directive with AS stage", () => {
  const content = "FROM node:20-alpine AS builder";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 1);
  assertEquals(images[0].repository, "library/node");
  assertEquals(images[0].tag, "20-alpine");
});

Deno.test("findImages extracts FROM directive with --platform flag", () => {
  const content = "FROM --platform=linux/amd64 node:20-alpine";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 1);
  assertEquals(images[0].repository, "library/node");
  assertEquals(images[0].tag, "20-alpine");
});

Deno.test("findImages extracts FROM directive with --platform and AS", () => {
  const content = "FROM --platform=linux/arm64 golang:1.22 AS builder";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 1);
  assertEquals(images[0].repository, "library/golang");
  assertEquals(images[0].tag, "1.22");
});

Deno.test("findImages skips FROM scratch", () => {
  const content = "FROM scratch";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 0);
});

Deno.test("findImages extracts FROM with fully qualified image", () => {
  const content = "FROM ghcr.io/linuxserver/baseimage-ubuntu:jammy";
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 1);
  assertEquals(images[0].registry, "ghcr.io");
  assertEquals(images[0].repository, "linuxserver/baseimage-ubuntu");
  assertEquals(images[0].tag, "jammy");
});

Deno.test("findImages extracts multiple FROM directives in multi-stage build", () => {
  const content = `FROM node:20-alpine AS builder
FROM nginx:alpine
FROM scratch AS final`;
  const images = findImages(content, "Dockerfile");
  assertEquals(images.length, 2);
  assertEquals(images[0].repository, "library/node");
  assertEquals(images[0].tag, "20-alpine");
  assertEquals(images[1].repository, "library/nginx");
  assertEquals(images[1].tag, "alpine");
});

Deno.test("findImages FROM escaper preserves original format", () => {
  const content = "FROM node:20-alpine";
  const images = findImages(content, "Dockerfile");
  assertEquals(images[0].escaper?.("22-alpine"), "node:22-alpine");
});

Deno.test("parseTag - milestone M02 no suffix", () => {
  const result = parseTag("8.0-M02");
  assertEquals(result.version, ["8.0-M02"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M02 with alpine suffix", () => {
  const result = parseTag("8.0-M02-alpine");
  assertEquals(result.version, ["8.0-M02"]);
  assertEquals(result.variantKey, "*-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M02 with alpine3.21 suffix", () => {
  const result = parseTag("8.0-M02-alpine3.21");
  assertEquals(result.version, ["8.0-M02"]);
  assertEquals(result.variantKey, "*-alpine3.21");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M02 with bookworm suffix", () => {
  const result = parseTag("8.0-M02-bookworm");
  assertEquals(result.version, ["8.0-M02"]);
  assertEquals(result.variantKey, "*-bookworm");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - milestone M1 no suffix", () => {
  const result = parseTag("5.0-M1");
  assertEquals(result.version, ["5.0-M1"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash no suffix", () => {
  const result = parseTag("1.2.3-35-g3a810da");
  assertEquals(result.version, ["1.2.3-35-g3a810da"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash with alpine suffix", () => {
  const result = parseTag("1.2.3-35-g3a810da-alpine");
  assertEquals(result.version, ["1.2.3-35-g3a810da"]);
  assertEquals(result.variantKey, "*-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash only", () => {
  const result = parseTag("1.2.3-a1b2c3d4");
  assertEquals(result.version, ["1.2.3-a1b2c3d4"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - minimal suffix not hex", () => {
  const result = parseTag("8.0-minimal");
  assertEquals(result.version, ["8.0"]);
  assertEquals(result.variantKey, "*-minimal");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - alpine suffix not hex", () => {
  const result = parseTag("1.2.3-alpine");
  assertEquals(result.version, ["1.2.3"]);
  assertEquals(result.variantKey, "*-alpine");
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - milestone tags merge into correct variant", () => {
  const tags = ["8.0-M02-alpine", "8.0-M01-alpine"];
  const variants = groupByVariant(tags);
  const alpine = variants.find((v) => v.variantKey === "*-alpine");
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
  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "8.0");
  assertEquals(defaultVariant?.older.length, 2);
  assertEquals(defaultVariant?.older[0].original, "8.0-M02");
  assertEquals(defaultVariant?.older[1].original, "8.0-M01");
});

Deno.test("parseTag - build counter ig446", () => {
  const result = parseTag("v2.5.6-ig446");
  assertEquals(result.version, ["2.5.6-ig446"]);
  assertEquals(result.variantKey, "v*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - build counter ls189", () => {
  const result = parseTag("v1.0.0-ls189");
  assertEquals(result.version, ["1.0.0-ls189"]);
  assertEquals(result.variantKey, "v*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - build counter with suffix", () => {
  const result = parseTag("v2.5.6-ig446-noml");
  assertEquals(result.version, ["2.5.6-ig446"]);
  assertEquals(result.variantKey, "v*-noml");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix amd64", () => {
  const result = parseTag("amd64-2.5.6");
  assertEquals(result.version, ["2.5.6"]);
  assertEquals(result.variantKey, "amd64-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix with suffix", () => {
  const result = parseTag("arm64v8-2.5.6-noml");
  assertEquals(result.version, ["2.5.6"]);
  assertEquals(result.variantKey, "arm64v8-*-noml");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix with v and build counter", () => {
  const result = parseTag("amd64-v2.5.6-ig446");
  assertEquals(result.version, ["2.5.6-ig446"]);
  assertEquals(result.variantKey, "amd64-v*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - version-v prefix", () => {
  const result = parseTag("version-v2.5.6");
  assertEquals(result.version, ["2.5.6"]);
  assertEquals(result.variantKey, "version-v*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - arch prefix with version-v", () => {
  const result = parseTag("arm64v8-version-v2.5.6");
  assertEquals(result.version, ["2.5.6"]);
  assertEquals(result.variantKey, "arm64v8-version-v*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - floating arch-prefixed", () => {
  const result = parseTag("amd64-noml");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "amd64-noml");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - floating arm64v8-latest", () => {
  const result = parseTag("arm64v8-latest");
  assertEquals(result.version, []);
  assertEquals(result.variantKey, "arm64v8-latest");
  assertEquals(result.isFloating, true);
});

Deno.test("parseTag - enterprise now versioned", () => {
  const result = parseTag("enterprise-7.6.9");
  assertEquals(result.version, ["7.6.9"]);
  assertEquals(result.variantKey, "enterprise-*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - ps now versioned", () => {
  const result = parseTag("ps-8.0.44-35");
  assertEquals(result.version, ["8.0.44-35"]);
  assertEquals(result.variantKey, "ps-*");
  assertEquals(result.isFloating, false);
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

  const suffixNoml = variants.find((v) => v.variantKey === "*-noml");
  assertEquals(suffixNoml?.latest?.original, "2.5.6-noml");
  assertEquals(suffixNoml?.older.length, 1);
  assertEquals(suffixNoml?.older[0].original, "2.4.1-noml");

  const prefixNoml = variants.find((v) => v.variantKey === "noml-v*");
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

  const amd64Variant = variants.find((v) => v.variantKey === "amd64-*");
  assertEquals(amd64Variant?.latest?.original, "amd64-2.5.6");

  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "2.5.6");
});

Deno.test("groupByVariant - v-prefix separate group", () => {
  const tags = ["v1.2.3-alpine", "1.3.0-alpine"];
  const variants = groupByVariant(tags);

  const vAlpine = variants.find((v) => v.variantKey === "v*-alpine");
  assertEquals(vAlpine?.latest?.original, "v1.2.3-alpine");

  const alpine = variants.find((v) => v.variantKey === "*-alpine");
  assertEquals(alpine?.latest?.original, "1.3.0-alpine");
});

Deno.test("findMatchingVariant - variantKey match", () => {
  const tags = ["v1.2.3-alpine", "1.3.0-alpine"];
  const variants = groupByVariant(tags);

  const vMatch = findMatchingVariant("v1.2.3-alpine", variants);
  assertEquals(vMatch?.variantKey, "v*-alpine");

  const noPrefixMatch = findMatchingVariant("1.3.0-alpine", variants);
  assertEquals(noPrefixMatch?.variantKey, "*-alpine");
});

Deno.test("parseTag - git hash build ls37", () => {
  const result = parseTag("b3d6b63f-ls37");
  assertEquals(result.version, ["b3d6b63f-ls37"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash build ig94", () => {
  const result = parseTag("289c0610-ig94");
  assertEquals(result.version, ["289c0610-ig94"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - git hash build with arch prefix", () => {
  const result = parseTag("amd64-a1b2c3d4-ls50");
  assertEquals(result.version, ["a1b2c3d4-ls50"]);
  assertEquals(result.variantKey, "amd64-*");
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - git hash build tags", () => {
  const tags = ["b3d6b63f-ls37", "a1c2d3e4-ls45", "latest"];
  const variants = groupByVariant(tags);
  const defaultVariant = variants.find((v) => v.variantKey === "*");
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
  const floatingTags = new Set(["v4"]);
  const variants = groupByVariant(tags, undefined, floatingTags);
  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "4.0.0");
  assertEquals(defaultVariant?.floating.length, 1);
  assertEquals(defaultVariant?.floating[0].original, "v4");
});

Deno.test("groupByVariant - lsio develop nightly floating", () => {
  const tags = ["develop", "nightly", "3.0.0"];
  const floatingTags = new Set(["develop", "nightly"]);
  const variants = groupByVariant(tags, undefined, floatingTags);
  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "3.0.0");
  assertEquals(defaultVariant?.floating.length, 2);
  const floatingNames = defaultVariant?.floating.map((t) => t.original) ?? [];
  assertEquals(floatingNames.includes("develop"), true);
  assertEquals(floatingNames.includes("nightly"), true);
});

Deno.test("groupByVariant - non-lsio v4 versioned", () => {
  const tags = ["v4", "v3"];
  const variants = groupByVariant(tags);
  const vVariant = variants.find((v) => v.variantKey === "v*");
  assertEquals(vVariant?.latest?.original, "v4");
  assertEquals(vVariant?.older.length, 1);
  assertEquals(vVariant?.older[0].original, "v3");
  assertEquals(vVariant?.floating.length, 0);
});

Deno.test("groupByVariant - nginx 1.9 vs 1.29 ordering", () => {
  const tags = [
    "1.9-alpine",
    "1.8-alpine",
    "1.29.5-alpine",
    "1.29.4-alpine",
    "1.29-alpine",
    "1.28-alpine",
    "1.27-alpine",
  ];
  const variants = groupByVariant(tags);
  const alpineVariant = variants.find((v) => v.variantKey === "*-alpine");
  assertEquals(alpineVariant?.latest?.original, "1.29.5-alpine");
  const olderTags = alpineVariant?.older.map((t) => t.original) ?? [];
  assertEquals(
    olderTags.indexOf("1.29.4-alpine") < olderTags.indexOf("1.29-alpine"),
    true,
  );
  assertEquals(
    olderTags.indexOf("1.29-alpine") < olderTags.indexOf("1.28-alpine"),
    true,
  );
  assertEquals(
    olderTags.indexOf("1.9-alpine") < olderTags.indexOf("1.8-alpine"),
    true,
  );
});

Deno.test("parseTag - unstable pre-release", () => {
  const result = parseTag("10.10.7-unstable");
  assertEquals(result.version, ["10.10.7-unstable"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - edition build ee.0", () => {
  const result = parseTag("17.8.0-ee.0");
  assertEquals(result.version, ["17.8.0", "0"]);
  assertEquals(result.variantKey, "*-ee.*");
  assertEquals(result.isFloating, false);
  assertEquals(result.semver, true);
});

Deno.test("parseTag - edition build ce.1", () => {
  const result = parseTag("17.8.0-ce.1");
  assertEquals(result.version, ["17.8.0", "1"]);
  assertEquals(result.variantKey, "*-ce.*");
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - 2.0-rc.1 not matched by edition regex", () => {
  const result = parseTag("2.0-rc.1");
  assertEquals(result.version, ["2.0-rc.1"]);
  assertEquals(result.variantKey, "*");
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - gitlab ee/ce tags", () => {
  const tags = [
    "17.8.0-ee.0",
    "17.7.0-ee.0",
    "17.8.0-ce.0",
    "17.7.0-ce.0",
  ];
  const variants = groupByVariant(tags);

  const ee = variants.find((v) => v.variantKey === "*-ee.*");
  assertEquals(ee?.latest?.original, "17.8.0-ee.0");
  assertEquals(ee?.older.length, 1);
  assertEquals(ee?.older[0].original, "17.7.0-ee.0");

  const ce = variants.find((v) => v.variantKey === "*-ce.*");
  assertEquals(ce?.latest?.original, "17.8.0-ce.0");
  assertEquals(ce?.older.length, 1);
  assertEquals(ce?.older[0].original, "17.7.0-ce.0");
});

Deno.test("findBestUpgrade - gitlab edition upgrade", () => {
  const tags = [
    "17.8.0-ee.0",
    "17.7.0-ee.0",
    "17.8.0-ce.0",
    "17.7.0-ce.0",
  ];
  const variants = groupByVariant(tags);

  const result = findBestUpgrade("17.7.0-ee.0", variants);
  assertEquals(result, "17.8.0-ee.0");

  const ceResult = findBestUpgrade("17.7.0-ce.0", variants);
  assertEquals(ceResult, "17.8.0-ce.0");
});

Deno.test("findBestUpgrade - edition build counter upgrade", () => {
  const tags = ["17.8.0-ee.1", "17.8.0-ee.0"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("17.8.0-ee.0", variants);
  assertEquals(result, "17.8.0-ee.1");
});

Deno.test("parseTag - lsio focal hash build", () => {
  const result = parseTag("focal-3cc49244-ls21");
  assertEquals(result.variantKey, "focal-*");
  assertEquals(result.version, ["3cc49244-ls21"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - lsio jammy hash build", () => {
  const result = parseTag("jammy-3fec435e-ls1");
  assertEquals(result.variantKey, "jammy-*");
  assertEquals(result.version, ["3fec435e-ls1"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - lsio bionic hash build", () => {
  const result = parseTag("bionic-d44ccdfe-ls6");
  assertEquals(result.variantKey, "bionic-*");
  assertEquals(result.version, ["d44ccdfe-ls6"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - lsio arch focal hash build", () => {
  const result = parseTag("amd64-focal-3cc49244-ls21");
  assertEquals(result.variantKey, "amd64-focal-*");
  assertEquals(result.version, ["3cc49244-ls21"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - lsio version hash", () => {
  const result = parseTag("version-a7da6fde");
  assertEquals(result.variantKey, "version-*");
  assertEquals(result.version, ["a7da6fde"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - lsio arch version hash", () => {
  const result = parseTag("amd64-version-a7da6fde");
  assertEquals(result.variantKey, "amd64-version-*");
  assertEquals(result.version, ["a7da6fde"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - lsio focal version hash", () => {
  const result = parseTag("focal-version-3cc49244");
  assertEquals(result.variantKey, "focal-version-*");
  assertEquals(result.version, ["3cc49244"]);
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - lsio codename variants", () => {
  const tags = [
    "focal-3cc49244-ls21",
    "focal-a1b2c3d4-ls20",
    "jammy-5fec435e-ls10",
    "jammy-4fec435e-ls9",
    "bionic-d44ccdfe-ls6",
    "latest",
  ];
  const variants = groupByVariant(tags);

  const focalVariant = variants.find((v) => v.variantKey === "focal-*");
  assertEquals(focalVariant?.latest?.original, "focal-3cc49244-ls21");
  assertEquals(focalVariant?.older.length, 1);
  assertEquals(focalVariant?.older[0].original, "focal-a1b2c3d4-ls20");

  const jammyVariant = variants.find((v) => v.variantKey === "jammy-*");
  assertEquals(jammyVariant?.latest?.original, "jammy-5fec435e-ls10");
  assertEquals(jammyVariant?.older.length, 1);
  assertEquals(jammyVariant?.older[0].original, "jammy-4fec435e-ls9");

  const bionicVariant = variants.find((v) => v.variantKey === "bionic-*");
  assertEquals(bionicVariant?.latest?.original, "bionic-d44ccdfe-ls6");
});

Deno.test("findBestUpgrade - lsio focal variant", () => {
  const tags = ["focal-3cc49244-ls21", "focal-a1b2c3d4-ls20", "focal-latest"];
  const variants = groupByVariant(tags);
  const result = findBestUpgrade("focal-a1b2c3d4-ls20", variants);
  assertEquals(result, "focal-3cc49244-ls21");
});

Deno.test("parseTag - ps-8.0.44-35 now versioned via dash-digit", () => {
  const result = parseTag("ps-8.0.44-35");
  assertEquals(result.variantKey, "ps-*");
  assertEquals(result.version, ["8.0.44-35"]);
  assertEquals(result.isFloating, false);
});

Deno.test("parseTag - trixie-20260202-slim now versioned via dash-digit", () => {
  const result = parseTag("trixie-20260202-slim");
  assertEquals(result.variantKey, "trixie-*-slim");
  assertEquals(result.version, ["20260202"]);
  assertEquals(result.isFloating, false);
});

Deno.test("groupByVariant - digestMatches for floating tag", () => {
  const tags = ["1.0.0", "0.9.0", "latest"];
  const digestMap = new Map<string, string>([
    ["1.0.0", "sha256:abc123"],
    ["latest", "sha256:abc123"],
    ["0.9.0", "sha256:def456"],
  ]);
  const variants = groupByVariant(tags, digestMap);

  const defaultVariant = variants.find((v) => v.variantKey === "*");
  assertEquals(defaultVariant?.latest?.original, "1.0.0");
  assertEquals(defaultVariant?.floating.length, 1);
  assertEquals(defaultVariant?.floating[0].original, "latest");
  assertEquals(defaultVariant?.digestMatches?.get("1.0.0"), "latest");
  assertEquals(defaultVariant?.digestMatches?.has("0.9.0"), false);
});

Deno.test("groupByVariant - no digestMatches when multiple floatings match", () => {
  const tags = ["1.0.0", "latest", "stable"];
  const digestMap = new Map<string, string>([
    ["1.0.0", "sha256:abc123"],
    ["latest", "sha256:abc123"],
    ["stable", "sha256:abc123"],
  ]);
  const variants = groupByVariant(tags, digestMap);

  const defaultVariant = variants.find((v) => v.variantKey === "*");
  const hasMatch = defaultVariant?.digestMatches?.has("1.0.0") ?? false;
  assertEquals(hasMatch, false);
});

Deno.test("groupByVariant - floating tags selectable in picker", () => {
  const tags = ["1.0.0-alpine", "0.9.0-alpine", "alpine"];
  const digestMap = new Map<string, string>([
    ["1.0.0-alpine", "sha256:aaa"],
    ["alpine", "sha256:aaa"],
  ]);
  const variants = groupByVariant(tags, digestMap);

  const alpineVariant = variants.find((v) => v.variantKey === "*-alpine");
  assertEquals(alpineVariant?.latest?.original, "1.0.0-alpine");
  assertEquals(alpineVariant?.floating.length, 1);
  assertEquals(alpineVariant?.floating[0].original, "alpine");
  assertEquals(alpineVariant?.digestMatches?.get("1.0.0-alpine"), "alpine");
});
