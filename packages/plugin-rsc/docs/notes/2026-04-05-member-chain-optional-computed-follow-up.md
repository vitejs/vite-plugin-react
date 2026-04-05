# Member-Chain Follow-Up: Optional and Computed Access

## Goal

Track the next step after plain non-computed member-chain binding:

- optional chaining, e.g. `x?.y.z`, `x.y?.z`
- computed access, e.g. `x[y].z`, `x.y[k]`

This note is intentionally a follow-up to the plain member-chain work in
[2026-04-05-rsc-member-chain-binding-plan.md](./2026-04-05-rsc-member-chain-binding-plan.md).
It is not part of the current cleanup / plain-chain implementation.

## Current state

The current implementation is intentionally narrow:

- plain non-computed member chains like `x.y.z` are captured precisely
- unsupported hops stop capture at the last safe prefix
- examples:
  - `x?.y.z` -> bind `x`
  - `a.b?.c` -> bind `{ b: a.b }`
  - `x[y].z` -> bind `x`

This is a reasonable conservative failure mode, but it is not full support.

## Why this needs a separate design

The current `BindPath` shape in [src/transforms/hoist.ts](../../src/transforms/hoist.ts)
is effectively:

```ts
type BindPath = {
  key: string
  segments: string[]
}
```

That is enough for `x.y.z` because codegen can reconstruct the bind expression
from the root identifier plus dot segments.

It is not enough for:

- `x?.y.z`
- `x.y?.z`
- `x[y].z`
- `x?.[y]`

The missing information is not cosmetic. It changes semantics.

### Optional chaining

Each hop needs to preserve whether access is optional.

Example:

```js
x?.y.z
```

Reconstructing this as `x.y.z` is wrong because the bind-time access becomes
stricter than the original expression.

### Computed access

Each computed hop needs the property expression, not just a string segment.

Example:

```js
x[y].z
```

There is no way to reconstruct this faithfully from `["y", "z"]`, because the
first `y` is an expression, not a property name.

### Computed key expressions also have their own closure semantics

Computed access is not only a codegen problem. The key expression itself may
close over outer variables, or it may be local to the action.

Outer-scope key:

```js
function outer() {
  let key = 'x'
  let obj = {}
  async function action() {
    'use server'
    return obj[key]
  }
}
```

Both `obj` and `key` are outer captures.

Action-local key:

```js
function outer() {
  let obj = {}
  async function action() {
    'use server'
    let key = 'x'
    return obj[key]
  }
}
```

Only `obj` is an outer capture; `key` is local to the action.

So any future `obj[expr]` support must treat the computed key as an ordinary
expression with its own scope resolution, not just as a printable suffix on a
member path.

## Minimum data model change

To support these cases, `BindPath` needs richer per-hop metadata.

Sketch:

```ts
type BindSegment =
  | { kind: 'property'; name: string; optional: boolean }
  | { kind: 'computed'; expr: Node; optional: boolean }

type BindPath = {
  key: string
  segments: BindSegment[]
}
```

This is enough to represent:

- `.foo`
- `?.foo`
- `[expr]`
- `?.[expr]`

The exact `key` design is still open. It only needs to support dedupe among
captures that are semantically comparable.

## Required implementation areas

### 1. `scope.ts`: capture shape

In [src/transforms/scope.ts](../../src/transforms/scope.ts),
`getOutermostBindableReference()` currently accumulates only plain
non-computed member chains and stops at unsupported hops.

To support optional/computed access, capture analysis must preserve richer
member-hop metadata instead of reducing everything to `Identifier` or
`MemberExpression` with plain identifier-name segments.

That likely means changing either:

- what `referenceToNode` stores, or
- adding a new structured capture representation derived from the AST

### 2. `hoist.ts`: path extraction

In [src/transforms/hoist.ts](../../src/transforms/hoist.ts),
`memberExpressionToPath()` currently extracts only `string[]` segments.

That helper would need to become a structured extractor that records:

- property vs computed
- optional vs non-optional
- enough information to regenerate the bind expression

### 3. Dedupe semantics

Current prefix dedupe is straightforward for plain dot paths:

- `x.y` covers `x.y.z`
- `x` covers everything below it

With optional/computed access, dedupe needs clearer rules.

Questions:

- does `x.y` cover `x.y?.z`?
- does `x[y]` cover `x[y].z` only when the computed key expression is identical?
- how should keys be normalized for comparison?

