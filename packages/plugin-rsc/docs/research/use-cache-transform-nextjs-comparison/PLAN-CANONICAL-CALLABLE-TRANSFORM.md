# Canonical Callable Transform Research Plan

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 28f66372d91df0bdf62b59be15f58e0b3b8548e2
- Branch: callable-inline-hoist
- Worktree: /Users/hogawa/code/others/vite-plugin-react-callable-inline-hoist

## Question

What is the minimum transform-infrastructure change needed to make a framework-produced callable, rather than a raw implementation or a lexical replacement expression, the canonical module binding for a directive-bearing function?

The motivating case is Next.js-compatible callable `"use cache"`, but the model should explain both `"use server"` and framework-owned callable directives without teaching plugin-rsc cache semantics.

## Working Hypothesis

The current transforms are organized around:

```text
runtime(implementation) -> replacement expression
```

The proposed model is organized around:

```text
source function
  -> implementation binding
  -> framework-produced callable binding
  -> canonical export
  -> registration of that binding
  -> optional lexical binding of captures to that binding
```

For `"use server"`, the implementation and callable may be the same binding. For `"use cache"`, the callable is a distinct cache wrapper and must be the value exported, registered, claimed, proxied, and used as the base of inline `.bind()` calls.

React registration is not callable production. `registerServerReference` annotates and returns the selected callable, so registration can be emitted as a side effect after the transform has established the canonical binding.

## Central Existing Asymmetry

The file-level transform already follows the required export semantics: `transformWrapExport` makes the result of `runtime(implementation)` the exported value.

The inline transform does not. `transformHoistInlineDirective` exports the raw hoisted implementation and inserts `runtime(hoistedImplementation)` only at the original lexical site.

```text
file-level
  implementation -> runtime(implementation) -> exported value

inline
  implementation -> exported value
  implementation -> runtime(implementation) -> lexical value
```

This difference is mostly hidden when `runtime` is `registerServerReference`, because React annotates and returns the same function object. It becomes observable when `runtime` creates a distinct callable such as `cacheWrapper(implementation)`: local server execution uses the wrapper, but manifest resolution imports and invokes the raw implementation.

The narrow transform problem is therefore to bring inline hoisting into the export semantics that file-level wrapping already has. Both paths should identify one canonical callable, export that value when transport requires it, register that value, and use that value as the base of any lexical capture binding.

There is a complementary simplification on the file-level path. Raw `"use server"` does not need `runtime(implementation)` to produce a replacement value because `registerServerReference` can annotate the existing exported function by side effect. The current assignment form is useful for a runtime that creates a distinct wrapper, but it is unnecessary for the identity case and forces declaration rewrites such as changing an exported `const` to `let`.

The shared model should therefore support two callable-production modes:

```text
identity mode
  implementation == canonical callable
  export implementation
  register canonical callable by side effect

wrapper mode
  implementation != canonical callable
  canonical callable = framework wrapper(implementation)
  export canonical callable
  register canonical callable by side effect
```

File-level and inline transforms differ in how they obtain the implementation and rewrite the source site, but they should share these callable, export, registration, and binding concepts. Aligning them may make it practical to resolve the existing `transformServerActionServer` TODO to unify top-level and inline directive handling.

## Why This Is Separate From PR #1246

PR #1246 primarily extends the current transforms with additional options and syntax coverage. Its final head adds stable names, parameter metadata, method handling, validation, and an opt-in `exportWrappedHoist` path while retaining the existing `runtime(...)` expression callback and separate module/inline lowering.

`exportWrappedHoist` is evidence for the canonical-binding requirement because it can make an inline wrapper exportable. It is not the target architecture because it leaves that behavior optional and inline-specific, while module-level wrapping still follows the existing reassignment model.

This research will derive the transform model from required output invariants. It will not treat PR #1246's option set as the requirements list or proposed endpoint.

## Required Output Shapes

The investigation will normalize incidental naming and formatting and use these four shapes as the semantic baseline.

### File-Level `"use server"`

```js
export async function myFn(arg) {
  return value(arg)
}

registerServerReference(myFn, ID, null)
```

The implementation is already the canonical callable, so no second binding is required.

### File-Level `"use cache"`

```js
async function myFn$$impl(arg) {
  return value(arg)
}

const myFn$$callable = cacheWrapper(myFn$$impl)
registerServerReference(myFn$$callable, ID, null)
export { myFn$$callable as myFn }
```

The source export resolves to the wrapper, not the implementation.

### Inline `"use server"`

