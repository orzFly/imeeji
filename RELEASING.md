# Releasing

## Process

1. Create an empty version-bump commit with release notes in the body:

   ```bash
   git commit --allow-empty -m "v0.2.0

   - Added foo feature
   - Fixed bar bug

   Co-Authored-By: ..."
   ```

   The first line is the version (used as commit subject). Everything after the
   blank line is the release notes body. Git trailers (`Co-Authored-By`,
   `Signed-off-by`) are stripped automatically.

2. Tag and push:

   ```bash
   git tag v0.2.0
   git push origin master v0.2.0
   ```

3. The release workflow will:
   - Replace `"dev"` version in source with the tag version
   - Run tests and build the bundle
   - Publish to npm (via OIDC trusted publisher)
   - Publish to JSR (via OIDC)
   - Create a GitHub Release with the commit body as release notes

## Version in Source

There is no version to maintain in the repository. `deno.json`, `package.json`,
and `src/main.ts` all use placeholder values (`"dev"` / `"0.0.0"` / `"0.1.0"`)
that CI overwrites at release time via `sed`.

## First-Time Setup

- npm: publish the first version manually (`npm publish`), then configure
  [trusted publisher](https://docs.npmjs.com/trusted-publishers) on npmjs.com
  pointing to `orzfly/imeeji` with workflow `release.yml`.
- JSR: the `@orz` scope must be linked to the GitHub repo on jsr.io. No secrets
  needed — authentication uses OIDC.