The current antichain logic should not be reused blindly.

### 3a. Support boundary for `obj[expr]`

This is still intentionally unresolved.

Possible support levels:

1. Keep current safe-prefix bailout only.
   Examples:
   - `obj[key]` -> bind `obj`, bind `key` separately if it is an outer capture
   - `obj[key].value` -> bind `obj`, bind `key` separately if needed

2. Support exact computed member captures only for simple shapes.
   Examples:
   - `obj[key]`
   - `obj[key].value`
     but only when we have a clear representation for both the base object and the
     key expression.

3. Support computed access as a first-class bind path.
   This would require fully defining:
   - path equality
   - prefix coverage
   - codegen for bind expressions
   - partial-object synthesis, if still applicable

At the moment, the note does not assume we will reach (3). It is entirely
reasonable to stop at (1) or (2) if the semantics and implementation cost of
full computed-path support are not compelling.

### 4. Bind-expression codegen

Current codegen only needs:

- `root`
- `segments: string[]`

and synthesizes:

```ts
root + segments.map((segment) => `.${segment}`).join('')
```

That must be replaced with codegen that can emit:

- `.foo`
- `?.foo`
- `[expr]`
- `?.[expr]`

### 5. Partial-object synthesis

This is the hardest part.

For plain member paths, partial-object synthesis is natural:

```js
{
  y: {
    z: x.y.z
  }
}
```

For computed access, synthesis is less obvious:

```js
x[k].z
```

Questions:

- should this become an object with computed keys?
- should computed paths fall back to broader binding even after we support
  recognizing them?
- does partial-object binding remain the right representation for these cases?

This is where the design may need to diverge from plain member chains.

### 6. Comparison with Next.js

Relevant prior art is documented in
[scope-manager-research/nextjs.md](./scope-manager-research/nextjs.md).

Important comparison points:

- Next.js already models optional member access in its `NamePart` structure.
- Next.js does not support computed properties in the captured member-path
  model.
- Next.js member-path capture is deliberately limited to member chains like
  `foo.bar.baz`.

That means:

- optional chaining has direct prior art in Next.js's capture model
- computed access does not; if we support it, we are going beyond the current
  Next.js design

This should affect scoping decisions for the follow-up:

- optional support is an extension of an already-established member-path model
- computed support is a materially larger design question, especially once key
  expression scope and dedupe semantics are included

## Safe intermediate target

If we want a minimal correctness-first follow-up:

1. keep the current safe-prefix bailout behavior
2. add explicit tests for optional/computed cases
3. only implement richer capture metadata once codegen and dedupe rules are
   agreed

That avoids regressing semantics while leaving room for a more precise design.

## Temporary conclusion

Current working direction:

- likely support optional chaining next, to align with Next.js's existing
  member-path behavior
- keep computed access as a separate, open design problem for now

Rationale:

- optional chaining already has prior art in Next.js's capture model
- computed access is materially more complex because it mixes:
  - key-expression scope resolution
  - path equality / dedupe rules
  - bind-expression codegen
  - unclear partial-object synthesis semantics

So the likely near-term path is:

1. support optional member chains
2. keep current conservative behavior for computed access
3. revisit computed support only if there is a clear use case and a concrete
   design that handles key-expression closure semantics correctly

## Suggested first questions before coding

1. Optional chains:
   Should the first supported version preserve optional syntax exactly in the
   bound expression, or should optional hops continue to bail out?

2. Computed access:
   Do we want exact support for `x[y].z`, or only a less coarse bailout than
   binding the whole root?

3. Binding shape:
   Is partial-object synthesis still the preferred strategy for computed access,
   or does this push us toward a different representation?

4. Computed key scope:
   If we support `obj[expr]`, what is the intended contract for the key
   expression?
   Specifically:
   - must outer variables used in `expr` always be captured independently?
   - do we need a representation that distinguishes outer `key` from
     action-local `key` when deciding support and dedupe?

5. Comparison target:
   Do we want to stay aligned with Next.js and continue treating computed access
   as out of scope, or intentionally support a broader feature set?

## Candidate tests

Add focused hoist fixtures for:

1. `x?.y.z`
2. `x.y?.z`
3. `x?.y?.z`
4. `x[y].z`
5. `x.y[k]`
6. `x[y]?.z`
7. `a.b?.c` as a safe-prefix bailout baseline
8. `a[b].c` as a safe-prefix bailout baseline
