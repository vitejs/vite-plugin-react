# Scope Manager Design Research

## Goal

Survey how prior-art JS/TS toolchains implement scope analysis, compare against our custom `buildScopeTree` in `src/transforms/scope.ts`, and extract design lessons that could inform a future refactor (especially the pass-2 reference-visitor proposed in `2026-04-04-hoist-variable-shadowing.md`).

## Context

We rolled our own scope analyzer because our use case is narrow:

- ESTree input (Vite's `parseAstAsync` / oxc-parser)
- Module scope only (no global, no TypeScript types)
- Output needed: for each `use server` function, which outer-scope identifiers does it close over? (`getBindVars` in `hoist.ts`)

No existing library fit exactly: periscopic had a shadowing bug (wrong scope anchor + name-string resolution), typescript-eslint is TS-AST-only and far heavier than needed, and eslint-scope targets a superset of concerns.

## Prior Arts

Each document below covers one implementation: data model, scope types, resolution strategy, and a diff against our approach.

- [typescript-eslint scope-manager](scope-manager-research/typescript-eslint.md)
- [periscopic](scope-manager-research/periscopic.md)
- [vite ssr transform](scope-manager-research/vite-ssr.md)
- [eslint-scope](scope-manager-research/eslint-scope.md)
- [babel traverse](scope-manager-research/babel-traverse.md)
- [oxc_semantic](scope-manager-research/oxc.md)
- [oxc-walker](scope-manager-research/oxc-walker.md)
- [next.js server action transform](scope-manager-research/nextjs.md)

## Bugs and gaps found in our implementation

Discovered by comparing against prior arts. Add test fixtures and fix separately.

### Bug: default parameter + `var` hoisting (spec violation)

Discovered via eslint-scope's `__isValidResolution` guard.

```js
function outer() {
  const y = 'outer'
  async function action() {
    'use server'
    function inner(x = y) {
      // which `y` does this resolve to?
      var y = 'inner' // hoisted to inner's function scope
    }
  }
}
```

Our post-walk resolver adds `var y` to `inner`'s function scope (via `getNearestFunctionScope()`). When resolving the `y` reference in the default param, `visitScope` is also the function scope, so we immediately find `y` there and return it as the declaring scope.

Per spec, when a function has non-simple parameters (defaults/destructuring/rest), default param expressions cannot see `var` declarations in the function body — they are in separate environments. The correct resolution is `outer`'s `y`.

**Practical impact for `getBindVars`:** we would fail to include `outer.y` as a closure variable for `action`, producing a server action that doesn't bind `y` at the call site even though the runtime would capture `outer.y`.

**Fix direction:** after resolving a reference, if the reference position is a default parameter expression and the resolved scope is the same function scope, re-resolve from the function scope's parent instead. This is what eslint-scope does via a source-position range check (`ref.identifier.range[0] < bodyStart && variable.defs[].range[0] >= bodyStart`).

### Gap: `for`-loop scope created unconditionally

eslint-scope and oxc_semantic only create a block scope for `for`/`for-in`/`for-of` loops when the init/left uses `let`/`const`. We create a scope for all for-loops regardless.

For `for (var i = 0; ...)`, our for-loop scope is empty (since `var i` hoists out), so this causes no wrong results — just a spurious empty scope node in the tree. Low priority.

### Gap: no `StaticBlock` scope

`class Foo { static { const x = 1 } }` — the static block creates its own scope in all prior arts (eslint-scope, oxc_semantic, vite-ssr). We don't handle it. Unlikely to matter for `use server` since class instance methods are rejected, but `static` initializers could theoretically contain a server action in future.

## Bugs found in prior arts

### oxc-walker: computed member expression misclassified as binding

`isBindingIdentifier` checks `parent.type === "MemberExpression"` with no guard on `computed`:

```ts
case "MemberExpression":
  return parent.property === node  // no !parent.computed check
```

This means `obj[bar]` — `bar` is classified as a **binding** (not a reference), so it would never appear in `getUndeclaredIdentifiersInFunction`'s output even if `bar` is an outer-scope variable. Our implementation correctly gates on `!parent.computed`.

### periscopic: named class expression name leaks to outer scope

`(class Foo {})` creates no inner scope, so `Foo` is added directly to the current scope's `declarations`. Any outer-scope reference to `Foo` after the expression would resolve to the class, which is incorrect — per spec, `Foo` is only visible inside the class body.

### periscopic: spurious scope for re-export declarations

`export { x } from './y'` creates a block scope (`Scope(block=true)`) containing the specifier identifiers as declarations. The re-exported names are not actually declared in this module, so they should not appear in any scope's declarations.

### vite-ssr: no `switch` scope

`let`/`const` declared inside a `switch` body are not scoped to the `switch` — they use whatever enclosing block scope exists. In practice this is usually correct (the `switch` body is often already inside a `BlockStatement` function body), but `let` at the top level of a switch case leaks to the enclosing function scope in vite-ssr's model.

### Next.js: function parameters assumed used (documented TODO)

From `server_actions.rs` line 340:

```rust
// TODO: For the current implementation, we don't track if an
// argument ident is actually referenced in the function body.
// Instead, we go with the easy route and assume defined ones are used.
```

A server action function parameter that is never referenced in the body is still included in the encrypted closure arg list, adding unnecessary payload size.

## Comparison table

> TODO — fill in once individual documents are complete.

|                        | periscopic        | vite-ssr         | eslint-scope                | babel-traverse | oxc_semantic | oxc-walker   | next.js | typescript-eslint           | **ours**                |
| ---------------------- | ----------------- | ---------------- | --------------------------- | -------------- | ------------ | ------------ | ------- | --------------------------- | ----------------------- |
| AST format             | ESTree            | ESTree           | ESTree                      | Babel AST      | oxc AST      | ESTree (oxc) | ?       | TSESTree                    | ESTree                  |
| Language               | JS                | TS               | JS                          | JS             | Rust         | TS           | ?       | TS                          | TS                      |
| Variable object        | no                | no               | yes                         | yes (Binding)  | yes (Symbol) | no           | ?       | yes                         | no                      |
| Read/write flag        | no                | no               | yes                         | yes            | yes          | no           | ?       | yes                         | no                      |
| Resolution timing      | single-pass (bug) | two-pass         | close-time                  | close-time     | ?            | two-pass     | ?       | close-time                  | post-walk               |
| Refs aggregated upward | no                | no               | no (through[])              | no             | no           | no           | ?       | no (through[])              | yes (scopeToReferences) |
| `var` hoisting         | buggy             | yes              | yes                         | yes            | yes          | yes          | ?       | yes                         | yes                     |
| Named fn-expr scope    | name in fn scope  | name in fn scope | FunctionExpressionNameScope | ?              | ?            | ?            | ?       | FunctionExpressionNameScope | name in fn scope        |
| Class scope            | none              | named-expr only  | ClassScope (always)         | ?              | ?            | ?            | ?       | ClassScope (always)         | named-expr only         |
| TypeScript support     | no                | no               | no                          | yes            | yes          | partial      | ?       | yes                         | no                      |

## Related notes

- [`2026-04-04-hoist-variable-shadowing.md`](2026-04-04-hoist-variable-shadowing.md) — the shadowing bug that motivated the custom implementation and the proposed pass-2 refactor
- [`2026-04-04-scope-unit-tests.md`](2026-04-04-scope-unit-tests.md) — fixture test plan

## Subagent prompts

Each prior art was researched by an Explore subagent. Prompts are recorded here for reproducibility.

### Standard template (all except next.js)

Replace `{LOCATION}`, `{FRAMING_NOTE}`, and `{EXTRA_QUESTIONS}` per the addendum table below.

```
Read and summarize the scope analysis implementation in {LOCATION}.
I need a thorough technical comparison against a custom ESTree scope analyzer.
{FRAMING_NOTE}
Key questions to answer:
1. What is the Scope data model? (fields, types)
2. How are declarations stored? (Set<string> of names, or richer objects?)
3. How are references stored? (Set<string>, or per-Identifier?)
4. How does reference resolution work? (single-pass or two-pass? when does resolution happen relative to declarations?)
5. What scope-creating AST nodes get their own Scope? (functions, blocks, catch, for-loops, classes, named fn expressions?)
6. How does it handle `var` hoisting?
7. How does it handle named function expressions (e.g. `(function f() {})` — does `f` go in the outer scope or the function scope)?
8. How does it handle class scopes?
9. What is the public API surface?
10. What are the known limitations / design trade-offs?
{EXTRA_QUESTIONS}
Please return raw findings — exact field names, code snippets, file paths with line numbers.
I'll write the comparison doc myself.
```

**Addendum per prior art:**

| Prior art      | GitHub                                                              | `{LOCATION}` (local clone)                                                                                                                                       | `{FRAMING_NOTE}`                                                                           | `{EXTRA_QUESTIONS}`                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| periscopic     | [Rich-Harris/periscopic](https://github.com/Rich-Harris/periscopic) | `~/code/others/periscopic/` — please read all relevant source files                                                                                              | _(omit)_                                                                                   | `11. What do extract_names / extract_identifiers do?`                                                                                                                                                                                               |
| vite-ssr       | [vitejs/vite](https://github.com/vitejs/vite)                       | `~/code/others/vite/packages/vite/src/node/ssr/ssrTransform.ts` — the scope-related code is approximately lines 456–760 but check the actual line range yourself | _(omit)_                                                                                   | `11. Is there a Scope class or is it ad-hoc maps/stacks?` `12. What is the purpose of this scope analysis within ssrTransform — what question is it answering?` `13. The file uses estree-walker — check what version/API it uses.`                 |
| eslint-scope   | [eslint/js](https://github.com/eslint/js)                           | `~/code/others/eslint-js/packages/eslint-scope/`                                                                                                                 | _(omit)_                                                                                   | `11. What is the Variable data model? (defs, references, identifiers)` `12. What is the Reference data model? (identifier, resolved, flag, from)` `13. List all ScopeType variants.` `14. Is there a FunctionExpressionNameScope?`                  |
| babel-traverse | [babel/babel](https://github.com/babel/babel)                       | `~/code/others/babel/packages/babel-traverse/src/scope/`                                                                                                         | _(omit)_                                                                                   | `11. What is the Binding data model? (identifier, path, scope, kind, references, referencePaths, constantViolations)` `12. Is resolution lazy or eager (crawl-on-demand)?` `13. List the public scope query API (getBinding(), hasBinding(), etc.)` |
| oxc_semantic   | [oxc-project/oxc](https://github.com/oxc-project/oxc)               | `~/code/others/oxc/crates/oxc_semantic/src/`                                                                                                                     | `This is Rust code — focus on the data model and algorithm, not language-specific syntax.` | `11. How are symbols stored? (arena IDs, string interning, etc.)` `12. What is the entry point from the compiler pipeline?` `13. What are the design trade-offs vs JS implementations?`                                                             |
| oxc-walker     | [oxc-project/oxc-walker](https://github.com/oxc-project/oxc-walker) | `~/code/others/oxc-walker/src/scope-tracker.ts` (and any related files)                                                                                          | _(omit)_                                                                                   | `11. What is isBindingIdentifier — what positions does it exclude?` `12. What is the public API surface (getUndeclaredIdentifiersInFunction or similar)?`                                                                                           |

---

### next.js (different structure — file discovery first)

```
Find and summarize the scope analysis / reference tracking used in Next.js's
server action transform. Repo: https://github.com/vercel/next.js (cloned at `~/code/others/next.js/`).

First, locate the relevant files — likely somewhere under `packages/next/src/`
involving "server action", "use server", or similar. Check both SWC transform
wrappers and any JS/TS-side analysis.

Key questions to answer:
1. Does Next.js implement its own scope analysis, or delegate to a library (e.g. babel-traverse, swc)?
2. If custom: what is the data model? what are the scope-creating nodes? how are references resolved?
3. If delegated: which library, which API, and what question is it asking?
4. What specific problem is the scope analysis solving — finding closure variables, rewriting bindings, etc.?
5. How does it handle `var` hoisting, named function expressions, class scopes?
6. What are the known limitations or edge cases handled specially?

Please return raw findings — exact file paths with line numbers, function names, code snippets.
I'll write the comparison doc myself.
```
