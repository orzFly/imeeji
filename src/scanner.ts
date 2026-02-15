import ignoreWalk from "ignore-walk";
import ignore from "ignore";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const DEFAULT_INCLUDES = [
  "*.nix",
  "*.yaml",
  "*.yml",
  "docker-compose*",
  "Dockerfile*",
  "*.service",
  "*.container",
];

const DEFAULT_EXCLUDES = [
  ".git",
  "node_modules",
  ".cache",
  "dist",
  "build",
  "target",
  "__pycache__",
  ".venv",
];

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
  excludeDefault: boolean;
  includeIgnored: boolean;
}

export interface ScannedFile {
  path: string;
  content: string;
  hash: string;
}

export async function scanPaths(
  inputPaths: string[],
  options: ScanOptions,
): Promise<ScannedFile[]> {
  if (options.excludeDefault && !options.include?.length) {
    return [];
  }

  const results: ScannedFile[] = [];
  const seenInodes = new Set<bigint>();

  for (const inputPath of inputPaths) {
    const resolved = resolve(inputPath);
    let s;
    try {
      s = await stat(resolved);
    } catch (e) {
      console.warn(
        `Warning: Cannot access ${resolved}: ${(e as Error).message}`,
      );
      continue;
    }

    if (s.isFile()) {
      const file = await scanFile(resolved, seenInodes);
      if (file) results.push(file);
    } else if (s.isDirectory()) {
      const files = await walkDirectory(resolved, options);
      for (const filePath of files) {
        const file = await scanFile(filePath, seenInodes);
        if (file) results.push(file);
      }
    }
  }

  return results;
}

async function walkDirectory(
  rootDir: string,
  options: ScanOptions,
): Promise<string[]> {
  const results: string[] = [];

  const repoRoot = options.includeIgnored
    ? rootDir
    : await findRepoRoot(rootDir);

  const parentIgnore = options.includeIgnored
    ? null
    : await buildParentIgnore(rootDir, repoRoot);

  const files = await ignoreWalk({
    path: rootDir,
    ignoreFiles: options.includeIgnored ? [] : [".gitignore"],
    follow: true,
  });

  for (const relPath of files) {
    if (parentIgnore?.ignores(relPath)) continue;

    if (!matchesPatterns(basename(relPath), relPath, options)) continue;

    results.push(join(rootDir, relPath));
  }

  return results;
}

async function findRepoRoot(dir: string): Promise<string> {
  let current = dir;
  let lastDevice: number | null = null;

  while (true) {
    let s;
    try {
      s = await stat(current);
    } catch {
      break;
    }

    if (lastDevice !== null && s.dev !== lastDevice) break;
    lastDevice = s.dev;

    const gitPath = join(current, ".git");
    try {
      await stat(gitPath);
      return current;
    } catch {
      // .git not found, continue searching
    }

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return dir;
}

async function buildParentIgnore(
  inputDir: string,
  repoRoot: string,
): Promise<ReturnType<typeof ignore> | null> {
  const gitignores: string[] = [];
  let current = repoRoot;

  while (true) {
    if (current === inputDir) break;

    const gitignorePath = join(current, ".gitignore");
    try {
      gitignores.push(await readFile(gitignorePath, "utf-8"));
    } catch {
      // gitignore not found or not readable
    }

    const rel = relative(current, inputDir);
    const parts = rel.split("/");
    if (parts.length === 0 || parts[0] === "") break;

    current = join(current, parts[0]);
  }

  if (gitignores.length === 0) return null;

  const ig = ignore();
  for (const content of gitignores) {
    ig.add(content);
  }
  return ig;
}

async function scanFile(
  path: string,
  seenInodes: Set<bigint>,
): Promise<ScannedFile | null> {
  let s;
  try {
    s = await stat(path);
  } catch (e) {
    console.warn(`Warning: Cannot stat ${path}: ${(e as Error).message}`);
    return null;
  }

  const inode = BigInt(s.ino);
  if (seenInodes.has(inode)) return null;
  seenInodes.add(inode);

  let content: string;
  try {
    content = await readFile(path, "utf-8");
  } catch (e) {
    console.warn(`Warning: Cannot read ${path}: ${(e as Error).message}`);
    return null;
  }

  if (isBinary(content)) return null;

  const hash = createHash("sha256").update(content).digest("hex");
  return { path, content, hash };
}

function isBinary(content: string): boolean {
  return content.includes("\x00");
}

function matchesPatterns(
  filename: string,
  relPath: string,
  options: ScanOptions,
): boolean {
  const parts = relPath.split(/[/\\]/);
  if (parts.some((p) => DEFAULT_EXCLUDES.includes(p))) return false;

  if (options.exclude?.some((p) => matchGlob(relPath, p))) return false;

  const patterns = options.excludeDefault
    ? (options.include ?? [])
    : [...DEFAULT_INCLUDES, ...(options.include ?? [])];

  return patterns.some((p) => matchGlob(filename, p));
}

function matchGlob(path: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
  return regex.test(path);
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
