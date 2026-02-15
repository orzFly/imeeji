# AGENTS.md

Instructions for AI agents working on this codebase.

## Project Overview

imeeji is an interactive Docker image upgrade tool. It scans files for Docker image references, checks for available updates, and provides an interactive TUI for selecting which images to upgrade.

## Tech Stack

- Deno 2.x with TypeScript
- React 19 + Ink 6 for TUI
- No external test framework (uses Deno's built-in test runner)

## Commands

```bash
deno check src/main.ts    # Type-check the project
deno task test            # Run tests
deno task dev             # Run with watch mode
```

## Dependency Management

**IMPORTANT**: Always use `deno add` to add dependencies, NOT `deno cache`. The `deno cache` command only caches the dependency locally but does not add it to `deno.json`, which causes type-checking to fail for others.

```bash
# Correct - adds to deno.json
deno add npm:package-name

# Wrong - only caches locally
deno cache npm:package-name
```

For JSX projects, you must add both React and the JSX runtime:
```bash
deno add npm:react@19 npm:react@19/jsx-runtime
```

Note: Use React 19 for compatibility with Ink 6 (which has a peer dependency on React ^19).

## Code Style

- No comments unless explicitly requested
- Keep responses concise
- Follow existing patterns in the codebase
- Use absolute imports (relative to project root via deno.json imports)

## Architecture

- `src/main.ts` - CLI entry point, argument parsing, orchestration
- `src/ui.ts` - Public API for interactive selection, bridges to Ink TUI
- `src/tui/` - React/Ink-based TUI components
  - `App.tsx` - Root component with state machine
  - `UpdateList.tsx` - Main checkbox list view
  - `TagPicker.tsx` - Version selection for an image
  - `VariantPicker.tsx` - Variant switcher overlay
  - `ContextViewer.tsx` - File context overlay
  - `useListNav.ts` - Shared hook for arrow-key navigation
- `src/parser.ts` - Parses files for Docker image references
- `src/registry.ts` - Fetches tags from container registries
- `src/analyzer.ts` - Analyzes tags and finds upgrades
- `src/patcher.ts` - Applies selected updates to file content
- `src/types.ts` - Shared type definitions
