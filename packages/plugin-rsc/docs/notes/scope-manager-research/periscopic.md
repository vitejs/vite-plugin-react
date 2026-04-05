# scope.ts vs periscopic: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** `~/code/others/periscopic/src/index.js`

---

## Data model

### Ours

```
Scope
  declarations: Set<string>
  parent: Scope | undefined
  isFunction: boolean

ScopeTree
  referenceToDeclaredScope: Map<Identifier, Scope>
  scopeToReferences:        Map<Scope, Identifier[]>
  nodeScope:                Map<Node, Scope>
  moduleScope:              Scope
```

### periscopic

```
Scope
  parent:                  Scope | null
  block:                   boolean          // true = block scope, false = function scope
  declarations:            Map<string, Node> // name → declaring AST node
  initialised_declarations: Set<string>     // subset of declarations that have an initializer
  references:              Set<string>       // names referenced here OR in any child scope

analyze(ast) → { map, scope, globals }
  map:     WeakMap<Node, Scope>   // scope-creating node → Scope
  scope:   Scope                  // root scope
  globals: Map<string, Node>      // name → Identifier node, for names with no declaration
```

**Key difference:** periscopic stores the declaring AST node in `declarations` (richer than our `Set<string>`), but references are only `Set<string>` — no link back to individual `Identifier` nodes. Once you ask "is `foo` referenced?" you get yes/no but cannot identify which `Identifier` nodes produced that answer. This is what makes shadowing invisible (see below).

---

## Scope types created

| Situation                                        | periscopic                            | Ours                                 |
| ------------------------------------------------ | ------------------------------------- | ------------------------------------ |
| `function f() {}` / `function() {}` / `() => {}` | `Scope(block=false)`                  | `Scope(isFunction=true)`             |
| Named fn expr `(function f() {})`                | `f` added to the function's own scope | same                                 |
| `class Foo {}` (declaration)                     | no scope                              | no scope                             |
| `(class Foo {})` (named expression)              | no scope                              | `Scope(isFunction=false)` with `Foo` |
| `{ }` BlockStatement                             | `Scope(block=true)`                   | `Scope(isFunction=false)`            |
| `for (…)` / `for…in` / `for…of`                  | `Scope(block=true)`                   | `Scope(isFunction=false)`            |
| `switch (…)`                                     | `Scope(block=true)`                   | `Scope(isFunction=false)`            |
| `catch (e)`                                      | `Scope(block=true)`                   | `Scope(isFunction=false)`            |
| `export { x } from './y'`                        | `Scope(block=true)` ← unnecessary     | no scope                             |

Notable gap: periscopic creates no scope for named class expressions, so the self-binding name `Foo` in `(class Foo {})` leaks to the outer scope. Our implementation fixes this.

---

## Reference detection

periscopic delegates to the [`is-reference`](https://github.com/nicolo-ribaudo/is-reference) package to decide whether an `Identifier` is a reference. This is equivalent to our `isReferenceIdentifier()` function. Neither implementation re-implements this from scratch — ours is modeled after Vite SSR's `isRefIdentifier`, which is in turn derived from the same lineage.

---

## Reference resolution strategy

### periscopic: post-walk, name-string resolution

1. Walk collects `[scope, Identifier]` pairs into a temporary array.
2. After the walk, for each pair call `scope.find_owner(name)` — a name-string lookup walking up the parent chain.
3. Unresolved names go into `globals`.

`find_owner` is a string-based chain walk:

```js
find_owner(name) {
  if (this.declarations.has(name)) return this;
  return this.parent && this.parent.find_owner(name);
}
```

This looks correct, but the **scope anchor** used for the lookup is wrong in practice (see shadowing bug below).

### Ours: post-walk, Identifier-node resolution

Same two-phase structure, but we store the `Identifier` node itself and resolve against the complete scope tree after the walk. This gives us per-Identifier granularity instead of per-name.

---

## The shadowing bug

This is why periscopic was dropped as a dependency (see `2026-04-04-hoist-variable-shadowing.md`).

The original caller did:

```ts
const scope = analyzed.map.get(functionNode) // returns param scope
const bindVars = [...scope.references].filter((ref) => {
  const owner = scope.find_owner(ref) // name-string lookup
  return owner && owner !== scope && owner !== analyzed.scope
})
```

Two layered problems:

**1. Wrong scope anchor.** `analyzed.map.get(functionNode)` returns the scope for the function node itself, which in periscopic's model is the param scope. The function body (`BlockStatement`) is a child scope of this. `let`/`const` declarations inside the body live in that child scope. So when `find_owner` walks up from the param scope it skips the body-scope declarations, and a body-level `const value` becomes invisible — the lookup walks past it and finds the outer `value` instead.

**2. Name-based references.** `scope.references` is `Set<string>`. There is no way to ask "does this specific reference occurrence resolve inside or outside?" — only "does any declaration of this name exist outside?" A body-scope shadowing declaration is invisible because the reference string `"value"` matches whether it is resolved locally or not.

Together: a `const value` declared inside the server function body would not prevent the outer `value` from being bound, because (a) the anchor scope didn't see the inner declaration, and (b) even if it had, the string-based check couldn't distinguish "this reference resolves to the inner `value`" from "this reference resolves to the outer `value`".

---

## `var` hoisting

periscopic handles `var` hoisting by recursively delegating to the parent scope from within `add_declaration`:

```js
if (node.kind === 'var' && this.block && this.parent) {
  this.parent.add_declaration(node)
}
```

A `var` in a block scope propagates upward until it lands in a non-block (function) scope. This is correct.

Our implementation does the same, but at walk time rather than at declaration-adding time:

```ts
const target = node.kind === 'var' ? current.getNearestFunctionScope() : current
```

---

## `extract_names` / `extract_identifiers`

periscopic exports these two utilities. We copied them directly into our codebase (`src/transforms/utils.ts`) rather than keeping the periscopic dependency. They recursively extract leaf binding names from destructuring patterns:

- `Identifier` → push the name
- `ObjectPattern` → recurse into property values and rest
- `ArrayPattern` → recurse into elements
- `RestElement` → recurse into argument
- `AssignmentPattern` → recurse into left (the binding, not the default)

These are still used by our `buildScopeTree` for param and destructuring declaration handling.

---

## What periscopic has that we don't

- `declarations` maps names to the declaring AST node (not just a string set) — useful if callers need to distinguish declaration kind or locate the declaration site.
- `globals` map — explicit set of undeclared names with the referencing `Identifier` node.
- `initialised_declarations` — subset of declarations that had an initializer.

## What we have that periscopic doesn't

- Per-`Identifier` reference tracking (not per-name) — makes shadowing correctly visible.
- Named class expression scope (self-binding `Foo` in `(class Foo {})`).
- `scopeToReferences` aggregation — O(1) "all references inside scope X".
