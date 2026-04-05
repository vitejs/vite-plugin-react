# Scripts

## `import-typescript-eslint-scope-fixtures.ts`

Regenerates the checked-in pre-transpiled JS fixture subtree at
`src/transforms/fixtures/scope/typescript-eslint/` from a local
`typescript-eslint` checkout.

Source resolution order:

```bash
1. --source /path/to/typescript-eslint/packages/scope-manager/tests/fixtures
2. TYPESCRIPT_ESLINT_SCOPE_FIXTURES_DIR
3. ../typescript-eslint/packages/scope-manager/tests/fixtures
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

Or set an environment variable:

```bash
cd packages/plugin-rsc
TYPESCRIPT_ESLINT_SCOPE_FIXTURES_DIR=/path/to/typescript-eslint/packages/scope-manager/tests/fixtures \
  node ./scripts/import-typescript-eslint-scope-fixtures.ts
pnpm test -- scope.test.ts --update
```

Notes:

- The checked-in subtree is JS-only for stable fixture inputs in this repo.
- The transpile step uses TypeScript `transpileModule` with
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

## Review Workflow

The imported `typescript-eslint` corpus is too large to review file-by-file in one pass.
The practical workflow is:

1. Regenerate the pre-transpiled JS fixture subtree.

```bash
cd packages/plugin-rsc
node ./scripts/import-typescript-eslint-scope-fixtures.ts
pnpm test -- scope.test.ts --update
```

2. Build review packets for targeted categories instead of the entire corpus.

```bash
cd packages/plugin-rsc
node ./scripts/review-scope-fixtures.ts typescript-eslint/destructuring --output /tmp/destructuring.md
node ./scripts/review-scope-fixtures.ts typescript-eslint/import typescript-eslint/export --output /tmp/module-syntax.md
node ./scripts/review-scope-fixtures.ts typescript-eslint/class typescript-eslint/jsx --output /tmp/class-jsx.md
```

3. Sample by category, not exhaustively.

Recommended categories:

- `destructuring/`
- `import/`
- `export/`
- `catch/`
- `functions/`
- `class/`
- `jsx/`
- `decorators/`

4. Review in parallel.

When using subagents, split the audit by independent category groups and ask each
subagent to report only suspicious cases. A good split is:

- `destructuring/`, `import/`, `export/`, `catch/`
- `class/`, `decorators/`, `jsx/`
- `functions/`, `global-resolution/`, `block/`, `call-expression/`, `member-expression/`, `new-expression/`, `implicit/`

Each reviewer should compare:

- original intent of the upstream fixture category
- transpiled JS fixture content
- generated `*.snap.json`

and report only:

- likely scope-analysis bugs
- fixtures whose TS -> JS lowering destroyed the original signal

5. Prefer findings-driven follow-up.

High-value follow-up is not “review every imported file”, but:

- fix concrete scope-analysis bugs exposed by imported fixtures
- document or prune low-signal imported fixtures whose semantics are erased by transpilation

## Current Caveats

The import is intentionally JS-only, but some TS-specific fixtures lose value after
transpilation. Known weak-signal areas:

- `decorators/`: helper injection like `__decorate` / `__param` can dominate the snapshot
- some `jsx/factory/` cases: JSX pragma semantics collapse to `_jsx(...)` runtime helper calls
- some `functions/arrow/` TS-only cases: type predicates, `asserts`, and type parameters can erase to identical JS

Known likely real bug discovered during sampling:

- `typescript-eslint/class/expression/self-reference-super.js`
  `const A = class A extends A {}` appears to resolve `extends A` to the outer
  `const A` instead of the inner class name
