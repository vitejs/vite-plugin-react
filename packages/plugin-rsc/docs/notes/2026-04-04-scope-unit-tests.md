# Task: Unit-test `buildScopeTree` in its own module

## Goal

Extract the custom scope analysis from `hoist.ts` into `src/transforms/scope.ts` and add
a comprehensive `scope.test.ts` that tests `buildScopeTree` directly, independent of the
hoist transform.

This is step 5 of the migration plan in `2026-04-04-hoist-variable-shadowing.md`.

## Steps

### 1. Extract `scope.ts` from `hoist.ts` ✅

Done. `src/transforms/scope.ts` exists; `hoist.ts` imports from it.

### 2. File-based fixture tests in `scope.test.ts`

Modelled after `oxc_semantic`'s approach: fixture input files paired with snapshot files
capturing a human-readable visualization of the scope tree.

#### Fixture sources

Two fixture directories:

```
src/transforms/fixtures/scope/typescript-eslint/   ← copied from oxc_semantic's fixtures
src/transforms/fixtures/scope/                     ← hand-crafted cases not covered above
```

**`typescript-eslint/`** is copied from:
`https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/scope-manager/tests/fixtures`

These inputs are authoritative: written by people who know the spec, with variable names
like `unresolved` and `dontReference2` that encode the expected behavior in the code itself.

Historical note: `oxc` also mirrors this fixture corpus in
`crates/oxc_semantic/tests/fixtures/typescript-eslint/`. The introducing commit there is
`48724a0d44c7d10da97f3c0cb714890e965c4ab8` (`chore(semantic): copy tests from
typescript-eslint’s scope-manager (#3990)`), which cites
`https://github.com/typescript-eslint/typescript-eslint/tree/a5b652da1ebb09ecbca8f4b032bf05ebc0e03dc9/packages/scope-manager/tests/fixtures`.

The checked-in subtree is **pre-transpiled JS**, not TS/TSX. The source of truth is the
local `typescript-eslint` checkout. The reproducible import/update workflow lives in
`packages/plugin-rsc/scripts/README.md`.

#### Test runner

```ts
import { parseAstAsync } from 'vite'

// discover pre-transpiled .js fixture files recursively
for (const file of globSync('**/*.js', { cwd: fixtureDir })) {
  it(file, async () => {
    const input = readFileSync(path.join(fixtureDir, file), 'utf-8')
    const ast = await parseAstAsync(input)
    const scopeTree = buildScopeTree(ast)
    const snapshot = serializeScopeTree(ast, scopeTree)
    await expect(snapshot).toMatchFileSnapshot(
      path.join(fixtureDir, file + '.snap'),
    )
  })
}
```

#### Snapshot format

Scope-tree-centric JSON. Each scope node lists its declarations and the direct
references resolved within it. References show the name and which scope they resolve
to via a stable path label (not numeric IDs).

Example — `shadowing-block.js`:

```js
function outer() {
  const value = 0
  function action() {
    if (true) {
      const value = 1
      return value
    }
  }
}
```

`shadowing-block.js.snap.json`:

```json
{
  "type": "Program",
  "declarations": [],
  "references": [],
  "children": [
    {
      "type": "FunctionDeclaration:outer",
      "declarations": [],
      "references": [],
      "children": [
        {
          "type": "BlockStatement",
          "declarations": ["value"],
          "references": [],
          "children": [
            {
              "type": "FunctionDeclaration:action",
              "declarations": [],
              "references": [],
              "children": [
                {
                  "type": "BlockStatement",
                  "declarations": [],
                  "references": [],
                  "children": [
                    {
                      "type": "BlockStatement",
                      "declarations": ["value"],
                      "references": [
                        {
                          "name": "value",
                          "declaredAt": "Program > FunctionDeclaration:outer > BlockStatement > FunctionDeclaration:action > BlockStatement > BlockStatement"
                        }
                      ],
                      "children": []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

The `declaredAt` path is built from scope-creating node labels (function names where
available), disambiguated with `[2]` suffixes for same-type siblings.
`null` means the identifier is global (not declared anywhere in the file).

#### Hand-crafted fixtures (gaps not covered by typescript-eslint set)

- `export-specifier.js` — `export {foo as bar}`: `foo` IS resolved, `bar` is NOT
- `label.js` — label in `break`/`continue` NOT a ref
- `shadowing-block.js` — the motivating bug from the migration notes
- `import-meta.js` — `import` / `meta` in `import.meta` are NOT refs
- `param-default-var-hoisting.js` — documents the current default-param + hoisted-`var`
  misresolution as a known gap

### 3. Verify `hoist.test.ts` still passes after the extraction

## Non-goals

- Do not change behaviour of `buildScopeTree` in this task.
- Do not implement the pass-2 refactor (replacing `isReferenceIdentifier` with explicit
  reference visitor) — that is a separate follow-up described in the migration plan.
