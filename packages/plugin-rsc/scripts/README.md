# Scripts

## `import-typescript-eslint-scope-fixtures.ts`

Regenerates the checked-in pre-transpiled JS fixture subtree at
`src/transforms/fixtures/scope/typescript-eslint/` from a local
`typescript-eslint` checkout.

Default source:

```bash
/home/hiroshi/code/others/typescript-eslint/packages/scope-manager/tests/fixtures
```

Usage:

```bash
cd packages/plugin-rsc
node ./scripts/import-typescript-eslint-scope-fixtures.ts
pnpm test -- scope.test.ts --update
```

Override the source directory when needed:

```bash
cd packages/plugin-rsc
node ./scripts/import-typescript-eslint-scope-fixtures.ts \
  --source /path/to/typescript-eslint/packages/scope-manager/tests/fixtures
pnpm test -- scope.test.ts --update
```

Notes:

- The checked-in subtree is JS-only for stable fixture inputs in this repo.
- The transpile step uses Vite's TS/TSX transform with
  `experimentalDecorators: true` and `useDefineForClassFields: false`.
- `oxc` also mirrors this corpus in
  `crates/oxc_semantic/tests/fixtures/typescript-eslint/`, but the canonical
  upstream source is `typescript-eslint`.

## `review-scope-fixtures.ts`

Builds a Markdown review packet for scope fixtures.

Usage:

```bash
cd packages/plugin-rsc
node ./scripts/review-scope-fixtures.ts | code -
node ./scripts/review-scope-fixtures.ts shadowing import | code -
node ./scripts/review-scope-fixtures.ts var-hoisting --output /tmp/scope-review.md
```