```js
function myOuterFn(capture) {
  const myInnerFn = $$ACTION.bind(null, encode([capture]))
  return myInnerFn
}

export async function $$ACTION(encoded, arg) {
  const [capture] = await decode(encoded)
  return value(capture, arg)
}

registerServerReference($$ACTION, ID, null)
```

The exported implementation is also the canonical callable, and the lexical site binds captures to it.

### Inline `"use cache"`

```js
function myOuterFn(capture) {
  const myInnerFn = $$CACHE.bind(null, encode([capture]))
  return myInnerFn
}

async function $$CACHE_IMPL(encoded, arg) {
  return value(encoded, arg)
}

export const $$CACHE = cacheWrapper($$CACHE_IMPL)
registerServerReference($$CACHE, ID, null)
```

The implementation remains private. The wrapper is created once at module scope, exported as the reference target, registered, and used as the base of the lexical bind.

## Initial Implementation Proposal

The first implementation should be smaller than the full architectural endpoint. It should prove callable wrapped inline hoists without changing existing transform behavior by default.

### Transform Option

Add one provisional option to `transformHoistInlineDirective`:

```ts
hoistRuntime?: boolean
```

The name is open to revision. Its required semantics are more important:

- The existing default remains unchanged.
- The hoisted source function becomes a private implementation binding.
- `runtime(implementation, generatedName, meta)` is evaluated once at module scope.
- Its result is bound under `generatedName` as the canonical callable.
- Existing `noExport` behavior independently controls whether that canonical binding is exported.
- The original lexical site references `generatedName`, then applies the existing optional capture `.bind()`.
- The transform's returned `names` are canonical callable binding names, not private implementation names.

Normalized output:

```js
function myOuterFn(capture) {
  const myInnerFn = $$hoist_0_myInnerFn.bind(null, capture)
  return myInnerFn
}

async function $$hoist_0_myInnerFn$$impl(capture, arg) {
  return value(capture, arg)
}

export const $$hoist_0_myInnerFn = runtime(
  $$hoist_0_myInnerFn$$impl,
  '$$hoist_0_myInnerFn',
)
```

With `noExport: true`, only the visibility changes:

```js
const $$hoist_0_myInnerFn = runtime(
  $$hoist_0_myInnerFn$$impl,
  '$$hoist_0_myInnerFn',
)
```

The runtime still executes once at module scope, and the original lexical site still references `$$hoist_0_myInnerFn`.

For the callable cache integration, `runtime(...)` can remain one expression for this first implementation:

```js
registerServerReference(
  cacheWrapper($$hoist_0_myInnerFn$$impl),
  MODULE_KEY,
  '$$hoist_0_myInnerFn',
)
```

This produces the required exported wrapper even though callable production and registration remain syntactically nested. Separating side-effect registration and adding an identity-production mode should be evaluated after this output is proven.

### Transform Unit Tests

Add focused snapshot tests for:

- Default behavior remains the current lexical runtime expression and raw hoist export.
- `hoistRuntime` without captures emits a private implementation and module-scope runtime result, and the source site references that binding.
- `hoistRuntime` with captures applies `.bind()` to the module-scope runtime result rather than the implementation.
- `hoistRuntime` with `noExport: false` exports the canonical binding.
- `hoistRuntime` with `noExport: true` keeps the canonical binding internal while preserving module-scope wrapper creation.
- The returned `names` contain the canonical callable binding.

Do not add parameter metadata, stable naming, method syntax, or broad validation tests as part of this change.

### `use-cache-callable` Example

Add a dedicated runnable example under `packages/plugin-rsc/examples/use-cache-callable` rather than expanding the server-local `use-cache` example.

Its framework-owned Vite plugin should:

- Match inline `"use cache"` functions in the RSC environment.
- Resolve the module's server-reference key through the existing server-reference manager.
- Enable `hoistRuntime` and leave `noExport` disabled so the canonical callable is manifest-addressable.
- Produce `registerServerReference(cacheWrapper(implementation), key, generatedName)` as the runtime expression.
- Replace its owner claim with the returned canonical export names and clean up stale claims.
- Reuse the example framework's existing browser action transport and RSC action loading.

The example should keep cache behavior intentionally small. It only needs enough observable state to prove that action resolution invokes the cache wrapper rather than bypassing it for the private implementation.

Use one inline cached function that is passed through Flight to a Client Component and invoked from the browser. Include a harmless closure capture so the generated source site exercises `.bind()` against the canonical wrapper. Direct bound values are sufficient for this focused proof; protected capture encryption and cache-key argument admission remain separate concerns.

### E2E Coverage

Add a thin E2E that runs in development and production build modes and proves:

