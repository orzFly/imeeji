# imeeji

Interactive Docker image upgrade tool for configuration files.

## Installation

### npm

```bash
npm install -g imeeji
```

### Deno

```bash
deno install -Agn imeeji jsr:@orz/imeeji
```

### One-off

```bash
npx imeeji nginx
```

## Usage

```bash
imeeji <file>              # Interactive mode
imeeji --dry-run <file>    # Print diff without modifying
imeeji -y <file>           # Auto-accept latest versions
imeeji --help              # Show help
imeeji --version           # Show version
```

### Options

| Option          | Description                                   |
| --------------- | --------------------------------------------- |
| `-n, --dry-run` | Print unified diff without modifying the file |
| `-y, --yes`     | Auto-accept latest versions (non-interactive) |
| `-h, --help`    | Print help message                            |
| `-V, --version` | Print version                                 |

## How It Works

1. **Parse** - Scans the input file for docker image references matching
   `domain/path:tag` pattern
2. **Query** - Fetches available tags from Docker Registry API v2 (supports
   Docker Hub, ghcr.io, gcr.io, quay.io, etc.)
3. **Analyze** - Groups tags by prefix (`v`, `release-`) and suffix (`-alpine`,
   `-slim`), then finds the latest version in each group
4. **Select** - Presents a batch selection UI showing current vs. recommended
   upgrades
5. **Apply** - Outputs a unified diff or patches the file directly

## Example

Given a Nix file:

```nix
virtualisation.quadlet.containers.postgres = {
  containerConfig = {
    image = "docker.io/library/postgres:18.1-alpine";
  };
};
```

Running `imeeji config.nix`:

```
Found 1 image(s) in config.nix
Fetching tags for docker.io/library/postgres...

Found 1 image(s) with available upgrades:

#   Image                          Current              → Upgrade
─── ────────────────────────────── ────────────────────   ────────────────────
1.  docker.io/library/postgres     18.1-alpine          → 18.2-alpine

Select images to upgrade (e.g., 1,2,4 or 'all' or 'none'): 1

Updated 1 image(s) in config.nix
```

## Tag Grouping

The tool intelligently groups tags to suggest appropriate upgrades:

| Current Tag   | Suggested Upgrade | Reasoning                            |
| ------------- | ----------------- | ------------------------------------ |
| `18.1-alpine` | `18.2-alpine`     | Same variant (alpine), newer version |
| `v0.9.5`      | `v0.9.6`          | Same prefix (`v`), newer version     |
| `8-alpine`    | `8.0-alpine`      | Same variant, latest in group        |

Common prefixes: `v`, `release-`, `stable-`

Common suffixes: `-alpine`, `-slim`, `-debian`, `-ubuntu`, `-bullseye`,
`-bookworm`

## Dry Run Mode

Use `--dry-run` to preview changes in unified diff format:

```bash
imeeji --dry-run config.nix
```

Output:

```diff
--- a/config.nix
+++ b/config.nix
@@ -22,1 +22,1 @@
-            image = "docker.io/library/postgres:18.1-alpine";
+            image = "docker.io/library/postgres:18.2-alpine";
```

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.5+

### Run

```bash
deno run -P src/main.ts examples/a2.nix
```

### Test

```bash
deno test -P src/
```

### Permissions

Permissions are configured in `deno.json` and can be enabled with the `-P` flag:

| Permission | Reason                                                  |
| ---------- | ------------------------------------------------------- |
| `net`      | Fetch tags from Docker registries                       |
| `read`     | Read configuration files                                |
| `write`    | Modify configuration files (not needed for `--dry-run`) |

## Supported Registries

Any registry implementing Docker Registry HTTP API V2:

- Docker Hub (`docker.io`)
- GitHub Container Registry (`ghcr.io`)
- Google Container Registry (`gcr.io`)
- Quay.io (`quay.io`)
- Private registries (if publicly accessible)

## License

MIT
