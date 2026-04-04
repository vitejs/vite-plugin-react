# Task: Unit-test `buildScopeTree` in its own module

## Goal

Extract the custom scope analysis from `hoist.ts` into `src/transforms/scope.ts` and add
a comprehensive `scope.test.ts` that tests `buildScopeTree` (and `getBindVars`) directly,
independent of the hoist transform.

This is step 5 of the migration plan in `2026-04-04-hoist-variable-shadowing.md`.

## Steps

1. Extract `scope.ts` from `hoist.ts`
   - Move: `Scope`, `ScopeTree`, `buildScopeTree`, `getBindVars`, `getAncestorScopes`,
     `isBindingIdentifier`, `patternContainsIdentifier`, `extractNames`, `extractIdentifiers`
   - Export at minimum: `buildScopeTree`, `getBindVars`, `ScopeTree`, `Scope`
   - `hoist.ts` imports from `./scope`

2. Write `scope.test.ts`

   **Test helper:**

   ```ts
   async function setup(code: string) {
     const ast = await parseAstAsync(code)
     const scopeTree = buildScopeTree(ast)
     function refs(name: string): Identifier[] {
       /* walk, collect by name */
     }
     function fn(name: string): AnyFunctionNode {
       /* walk, find by id.name */
     }
     return { scopeTree, refs, fn, ast }
   }
   ```

   **Test categories:**

   ### Scope structure
   - Module scope has no parent
   - Top-level function's scope parent is moduleScope
   - Block scope parent is enclosing function scope (or block)

   ### Declaration placement (pass 1)

   | case                                            | expected scope                      |
   | ----------------------------------------------- | ----------------------------------- |
   | `let`/`const` in block                          | block scope                         |
   | `var` in nested block                           | nearest function scope              |
   | `var` in block inside nested function           | that nested fn's scope              |
   | function declaration name                       | hoisted to enclosing function scope |
   | function expression name (`function self() {}`) | its own scope                       |
   | plain/rest/destructured params                  | function scope                      |
   | catch param                                     | catch scope                         |
   | class declaration name                          | current scope                       |

   ### Reference resolution (pass 2)

   | code                                         | assertion                              |
   | -------------------------------------------- | -------------------------------------- |
   | ref to module-level `const`                  | maps to moduleScope                    |
   | ref to outer function's local                | maps to outer fn scope                 |
   | ref to same-function local                   | maps to fn own scope                   |
   | ref shadowed in action body                  | maps to inner scope                    |
   | ref to `var` declared later in same function | maps to fn scope (hoisting)            |
   | global ref (`console`)                       | absent from `referenceToDeclaredScope` |

   ### `isBindingIdentifier` edge cases — highest priority

   These are the cases that required parent/grandparent context and are most likely to
   regress:

   | syntax                                                    | assertion                                          |
   | --------------------------------------------------------- | -------------------------------------------------- |
   | `obj.prop` non-computed `MemberExpression`                | `prop` NOT in referenceToDeclaredScope             |
   | `obj[expr]` computed                                      | `expr` IS resolved                                 |
   | `{ key: val }` `ObjectExpression`                         | `key` NOT resolved; `val` IS resolved              |
   | `const { key: val } = obj` `ObjectPattern`                | `val` is a binding (not a ref); `key` is not a ref |
   | `const { [expr]: val } = obj` computed destructuring      | `expr` IS a reference                              |
   | `export { foo as bar }` `ExportSpecifier`                 | `foo` IS resolved; `bar` is NOT                    |
   | `import { foo as bar }` `ImportSpecifier`                 | `bar` is binding; `foo` is not a ref               |
   | `class C { method() {} }` non-computed `MethodDefinition` | `method` NOT resolved                              |
   | `class C { [expr]() {} }` computed method                 | `expr` IS resolved                                 |
   | `class C { field = val }` `PropertyDefinition`            | `field` NOT resolved; `val` IS resolved            |
   | label in `break`/`continue`                               | NOT resolved                                       |

   ### `scopeToReferences` propagation
   - A function scope accumulates refs from its own body and all nested blocks
   - An inner function's refs propagate up to the outer function's `scopeToReferences`

   ### `getBindVars`

   | scenario                          | expected     |
   | --------------------------------- | ------------ |
   | ref to outer fn local             | `['x']`      |
   | ref shadowed in action body       | `[]`         |
   | ref shadowed only in nested block | `[]`         |
   | ref to module global              | `[]`         |
   | ref to true global (`console`)    | `[]`         |
   | multiple refs to same name        | deduplicated |
   | ref to param of outer function    | `['param']`  |

3. Verify existing `hoist.test.ts` still passes after the extraction.

## Non-goals

- Do not change behaviour of `buildScopeTree` in this task.
- Do not implement the pass-2 refactor (replacing `isBindingIdentifier` with explicit
  reference visitor) — that is a separate follow-up described in the migration plan.