- The inline cached function crosses Flight as a callable server reference.
- A browser invocation resolves the generated canonical export.
- The function receives both its closure capture and invocation argument.
- Repeated calls with the same capture and argument demonstrate a cache hit.
- A different argument demonstrates a cache miss.
- Wrapper instrumentation confirms that the cache wrapper, not the private implementation export, handled the action.
- A clean production build can resolve the generated export through server-reference claims without first warming the module through a development request.

Update the plugin-rsc example listing if the dedicated example is intended to remain as maintained documentation.

### Initial Scope Boundary

The first implementation should not include:

- A file-level callable cache transform or client/SSR proxy generation.
- Identity-mode side-effect registration for built-in `"use server"`.
- Unification of module-level and inline directive traversal.
- File/inline directive-owner composition or PR #1315 fixes.
- Protected capture encryption, parameter admission, or stable generated names.

Those topics remain important experiments and follow-ups, but they are not required to prove that an inline framework wrapper can become the exported callable server-reference target.

## Research Steps

### 1. Establish The Current Transform Model

Trace `transformHoistInlineDirective`, `transformWrapExport`, and `transformServerActionServer` from input syntax to emitted bindings.

Record separately:

- Where the implementation binding is declared.
- Where `runtime(...)` is evaluated.
- Which value is exported.
- Which value the original lexical site references.
- Which names are returned to server-reference orchestration.
- Where module-level and inline behavior diverge.

Use existing transform fixtures as evidence rather than inferring behavior only from helper signatures.

### 2. Identify The Expression-Model Failure

Demonstrate the smallest inline example where `runtime(implementation)` returns a distinct wrapper.

Verify that the current output gives local server execution the wrapper while leaving the raw hoisted implementation as the manifest-addressable export. Explain why later action resolution can therefore bypass framework behavior.

Also record the module-level reassignment behavior, including exported `const` declarations being changed to `let`, so the comparison covers both sides of the current split.

### 3. Derive A Canonical-Binding Lowering

Derive one lowering model from the four required output shapes without starting from existing option names.

The model must identify:

- The private implementation binding, when distinct.
- The canonical callable binding.
- The public source export alias or generated inline export.
- The registration target.
- The base binding used for lexical capture binding.

Determine whether the same internal representation can emit both module-level and inline forms while allowing the identity case to avoid unnecessary aliases for `"use server"`.

Experiment with both production modes explicitly:

- Identity production, where the implementation is exported directly and registration is only a side effect.
- Wrapper production, where a private implementation feeds one module-level canonical callable binding.

Apply both modes to file-level and inline inputs. The resulting matrix should reveal which code-generation steps are shared and which are placement-specific.

### 4. Define The Transform Boundary

Separate syntax-lowering responsibilities from plugin orchestration.

The transform is expected to own implementation extraction, capture analysis, callable binding placement, export rewriting, lexical binding, and reporting canonical export names.

The surrounding plugin is expected to own normalized reference IDs, runtime imports, claims, manifests, client and SSR proxies, environment branching, and cache policy.

Evaluate where registration statement generation belongs. The invariant is fixed: registration targets the canonical callable. The research should compare a transform callback that emits a side-effect statement with returning enough binding metadata for surrounding orchestration, without selecting an API before examining code-generation and source-map constraints.

### 5. Compare With PR #1246 Narrowly

Compare only the parts of PR #1246 that affect callable identity and placement:

- `exportWrappedHoist`.
- The implementation-name split used by that option.
- The generated wrapper export.
- The original site's reference to the generated export.

Classify stable naming, parameter admission metadata, method support, cache-kind metadata, and validation as independent concerns. Do not include them in the minimum canonical-binding contract unless direct evidence shows that the binding model requires them.

### 6. Keep Role Classification As A Separate Layer

Canonical binding lowering does not by itself solve a module-level default owned by one directive and an inline override owned by another. Independent source-to-source passes can still classify and wrap the same source export inconsistently.

Use the completed mixed-directive findings to describe the interface between the layers:

```text
role classification
  -> canonical callable lowering
  -> server-reference orchestration
```

Determine what role information the lowerer must consume and return, but do not expand this investigation into the complete multi-owner plugin design.

This classification problem has its own follow-up deliverable: `FINDINGS-DIRECTIVE-ROLE-CLASSIFICATION.md`.

That follow-up should compare plugin-rsc's exclusive branch:

```text
module "use server" -> wrap exports only
otherwise           -> hoist inline directives only
```

with Next.js's single classification pass:

