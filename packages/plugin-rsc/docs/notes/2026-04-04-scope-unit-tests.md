# Task: Unit-test `buildScopeTree` in its own module

## Goal

Extract the custom scope analysis from `hoist.ts` into `src/transforms/scope.ts` and add
a comprehensive `scope.test.ts` that tests `buildScopeTree` (and `getBindVars`) directly,
independent of the hoist transform.

This is step 5 of the migration plan in `2026-04-04-hoist-variable-shadowing.md`.

## Steps

### 1. Extract `scope.ts` from `hoist.ts`

- Move: `Scope`, `ScopeTree`, `buildScopeTree`, `getBindVars`, `getAncestorScopes`,
  `isBindingIdentifier`, `patternContainsIdentifier`, `extractNames`, `extractIdentifiers`
- Export at minimum: `buildScopeTree`, `getBindVars`, `ScopeTree`, `Scope`
- `hoist.ts` imports from `./scope`

### 2. File-based fixture tests in `scope.test.ts`

Inspired by `oxc_semantic`'s approach: each fixture is a JS input file paired with a
snapshot file that captures a human-readable visualization of the scope tree.

#### Directory layout

```
src/transforms/fixtures/scope/
  var-hoisting.js
  var-hoisting.snap
  shadowing-block.js
  shadowing-block.snap
  export-specifier.js
  export-specifier.snap
  ...
```

#### Test runner (auto-discovery)

```ts
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { parseAstAsync } from 'vite'
import { expect, it } from 'vitest'
import { buildScopeTree } from './scope'

const fixtureDir = path.join(import.meta.dirname, 'fixtures/scope')

for (const file of readdirSync(fixtureDir).filter((f) => f.endsWith('.js'))) {
  it(file.replace('.js', ''), async () => {
    const input = readFileSync(path.join(fixtureDir, file), 'utf-8')
    const ast = await parseAstAsync(input)
    const scopeTree = buildScopeTree(ast)
    const snapshot = serializeScopeTree(ast, scopeTree)
    await expect(snapshot).toMatchFileSnapshot(
      path.join(fixtureDir, file.replace('.js', '.snap')),
    )
  })
}
```

#### Snapshot format

Scope-tree-centric, analogous to `oxc_semantic`'s readable JSON. Each scope node lists
its declarations and the references resolved within it. References show the name and
which scope they resolve to (using a stable label derived from the scope-creating node).

Example — `shadowing-block.js`:

```js
function outer() {
  const value = 0
  async function action() {
    if (true) {
      const value = 1
      return value
    }
  }
}
```

`shadowing-block.snap`:

```json
{
  "type": "Program",
  "declarations": [],
  "references": [],
  "children": [
    {
      "type": "Function:outer",
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
                      "resolvedIn": "Function:action>BlockStatement>BlockStatement"
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
```

The `resolvedIn` label is a stable path string built from the scope-creating node types
(and function names where available), not from internal numeric IDs.

`getBindVars` for `action` can be shown separately in the fixture as a comment or in
a parallel `.bindvars.snap` file — TBD.

#### Test categories (fixture files to create)

**Scope structure**

- `module-scope.js` — module scope has no parent; top-level fn parent is moduleScope

**Declaration placement**

- `let-const-block.js` — `let`/`const` stays in block scope
- `var-hoisting.js` — `var` in nested block hoists to nearest function scope
- `var-nested-fn.js` — `var` in nested function stays in that fn, not outer
- `fn-decl-hoisting.js` — function declaration name hoists to enclosing fn scope
- `fn-expr-name.js` — function expression name (`function self(){}`) is in its own scope
- `destructured-params.js` — plain/rest/destructured params are in function scope
- `catch-param.js` — catch param is in catch scope
- `class-decl.js` — class declaration name in current scope

**Reference resolution**

- `ref-module-local.js` — ref to module-level `const` maps to moduleScope
- `ref-outer-fn.js` — ref to outer function's local maps to outer fn scope
- `ref-same-fn.js` — ref to same-function local maps to fn own scope
- `shadowing-block.js` — ref shadowed in nested block resolves to inner scope
- `ref-var-hoisted.js` — ref to `var` declared later in same fn maps to fn scope
- `ref-global.js` — ref to global (`console`) absent from `referenceToDeclaredScope`

**`isBindingIdentifier` edge cases — highest priority**

- `member-expr.js` — `obj.prop`: `prop` NOT a ref; `obj[expr]`: `expr` IS a ref
- `object-expr-vs-pattern.js` — `{key: val}` in expr vs `const {key: val} = obj`
- `computed-destructuring.js` — `const {[expr]: val} = obj`: `expr` IS a ref
- `export-specifier.js` — `export {foo as bar}`: `foo` IS resolved, `bar` is NOT
- `import-specifier.js` — `import {foo as bar}`: `bar` is binding, `foo` is not a ref
- `method-definition.js` — non-computed method key NOT a ref; computed key IS
- `property-definition.js` — `class C { field = val }`: `field` NOT a ref, `val` IS
- `label.js` — label in `break`/`continue` NOT a ref

**`scopeToReferences` propagation**

- `propagation.js` — function scope accumulates refs from nested blocks and inner fns

### 3. Verify `hoist.test.ts` still passes after the extraction

## Non-goals

- Do not change behaviour of `buildScopeTree` in this task.
- Do not implement the pass-2 refactor (replacing `isBindingIdentifier` with explicit
  reference visitor) — that is a separate follow-up described in the migration plan.
