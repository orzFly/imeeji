# AGENTS.md

Instructions for AI agents working on this codebase.

## Project Overview

imeeji is an interactive Docker image upgrade tool written in TypeScript for
Deno. It scans files for Docker image references (in compose files, Nix
configurations, systemd units, etc.), fetches available tags from container
registries, analyzes semver upgrades, and presents an interactive TUI for
selecting which images to upgrade. It also supports an ad-hoc mode for looking
up versions of a single image.

## Tech Stack

- **Runtime**: Deno 2.x with TypeScript
- **TUI**: React 19 + Ink 6 (terminal UI framework)
- **Testing**: Deno's built-in test runner (no external framework)
- **Build**: `deno bundle` to a single JS file (`dist/imeeji.js`)
- **Dev environment**: Nix flake (`.nix/flake.nix`)

## Commands

```bash
deno check src/main.ts    # Type-check
deno task test            # Run tests
deno task dev             # Run with watch mode
deno task build           # Bundle to dist/imeeji.js
```

The bundled `dist/imeeji.js` is runtime-agnostic and can be executed with Node,
Deno, or Bun.

## Dependency Management

Always use `deno add` to add dependencies — never `deno cache`. `deno cache`
only downloads locally without updating `deno.json`, which breaks type-checking
for others.

```bash
deno add npm:package-name              # correct
deno add npm:react@19 npm:react@19/jsx-runtime  # for JSX (React 19 required by Ink 6)
```

## Runtime Compatibility

The bundled output must work on Node, Deno, and Bun. Avoid Deno-specific APIs at
runtime — use `node:` built-in modules (e.g., `node:process`,
`node:fs/promises`) and Web APIs (`fetch`, `URL`, `performance`) instead.
Deno-only APIs (`Deno.readFile`, `Deno.args`, etc.) are acceptable in tests and
build scripts but not in `src/` runtime code.

## Code Style

- No comments unless explicitly requested
- Follow existing patterns
- Use absolute imports via deno.json import map (e.g.,
  `import { x } from "ink"`)
- Use relative imports for project-internal modules (e.g.,
  `import { x } from "./types.ts"`)
- Conventional commits: `type: description` (`feat`, `fix`, `refactor`, `docs`,
  `test`, `chore`)

## Architecture

### Entry Points

- `src/main.ts` — CLI entry point. Parses args (`--dry-run`, `--yes`, `--help`,
  `--version`), orchestrates the file-mode and ad-hoc-mode pipelines, and writes
  results back to disk.
- `src/ui.ts` — Bridges between the main orchestrator and the Ink TUI. Handles
  alternate screen buffer management and auto-yes mode summary output.

### Core Pipeline

1. **Parser** (`src/parser.ts`) — Regex-based scanner that finds
   `registry/repo:tag` references in any text file. Returns `ImageRef` objects
   with position info (line, column, byte offsets) for patching.

2. **Registry** (`src/registry.ts`) — Fetches tags via the OCI Distribution API
   (`/v2/.../tags/list`) with automatic bearer token auth. Routes Docker Hub
   repositories to the dedicated Hub API for richer metadata (digests, push
   dates).

3. **Analyzer** (`src/analyzer.ts`) — Parses tag strings into structured
   `ParsedTag` objects (prefix, semver version, suffix/variant). Groups tags by
   variant, compares versions (semver-aware with fallback to padded numeric
   comparison), and finds the best upgrade for each image.

4. **Patcher** (`src/patcher.ts`) — Applies selected updates to file content and
   generates unified diffs for `--dry-run` mode.

### Ad-hoc Mode

- `src/adhoc.ts` — Activated when the CLI argument isn't a readable file. Parses
  a bare image reference (e.g., `nginx`, `nginx:alpine`), fetches tags, and
  either auto-selects (`-y`) or launches the ad-hoc TUI.

### TUI Components (`src/tui/`)

| File                 | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `App.tsx`            | Root component — state machine cycling through list/picker/variants/context views |
| `AdhocApp.tsx`       | Ad-hoc mode TUI (variant picker + tag picker)                                     |
| `UpdateList.tsx`     | Main checkbox list of upgradeable images                                          |
| `TagPicker.tsx`      | Scrollable version selector for a single image                                    |
| `VariantPicker.tsx`  | Overlay for switching between tag variants (e.g., `alpine`, `slim`)               |
| `ContextViewer.tsx`  | Shows surrounding file context for an image reference                             |
| `TitleBar.tsx`       | Top bar with image name and registry link                                         |
| `ControlBar.tsx`     | Bottom bar with keyboard shortcuts                                                |
| `Link.tsx`           | Clickable terminal hyperlink                                                      |
| `format.ts`          | Tag display formatting                                                            |
| `tagUrl.ts`          | Constructs registry web URLs for tags                                             |
| `useTerminalSize.ts` | Terminal dimensions hook                                                          |
| `useViewport.ts`     | Viewport/scroll calculation hook                                                  |

### Integrations (`src/integrations/`)

- `dockerHub.ts` — Docker Hub REST API v2 client with pagination and digest
  mapping.
- `lsio.ts` — LinuxServer.io metadata API for identifying floating tags and
  reading changelogs.

### Utilities

- `src/pool.ts` — Bounded concurrency pool (`mapPool`) for parallel tag
  fetching.
- `src/fetch.ts` — Fetch wrapper with stderr debug logging.
- `src/types.ts` — Shared type definitions (`ImageRef`, `ParsedTag`,
  `VariantGroup`, `ImageUpdate`, `TagFetchResult`).

### Tests

Tests live next to the modules they cover, suffixed with `_test.ts`:

- `src/main_test.ts` — Parser and analyzer integration tests
- `src/registry_test.ts` — Registry URL parsing and auth tests
- `src/pool_test.ts` — Concurrency pool tests
- `src/tui/tagUrl_test.ts` — Tag URL construction tests

Run with `deno task test` (which runs `deno test -P src/`).

## Before Committing

1. Format and lint:
   ```bash
   deno fmt && deno lint
   ```
2. Build the bundle:
   ```bash
   deno task build
   ```
3. Verify the bundle runs on all three runtimes:
   ```bash
   nix run nixpkgs#nodejs -- dist/imeeji.js --version
   nix run nixpkgs#deno -- run -A dist/imeeji.js --version
   nix run nixpkgs#bun -- dist/imeeji.js --version
   ```
4. Commit with a co-author trailer using the full model name. For example:
   ```
   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   ```