```text
parse module default role
  -> inspect every function for an explicit role
  -> explicit function role wins
  -> otherwise exported functions inherit the module role
  -> local functions require an explicit role
  -> validate and emit from one role map
```

Its fixture matrix should include:

- File-level `"use server"` with an exported function that has no function directive.
- File-level `"use server"` with a redundant inline `"use server"` on an export.
- File-level `"use server"` with a local inline `"use server"` function.
- File-level `"use server"` with an exported or local inline `"use cache"` override.
- File-level `"use cache"` with an inline `"use server"` override.
- Validation differences between inherited export roles and explicitly annotated local functions.

The follow-up should determine whether the correct shared abstraction is a module default plus per-function explicit roles, and what classified role map canonical-callable lowering and client proxy generation need. It should build on the existing mixed-directive findings rather than treating independent transform composition as the target architecture.

[PR #1315](https://github.com/vitejs/vite-plugin-react/pull/1315) is the concrete plugin-rsc regression target for this follow-up. It adds both composition orders after the server-reference ownership work in PR #1310:

- File-level `"use server"` with an inline `"use custom-server"` override.
- File-level `"use custom-server"` with an inline `"use server"` override.

The ownership manager can aggregate disjoint claims and reject duplicate ownership, but it operates after independent transforms have already classified functions, rewritten bindings, and selected exports. PR #1315 therefore tracks a real remaining problem in the new ownership model, but that problem is not part of the initial canonical-callable task.

The initial task should assume that one directive owner has already been selected for each function. Its target is only to make that owner's distinct wrapped inline callable the exported, registered, and bound reference. It should not attempt to make independently ordered file-level and inline directive transforms compose. The role-classification follow-up should use PR #1315's E2E cases when it addresses that separate concern.

### 7. Evaluate The Smallest Change Surface

Compare three implementation directions:

1. Extend the current inline transform with another option.
2. Refactor the current module and inline transforms around a shared canonical-binding primitive.
3. Introduce one role-aware directive-function transform and retain the old helpers as lower-level compatibility surfaces.

Judge them against output consistency, API size, source-map placement, compatibility with built-in `"use server"`, and whether distinct framework wrappers require exceptional options.

The preferred direction should make the canonical wrapper path ordinary rather than an opt-in branch, while avoiding unrelated feature additions.

Prototype a simplified side-effect mode for `transformWrapExport` or an equivalent shared primitive. For raw `"use server"`, it should preserve existing export declarations and append registration against those bindings instead of converting declarations and assigning the registration result. Compare this with the wrapper mode and determine whether both can be expressed by one callable-production contract.

Then test whether `transformServerActionServer` can consume the same role and callable-production concepts for module-level and inline directives. Unification is a possible consequence of the model, not a requirement to force before the two modes produce correct standalone output.

## Questions To Resolve

- Does the transform need to generate registration statements, or should it report canonical bindings to its caller?
- Can implementation and callable identity be represented without always emitting two bindings?
- Can a file-level identity mode preserve export declarations and avoid assignment or `const`-to-`let` rewriting?
- Should source export names and generated reference export names be represented separately in the transform result?
- Can module-level and inline lowering share one emitter while retaining their different source-site rewrites?
- Can `transformServerActionServer` replace its current module-versus-inline branch with shared classification and callable production?
- What source-map placement obligations currently motivate reassignment and lexical runtime expressions?
- Which existing transform callers depend on the runtime callback's return value being inserted directly?
- Is a new primitive preferable to changing the established low-level helper contracts?

## Non-Goals

- Designing cache storage, invalidation, lifetime, replay, or handler selection.
- Reproducing Next.js argument-admission metadata.
- Selecting a stable ID or generated-name policy.
- Expanding supported object, class, method, or export syntax.
- Designing the complete claims, manifest, proxy, or environment API.
- Making every custom directive remotely callable.
- Treating PR #1246 as either the implementation target or a requirements baseline.

## Success Criteria

The research is complete when it can:

1. Explain the current expression-replacement model using exact emitted output.
2. Show why a distinct inline wrapper must become a module-level canonical export.
3. Define one binding invariant that covers all four directive-placement cases.
4. Separate callable production from side-effect registration and transport orchestration.
5. Identify the minimum transform change needed to establish that invariant.
6. State whether the change should refactor existing helpers or introduce a narrower shared primitive.
7. Keep mixed-role classification and unrelated #1246 features explicitly outside the core change.

## Planned Result

Produce a focused findings note that recommends a transform direction and illustrates its minimum API or internal representation only after the current callers and source-map constraints have been verified. Do not implement repository changes as part of the research unless a small disposable prototype is needed to validate emitted output.
