# `use cache` Transform Comparison Findings

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 32611a28365435d81a513c559715411bdc8f127e
- Branch: main
- Next.js repo: git@github.com:vercel/next.js.git
- Next.js commit: 153bf8ac5fa00888ef5fbb2b65cac12f0942a44f
- Next.js branch: canary

## Executive Findings

The minimal demo and Next.js use different transform-to-runtime ABIs, but the difference is larger than the demonstrated semantic gap.

The demo lowers a cached function to a hoisted implementation wrapped by `cacheWrapper(fn)`, then uses ordinary `.bind()` to attach closure captures. Next.js emits a module-level wrapper that calls `cache(kind, id, boundArgsLength, innerFn, args)` and packages closure captures into one protected leading argument.

For the current in-process RSC demo, the generic hoist-and-bind representation is sufficient for the transform-dependent central behavior: per-function cache separation, closure values in cache keys, nested closures, and cached component props.

Most additional Next.js ABI fields support concerns deferred from this comparison, especially cross-environment server references, protected bound arguments, persistent identity, custom handlers, and framework policy. Their presence does not by itself demonstrate a limitation in the generic hoister.

The clearest transform-relevant semantic difference in the first-pass scope is argument admission. Next.js emits whether to pass an empty list for an empty transformed signature, a fixed transformed-parameter prefix, or all arguments for a rest/unknown signature. The fixed prefix includes one protected capture-payload slot when captures exist. The demo wrapper receives and keys every supplied argument. Exact Next.js-style omission of extra arguments cannot be recovered reliably from the function object alone, so it requires different generated output or additional runtime metadata.

Two apparent gaps are integration choices rather than generic-hoister limitations:

- Single-argument capture packaging and reconstruction for the inner function are available through the hoister's existing `encode` and `decode` hooks, but the cache demo does not configure them. Making that boundary visible to the cache runtime still requires a self-describing payload or transform metadata.
- Cache-kind metadata is available through regex directive matching and `directiveMatch`, but the cache demo matches only exact `"use cache"` and ignores the metadata.

## Emitted Pipelines

### Minimal Demo

