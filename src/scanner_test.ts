import { assert, assertEquals } from "@std/assert";
import { hashContent, scanPaths } from "./scanner.ts";
import type { ScanOptions } from "./scanner.ts";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function withTempDir<T>(
  fn: (dir: string) => Promise<T>,
): Promise<T> {
  const dir = await Deno.makeTempDir();
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const defaultOptions: ScanOptions = {
  excludeDefault: false,
  includeIgnored: true,
};

Deno.test("scanPaths: single file", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "config.nix");
    await writeFile(file, "content");
    const result = await scanPaths([file], defaultOptions);
    assertEquals(result.length, 1);
    assertEquals(result[0].path, file);
    assertEquals(result[0].content, "content");
  });
});

Deno.test("scanPaths: multiple files", async () => {
  await withTempDir(async (dir) => {
    const file1 = join(dir, "config.nix");
    const file2 = join(dir, "compose.yaml");
    await writeFile(file1, "content1");
    await writeFile(file2, "content2");
    const result = await scanPaths([file1, file2], defaultOptions);
    assertEquals(result.length, 2);
    const paths = result.map((f) => f.path);
    assert(paths.includes(file1));
    assert(paths.includes(file2));
  });
});

Deno.test("scanPaths: directory recursive", async () => {
  await withTempDir(async (dir) => {
    const subdir = join(dir, "subdir");
    await mkdir(subdir);
    await writeFile(join(dir, "config.nix"), "root");
    await writeFile(join(subdir, "compose.yaml"), "sub");
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 2);
  });
});

Deno.test("scanPaths: default include patterns", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(dir, "compose.yaml"), "yaml");
    await writeFile(join(dir, "Dockerfile"), "docker");
    await writeFile(join(dir, "test.txt"), "text");
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 3);
    const names = result.map((f) => f.path.split("/").pop());
    assert(names.includes("config.nix"));
    assert(names.includes("compose.yaml"));
    assert(names.includes("Dockerfile"));
    assert(!names.includes("test.txt"));
  });
});

Deno.test("scanPaths: --include adds to defaults", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(dir, "custom.json"), "json");
    const result = await scanPaths([dir], {
      ...defaultOptions,
      include: ["*.json"],
    });
    assertEquals(result.length, 2);
    const names = result.map((f) => f.path.split("/").pop());
    assert(names.includes("config.nix"));
    assert(names.includes("custom.json"));
  });
});

Deno.test("scanPaths: --exclude-default with no include returns empty", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "nix");
    const result = await scanPaths([dir], {
      excludeDefault: true,
      includeIgnored: true,
    });
    assertEquals(result.length, 0);
  });
});

Deno.test("scanPaths: --exclude-default with include uses custom only", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(dir, "custom.json"), "json");
    const result = await scanPaths([dir], {
      excludeDefault: true,
      includeIgnored: true,
      include: ["*.json"],
    });
    assertEquals(result.length, 1);
    assertEquals(result[0].path.split("/").pop(), "custom.json");
  });
});

Deno.test("scanPaths: --exclude pattern", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(dir, "compose.yaml"), "yaml");
    const result = await scanPaths([dir], {
      ...defaultOptions,
      exclude: ["*.yaml"],
    });
    assertEquals(result.length, 1);
    assertEquals(result[0].path.split("/").pop(), "config.nix");
  });
});

Deno.test("scanPaths: default excludes (node_modules)", async () => {
  await withTempDir(async (dir) => {
    const nodeModules = join(dir, "node_modules");
    await mkdir(nodeModules);
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(nodeModules, "package.json"), "pkg");
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 1);
    assertEquals(result[0].path.split("/").pop(), "config.nix");
  });
});

Deno.test("scanPaths: gitignore respected", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, ".gitignore"), "*.tmp\n");
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(dir, "ignored.tmp"), "tmp");
    const result = await scanPaths([dir], {
      excludeDefault: false,
      includeIgnored: false,
    });
    assertEquals(result.length, 1);
    assertEquals(result[0].path.split("/").pop(), "config.nix");
  });
});

Deno.test("scanPaths: --include-ignored ignores gitignore", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, ".gitignore"), "ignored.nix\n");
    await writeFile(join(dir, "config.nix"), "nix");
    await writeFile(join(dir, "ignored.nix"), "ignored");
    const result = await scanPaths([dir], {
      excludeDefault: false,
      includeIgnored: true,
    });
    assertEquals(result.length, 2);
  });
});

Deno.test("scanPaths: symlink to file followed", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "nix");
    await symlink(join(dir, "config.nix"), join(dir, "link.nix"));
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 1);
  });
});

Deno.test("scanPaths: symlink to directory followed", async () => {
  await withTempDir(async (dir) => {
    const subdir = join(dir, "real");
    await mkdir(subdir);
    await writeFile(join(subdir, "config.nix"), "nix");
    await symlink(subdir, join(dir, "link"), "dir");
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 1);
  });
});

Deno.test("scanPaths: binary file skipped", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "config.nix"), "text content");
    const binaryContent = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    await Deno.writeFile(join(dir, "binary.nix"), binaryContent);
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 1);
    assertEquals(result[0].path.split("/").pop(), "config.nix");
  });
});

Deno.test("scanPaths: empty directory returns empty", async () => {
  await withTempDir(async (dir) => {
    const result = await scanPaths([dir], defaultOptions);
    assertEquals(result.length, 0);
  });
});

Deno.test("hashContent: consistent hash", () => {
  const content = "test content";
  const hash1 = hashContent(content);
  const hash2 = hashContent(content);
  assertEquals(hash1, hash2);
  assertEquals(hash1.length, 64);
});

Deno.test("hashContent: different content different hash", () => {
  const hash1 = hashContent("content1");
  const hash2 = hashContent("content2");
  assert(hash1 !== hash2);
});

Deno.test("hashContent: empty content", () => {
  const hash = hashContent("");
  assertEquals(hash.length, 64);
});

Deno.test("scanPaths: file hash matches hashContent", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "config.nix");
    const content = "test content for hash";
    await writeFile(file, content);
    const result = await scanPaths([file], defaultOptions);
    assertEquals(result.length, 1);
    assertEquals(result[0].hash, hashContent(content));
  });
});

Deno.test("scanPaths: non-existent file skipped with warning", async () => {
  await withTempDir(async (dir) => {
    const result = await scanPaths(
      [join(dir, "nonexistent.nix")],
      defaultOptions,
    );
    assertEquals(result.length, 0);
  });
});
