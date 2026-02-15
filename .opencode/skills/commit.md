# /commit - Pre-commit Checklist

Before creating a git commit, always perform these steps in order:

## 1. Run Tests

Execute the test suite to ensure all tests pass:

```bash
deno test -A
```

## 2. Fix Any Test Errors

If tests fail, fix the issues before proceeding.

## 3. Format and Lint

Run both formatting and linting:

```bash
deno fmt && deno lint
```

## 4. Fix Lint Errors

If lint reports errors, fix them. Common fixes include:

- Change `import { Type }` to `import type { Type }` for type-only imports
- Remove unused variables or prefix with underscore
- Remove `async` from functions without `await`
- Use `const` instead of `let` for non-reassigned variables

## 5. Create Commit

Only after all above steps pass, create the commit:

```bash
git add <files>
git commit -m "<message>"
```

## Commit Message Style

- Use conventional commits format: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Keep messages concise and descriptive