The cache plugin calls the generic hoister with a one-argument runtime expression in [packages/plugin-rsc/examples/basic/vite.config.ts:338](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/vite.config.ts#L338).

```text
source function
  -> hoisted implementation H(captures..., invocationArgs...)
  -> cacheWrapper(H)
  -> optional .bind(null, captures...)
  -> cached callable
```

Normalized output:

```js
function outer(capture) {
  const fn = cacheWrapper(H).bind(null, capture)
  return fn
}

async function H(capture, arg) {
  'use cache'
  return body(capture, arg)
}
```

The transform prepends captures to the original parameters and applies binding after the runtime expression in [packages/plugin-rsc/src/transforms/hoist.ts:76](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.ts#L76) and [packages/plugin-rsc/src/transforms/hoist.ts:113](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.ts#L113).

The runtime receives only `H`. A later invocation presents bound captures and call-time arguments as one positional `args` list in [packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx:20](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx#L20).

### Next.js

Next.js creates a distinct inner implementation and module-level runtime wrapper in [crates/next-custom-transforms/src/transforms/server_actions.rs:3063](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L3063).

```text
source function
  -> inner implementation H([captures...], invocationArgs...)
  -> module-level React.cache wrapper
  -> cache(kind, id, captureCount, H, admittedArgs)
  -> registered callable
  -> optional .bind(null, protectedCapturePayload)
```

Normalized output:

```js
const H = async function fn([capture], arg) {
  return body(capture, arg)
}

export const REF = React.cache(function fn() {
  return cache('default', ID, 1, H, slice.call(arguments, 0, 2))
})

registerServerReference(REF, ID, null)

function outer(capture) {
  return REF.bind(null, encryptActionBoundArgs(ID, capture))
}
```

The transform creates the capture-array parameter and records its length in [crates/next-custom-transforms/src/transforms/server_actions.rs:889](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L889). It emits the five-part runtime call in [crates/next-custom-transforms/src/transforms/server_actions.rs:2979](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L2979).

A representative nested cache output is [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/40/output.js:6](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/40/output.js#L6).

## Focused Fixture Comparison

| Fixture                | Minimal demo representation                                                      | Next.js representation                                                    | First-pass semantic result                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Plain async function   | `cacheWrapper(H)`                                                                | `React.cache(() => cache(kind, id, 0, H, []))`                            | Both provide one reusable callable during the loaded module lifetime.                                               |
| Explicit arguments     | Wrapper receives every supplied argument                                         | Transform emits `[]`, a declared-prefix slice, or all arguments           | Extra undeclared arguments affect demo keys but are omitted by Next.js for fixed signatures.                        |
| One closure capture    | Capture is a leading parameter and direct `.bind()` argument                     | Captures form one leading array parameter and one protected bound payload | Both preserve the capture in execution and key material. Only Next.js preserves the boundary explicitly at runtime. |
| Nested closure         | Runtime expression runs at the original nested site; runtime deduplicates by `H` | Base wrapper is hoisted once; nested site creates a bound callable        | Current demo semantics are equivalent because its runtime memoizes wrappers by `H`.                                 |
| Member-only capture    | Transform constructs a partial object preserving source member paths             | Transform binds selected leaf/path values and rewrites references         | Both avoid capturing the unused root object. No feature difference was demonstrated.                                |
| Cached component props | Props are one ordinary invocation argument                                       | Props are one ordinary invocation argument                                | No component-specific transform difference. Dynamic-child behavior is runtime-only here.                            |

Next.js plain-function output is illustrated by [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/33/output.js:5](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/33/output.js#L5). Fixed-argument slicing is visible in [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/48/output.js:27](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/48/output.js#L27). Component props remain one argument in [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/41/output.js:13](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/41/output.js#L13).

## Transform Information Inventory

| Information                   | Minimal cache demo                                | Generic hoister capability                                                                         | Next.js                                                                   |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Inner implementation          | Passed directly as `fn`                           | Explicit                                                                                           | Passed explicitly as `originalFn`                                         |
| Identity within loaded module | Hoisted function object                           | Generated hoist name is also available to runtime callback                                         | Generated reference ID and wrapper object                                 |
| Cache kind                    | Not emitted                                       | `directiveMatch` can expose it when using a regex                                                  | Explicit `kind` argument                                                  |
| Capture values                | Flattened into leading runtime arguments          | Can be packaged with `encode` and reconstructed with `decode`                                      | One protected payload reconstructed as a capture array                    |
| Capture count                 | Not passed to cache runtime                       | Known internally, but absent from runtime callback metadata                                        | Explicit `boundArgsLength`                                                |
| Capture/invocation boundary   | Not observable to current runtime                 | Captures can occupy one encoded leading slot, but the runtime is not told whether that slot exists | Explicit through bound payload, count, and capture-array parameter        |
| Positional argument admission | Not emitted; all supplied arguments reach runtime | AST and capture analysis have the information, but runtime callback metadata does not              | Explicit generated `[]`/transformed-prefix-slice/all-arguments expression |
| Member-only capture           | Partial object synthesized at bind site           | Built in for plain member chains                                                                   | Selected paths bound and body references rewritten                        |
| Registration metadata         | Ignored by demo                                   | Runtime callback receives generated hoist name; surrounding Vite plugin can add module identity    | Generated ID, exported reference, registration call, and manifest comment |

The generic runtime callback receives the generated value, name, and directive match in [packages/plugin-rsc/src/transforms/hoist.ts:21](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.ts#L21), but the demo callback uses only the value in [packages/plugin-rsc/examples/basic/vite.config.ts:346](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/vite.config.ts#L346).

## Detailed Findings

### 1. Capture Flattening Is A Demo Choice, Not A Hoister Ceiling

The current cache demo does not configure `encode` or `decode`, so each captured variable becomes a direct leading `.bind()` argument and the cache runtime sees captures plus invocation arguments as one list.

The generic transform can instead bind one encoded capture payload and decode it into the original capture bindings inside the hoisted function. This behavior is implemented in [packages/plugin-rsc/src/transforms/hoist.ts:81](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.ts#L81) and demonstrated by [packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.encode.js:1](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.encode.js#L1).

The production server-action integration already uses these hooks for protected bound arguments in [packages/plugin-rsc/src/plugin.ts:2059](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/plugin.ts#L2059).

This means the generic approach can package captures into one slot and reconstruct them inside the inner implementation. It does not by itself expose the slot's meaning to the cache runtime because `decode` runs inside `H`, after the wrapper has received the arguments. A cache runtime that must interpret the payload before calling `H` needs either a self-describing payload or capture metadata in the transform/runtime contract.

### 2. Wrapper Placement Shifts A Requirement To The Runtime

For a nested cached function, the demo emits `cacheWrapper(H)` at the original declaration site. Re-entering the outer function therefore evaluates the runtime expression again and creates a fresh `.bind()` result.

The demo runtime compensates by memoizing `cacheWrapper(H)` in a `WeakMap`, so every evaluation for the same module-level `H` recovers the same base cached wrapper in [packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx:14](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx#L14). The bound callable is fresh, but cache entries remain attached to the shared base wrapper.

Next.js hoists the base wrapper itself to module scope, then creates only the bound callable at the nested site. This makes one-time base-wrapper creation a transform guarantee rather than a runtime convention.

No current semantic gap results because the demo runtime satisfies the convention. A future runtime that stores state during wrapper construction must retain function-object memoization or the transform would need to hoist wrapper creation as Next.js does.

### 3. Argument Admission Is A Genuine Transform-Output Difference

The demo wrapper is variadic and serializes every supplied argument. The transform preserves the original implementation parameters but does not tell the runtime how many invocation arguments are semantically admitted.

Next.js emits argument normalization from the AST in [crates/next-custom-transforms/src/transforms/server_actions.rs:3005](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L3005):

- `[]` when the transformed inner function has no parameters, which means it has neither captures nor source parameters.
- `slice(arguments, 0, transformedParameterCount)` for a fixed signature. This is the source parameter count plus one payload slot when the function has captures.
- `slice(arguments)` when rest parameters are present or the signature is not statically known.

Consequently, `cached(1, 2, extra)` and `cached(1, 2, anotherExtra)` share a Next.js entry when the function declares only two fixed parameters, but produce different demo keys.

`Function.length` cannot reproduce this exactly because default and rest parameters make it an incomplete representation of the source signature, and the runtime also needs to account for transform-generated capture slots. Exact parity requires a generated wrapper that performs the slicing before entering the runtime or transform-produced total-admitted-prefix metadata consumed by the runtime.

### 4. Cache Kind Is Missing Only From The Demo Integration

Next.js passes the parsed cache kind directly to its runtime, which uses it for handler selection in [packages/next/src/server/use-cache/use-cache-wrapper.ts:1612](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1612). Custom-kind output is shown in [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/38/output.js:4](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/38/output.js#L4).

The demo matches only exact `"use cache"`, but the generic hoister supports regex directives and passes the match to the runtime callback. This is covered by [packages/plugin-rsc/src/transforms/hoist.test.ts:445](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.test.ts#L445).

Supporting kind dispatch would require changing the demo integration and runtime signature, not the generic transform approach.

### 5. Function Identity Is Adequate For The Current Demo Scope

The demo scopes cache entries first by the hoisted function object and then by serialized arguments. That provides per-definition isolation while the module instance remains loaded.

Next.js supplies a generated reference ID to the runtime and includes it in cache-key parts in [packages/next/src/server/use-cache/use-cache-wrapper.ts:2016](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L2016). The transform hashes salt, filename, and export/generated name, then adds a leading metadata byte encoding cache/action type and parameter/rest information in [crates/next-custom-transforms/src/transforms/server_actions.rs:284](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L284).

This richer identity is not needed for the current in-memory demo because its entries cannot outlive the function object. Whether a generated ID is sufficient or necessary across builds, HMR, deployments, persistent stores, or distributed handlers remains a follow-up rather than a first-pass finding.

### 6. Capture Representation Differs Without A Demonstrated Feature Gap

For member-only access such as `x.y.z`, the generic hoister keeps the inner body unchanged and binds a synthesized partial object such as `{ y: { z: x.y.z } }`. The output is demonstrated in [packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.js:1](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.js#L1).

Next.js collects member paths, retains the shortest covering path, binds selected values, and rewrites inner references. The path reduction is implemented in [crates/next-custom-transforms/src/transforms/server_actions.rs:2918](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L2918).

Both approaches avoid serializing unused parts of the root object. The demo may serialize constant property labels and wrapper objects that Next.js avoids, but no relevant runtime feature was found that depends on this representational difference. Syntax coverage for computed access, optional access, and other complex forms belongs to the broader-transform follow-up.

## Capability Matrix

| Capability                                        | Demo status                                            | Transform dependency                                                                         | Classification                                         |
| ------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Per-definition in-memory cache isolation          | Supported through hoisted function-object identity     | Hoisted implementation object                                                                | Directly supported                                     |
| Closure values participate in cache identity      | Supported as leading arguments                         | Capture collection and binding                                                               | Directly supported                                     |
| Nested cached closures share base cache state     | Supported because runtime memoizes by hoisted function | Hoisted implementation identity; wrapper placement creates a runtime obligation              | Runtime-only convention with current transform support |
| Distinguish one bound payload from call arguments | Not used by cache demo                                 | Existing hooks can package captures, but runtime-visible distinction needs a tag or metadata | Integration protocol or small ABI extension            |
| Ignore extra positional arguments                 | Not supported exactly                                  | Total admitted transformed prefix and rest/unknown policy                                    | Genuine generated-output change or ABI extension       |
| Dispatch by cache kind                            | Not supported by demo                                  | Directive match already available                                                            | Integration/runtime change, not a hoister extension    |
| Invoke an unwrapped inner implementation          | Supported because runtime receives `H`                 | Hoisted implementation                                                                       | Directly supported                                     |
| Persistent or distributed identity                | Not evaluated                                          | Likely requires generated identity and build/storage policy                                  | Follow-up                                              |
| Cross-environment bound references                | Not evaluated                                          | Requires registration and protected bound-reference protocol                                 | Follow-up                                              |

## Smallest Relevant Changes

### Exact Argument Admission

Emit a generated wrapper that supplies only admitted arguments, or extend the transform/runtime contract with positional-argument policy. The minimum useful metadata for the latter is total admitted positional prefix, including any transform-generated capture slot, versus pass-all for rest or unknown signatures. This is the only clear generic generated-output change identified in the first pass.

### Cache Kind

Change the demo directive to a regex, derive the kind from `directiveMatch`, and call a runtime accepting `(kind, fn)`. No generic-hoister change is required.

### Packaged Captures

Use existing `encode` and `decode` hooks if a future inner implementation needs captures packaged into one bound payload. Use a self-describing payload or add capture metadata to the runtime callback if the cache runtime must inspect, decode, key, or validate that payload before invoking the inner function.

### Generated Identity

The runtime callback already receives the generated hoist name, and the surrounding Vite transform hook can incorporate module identity as the production server-action integration does in [packages/plugin-rsc/src/plugin.ts:2061](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/plugin.ts#L2061). Define the required lifetime and invalidation semantics before changing the cache ABI; that design belongs to the stable-identity follow-up.

## Completed Follow-Ups

- [Stability across builds, HMR, deployments, persistent stores, and distributed handlers](./FINDINGS-STABLE-CACHE-IDENTITY.md).

## Planned Transform Follow-Ups

### Mixed-directive Composition

Research whether Next.js processes module-level `"use server"` and inline `"use cache"` through one shared traversal, which directive combinations are legal, and how wrapping, hoisting, export generation, and validation interact. Compare that output with applying independent Vite `"use server"` and `"use cache"` transforms in different orders, including whether the first transform hides directives or exports needed by the second. A representative real-world case is [`app/[locale]/category/actions.ts:19`](https://github.com/vercel-partner-solutions/the-platform-press/blob/0fdee98ad98766f36baf948a48d0df5705b27811/app/%5Blocale%5D/category/actions.ts#L19).

Deliverable: `FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md` containing an equivalent fixture matrix, normalized one-pass and composed-pass outputs, transform-order failure modes, and a recommendation on whether Vite needs one shared traversal, a directive-neutral intermediate representation, or stricter composition contracts between existing transforms.

This track excludes cache storage behavior and broad syntax coverage unless a syntax form demonstrates a composition problem.

### Broader Transform Surface

Research source forms deferred from the first comparison: named and default exports, module-level directives, object and class methods, computed and optional member access, destructuring, shadowing, nested closures, and capture-path reduction. Compare semantic support rather than incidental formatting.

Deliverable: `FINDINGS-BROADER-TRANSFORM-SURFACE.md` containing a Next.js versus Vite/PR #1246 capability matrix, focused input/output fixtures for each materially different form, classification of unsupported forms as transform limitations or intentional exclusions, and the smallest generic-hoister changes needed for parity.

This track excludes diagnostics except where generated output is unsound without rejection, and it excludes cross-environment transport after confirming that the correct callable shape is emitted.

### Transform Validation

Research validation only after the mixed-directive and broader-surface semantics are established. Inventory checks that protect transform invariants, such as unsupported `this`, `super`, or `arguments` capture, illegal directive combinations, non-async functions, invalid method forms, and client-boundary restrictions. Do not pursue message wording parity without a behavioral reason.

Deliverable: `FINDINGS-TRANSFORM-VALIDATION.md` containing an invalid-input fixture matrix, the invariant protected by each error, current Next.js and Vite behavior, missing checks that otherwise produce invalid or misleading output, and a minimum validation contract for the public transform helpers.

This track excludes framework cache policy validation and comprehensive diagnostic text matching.

## Planned Integration Follow-Up

### Server-reference Transport

Research cross-environment server-reference registration and protected bound arguments for module-level cached exports imported by Client Components and inline cached closures passed through Flight. Focus on which wrapper, identity, parameter shape, and capture metadata must be produced by the transform versus which proxy, manifest, encryption, and resolution steps can reuse existing `"use server"` orchestration.

Deliverable: `FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md` containing normalized Next.js and Vite pipelines, module and inline fixture comparisons, exact wrapper-registration and encrypted-binding order, a transform-versus-orchestration responsibility matrix, an assessment of whether PR #1246 supplies the complete transform ABI, and the smallest integration API or composition change for any demonstrated gap. End with a narrowly specified development-and-build E2E proof rather than implementing the cache runtime in the research note.

This track excludes cache result serialization, replay, storage, invalidation, and handler policy unless one requires additional transform-produced information.

## Research Order

1. Mixed-directive composition, because it determines whether later work can assume independent transforms are composable.
2. Server-reference transport, because it exercises the generated identity, wrapped export, parameter metadata, and protected capture boundary together.
3. Broader transform surface, once the composition architecture is understood.
4. Transform validation, after supported semantics and intentional exclusions are known.

## Excluded Runtime Observations

Both implementations perform Flight argument encoding, temporary-reference management, pending-call deduplication, result-stream serialization, and replay in runtime code. The focused inspection found no additional transform information required for those techniques once each runtime has its chosen function identity and argument list. They were therefore excluded from the capability comparison.

Next.js cache life, tags, prerender stages, custom handler policy, resume data, and invalidation are also outside this transform-derived investigation.

## Verification

The findings use existing transform snapshots and direct source inspection. No repository files were modified and no test suites were run because the relevant emitted forms are already snapshot fixtures in both repositories.
