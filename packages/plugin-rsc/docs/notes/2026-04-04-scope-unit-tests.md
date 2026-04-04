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
`oxc/crates/oxc_semantic/tests/fixtures/typescript-eslint/`

which in turn was copied from typescript-eslint's own scope-manager test suite. These
inputs are authoritative: written by people who know the spec, with variable names like
`unresolved` and `dontReference2` that encode the expected behavior in the code itself.

Copy the whole directory (all 269 files). TypeScript files are transpiled to JS in the
test runner before being passed to `buildScopeTree` (see below).

#### Test runner

```ts
import { transformWithEsbuild } from 'vite'
import { parseAstAsync } from 'vite'

// discover .js and .ts fixture files recursively
for (const file of globSync('**/*.{js,ts}', { cwd: fixtureDir })) {
  it(file, async () => {
    let input = readFileSync(path.join(fixtureDir, file), 'utf-8')
    if (file.endsWith('.ts')) {
      // strip TypeScript syntax; buildScopeTree only handles ESTree JS
      const result = await transformWithEsbuild(input, file, { loader: 'ts' })
      input = result.code
    }
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

`shadowing-block.js.snap`:

```json
{
  "type": "Program",
  "declarations": [],
  "references": [],
  "children": [
    {
      "type": "Function:outer",
      "declarations": [],
      "references": [],
      "children": [
        {
          "type": "BlockStatement",
          "declarations": ["value"],
          "references": [],
          "children": [
            {
              "type": "Function:action",
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
                          "resolvedIn": "Program > Function:outer > BlockStatement > Function:action > BlockStatement > BlockStatement"
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

The `resolvedIn` path is built from scope-creating node labels (function names where
available), disambiguated with `[2]` suffixes for same-type siblings.
`null` means the identifier is global (not declared anywhere in the file).

#### Hand-crafted fixtures (gaps not covered by typescript-eslint set)

- `export-specifier.js` — `export {foo as bar}`: `foo` IS resolved, `bar` is NOT
- `label.js` — label in `break`/`continue` NOT a ref
- `shadowing-block.js` — the motivating bug from the migration notes

### 3. Verify `hoist.test.ts` still passes after the extraction

## Non-goals

- Do not change behaviour of `buildScopeTree` in this task.
- Do not implement the pass-2 refactor (replacing `isBindingIdentifier` with explicit
  reference visitor) — that is a separate follow-up described in the migration plan.
