# `use cache` Transform Comparison Findings

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 32611a28365435d81a513c559715411bdc8f127e
- Branch: main
- Worktree: /Users/hogawa/code/others/vite-plugin-react
- Next.js repo: git@github.com:vercel/next.js.git
- Next.js commit: 153bf8ac5fa00888ef5fbb2b65cac12f0942a44f
- Next.js branch: canary
- Next.js worktree: /Users/hogawa/code/others/next.js

## Executive Findings

The minimal demo and Next.js use different transform-to-runtime ABIs, but the difference is larger than the demonstrated semantic gap.

The demo lowers a cached function to a hoisted implementation wrapped by `cacheWrapper(fn)`, then uses ordinary `.bind()` to attach closure captures. Next.js emits a module-level wrapper that calls `cache(kind, id, boundArgsLength, innerFn, args)` and packages closure captures into one protected leading argument.

For the current in-process RSC demo, the generic hoist-and-bind representation is sufficient for the transform-dependent central behavior: per-function cache separation, closure values in cache keys, nested closures, and cached component props.

Most additional Next.js ABI fields support concerns deferred from this comparison, especially cross-environment server references, protected bound arguments, persistent identity, custom handlers, and framework policy. Their presence does not by itself demonstrate a limitation in the generic hoister.

The built-in inline `"use server"` paths provide a useful baseline. Plugin-rsc already uses the same generic hoister with exported implementations, protected capture encoding and decoding, React server-reference registration, and manifest identity. Next.js uses the equivalent server-action shape. The cache demo deliberately selects a smaller, server-local configuration of that existing infrastructure rather than demonstrating the full server-reference contract.

The clearest transform-relevant semantic difference in the first-pass scope is argument admission. Next.js emits whether to pass an empty list for an empty transformed signature, a fixed transformed-parameter prefix, or all arguments for a rest/unknown signature. The fixed prefix includes one protected capture-payload slot when captures exist. The demo wrapper receives and keys every supplied argument. Exact Next.js-style omission of extra arguments cannot be recovered reliably from the function object alone, so it requires different generated output or additional runtime metadata.

Two apparent gaps are integration choices rather than generic-hoister limitations:

- Single-argument capture packaging and reconstruction for the inner function are available through the hoister's existing `encode` and `decode` hooks, but the cache demo does not configure them. Making that boundary visible to the cache runtime still requires a self-describing payload or transform metadata.
- Cache-kind metadata is available through regex directive matching and `directiveMatch`, but the cache demo matches only exact `"use cache"` and ignores the metadata.

## Emitted Pipelines

### Directive Placement Overview

Directive placement selects a materially different transform path. These four examples use normalized output and omit imports and manifest comments.

#### File-level `"use server"`

Input:

```js
'use server'

export async function myFn(arg) {
  console.log(arg)
}
```

Plugin-rsc wraps and re-exports the existing module binding:

```js
async function myFn(arg) {
  console.log(arg)
}

myFn = registerServerReference(myFn, MODULE_KEY, 'myFn')
export { myFn }
```

Next.js keeps the existing export, validates the server-entry exports, and registers the function by side effect:

```js
export async function myFn(arg) {
  console.log(arg)
}

ensureServerEntryExports([myFn])
registerServerReference(myFn, ID, null)
```

Neither transform hoists a closure because the directive assigns a role to existing module exports. Plugin-rsc selects this export-wrapping path in [server-action.ts:30](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/server-action.ts#L30). Next.js fixture [server-graph/14/output.js:2](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/14/output.js#L2) shows the registration and validation shape.

#### Function-level `"use server"`

Input:

```js
function myOuterFn(capture) {
  async function myInnerFn(arg) {
    'use server'
    console.log(capture, arg)
  }

  return myInnerFn
}
```

Both transforms must create a module export because `myInnerFn` begins as a local closure:

```js
// Plugin-rsc original site
const myInnerFn = registerServerReference(
  $$hoist_0_myInnerFn,
  MODULE_KEY,
  '$$hoist_0_myInnerFn',
).bind(null, encryptActionBoundArgs([capture]))

// Plugin-rsc generated module export
export async function $$hoist_0_myInnerFn(encoded, arg) {
  const [capture] = await decryptActionBoundArgs(encoded)
  console.log(capture, arg)
}

// Next.js original site
const myInnerFn = $$RSC_SERVER_ACTION_0.bind(
  null,
  encryptActionBoundArgs(ID, capture),
)

// Next.js generated module export
export const $$RSC_SERVER_ACTION_0 = async function myInnerFn(bound, arg) {
  const [capture] = await decryptActionBoundArgs(ID, bound)
  console.log(capture, arg)
}
registerServerReference($$RSC_SERVER_ACTION_0, ID, null)
```

The complete aligned outputs appear in [FINDINGS-INLINE-DIRECTIVE.md](./FINDINGS-INLINE-DIRECTIVE.md#equivalent-example) and again below as the server-function baseline.

#### File-level `"use cache"`

Input:

```js
'use cache'

export async function myFn(arg) {
  console.log(arg)
}
```

The minimal plugin-rsc demo does not implement this form. Its inline hoister finds no function-level directive, so the module is left without a cache wrapper:

```js
'use cache'

export async function myFn(arg) {
  console.log(arg)
}
```

Next.js applies the file role to the export and makes the generated cache wrapper the registered callable:

```js
const $$RSC_SERVER_CACHE_0_INNER = async function myFn(arg) {
  console.log(arg)
}

export const $$RSC_SERVER_CACHE_0 = React.cache(function myFn() {
  return cache(
    'default',
    ID,
    0,
    $$RSC_SERVER_CACHE_0_INNER,
    slice.call(arguments, 0, 1),
  )
})

registerServerReference($$RSC_SERVER_CACHE_0, ID, null)
export const myFn = $$RSC_SERVER_CACHE_0
```

The maintained Next.js fixture is [server-graph/35/output.js:4](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/35/output.js#L4). The file-level directive changes every applicable export rather than asking the transform to discover local closures.

#### Function-level `"use cache"`

Input:

```js
function myOuterFn(capture) {
  async function myInnerFn(arg) {
    'use cache'
    console.log(capture, arg)
  }

  return myInnerFn
}
```

The minimal demo creates an internal hoist and a server-local cache wrapper:

```js
const myInnerFn = cacheWrapper($$hoist_0_myInnerFn).bind(null, capture)

async function $$hoist_0_myInnerFn(capture, arg) {
  console.log(capture, arg)
}
```

Next.js creates separate generated implementation and wrapper exports, registers the wrapper, and binds protected captures to that registered reference:

```js
const myInnerFn = $$RSC_SERVER_CACHE_0.bind(
  null,
  encryptActionBoundArgs(ID, capture),
)

const $$RSC_SERVER_CACHE_0_INNER = async function myInnerFn([capture], arg) {
  console.log(capture, arg)
}

export const $$RSC_SERVER_CACHE_0 = React.cache(function myInnerFn() {
  return cache(
    'default',
    ID,
    1,
    $$RSC_SERVER_CACHE_0_INNER,
    slice.call(arguments, 0, 2),
  )
})
registerServerReference($$RSC_SERVER_CACHE_0, ID, null)
```

The four cases separate two questions. Placement determines whether the transform wraps existing module exports or creates generated exports for local closures. Directive meaning determines whether the registered callable is the server function itself or a cache wrapper around a distinct inner implementation.

For easier comparison, every normalized output shows the original `myOuterFn` first and generated module-level declarations afterward. Actual text order differs: plugin-rsc leaves the outer function in place and appends its hoisted implementation, while Next.js inserts generated implementations and references before the containing source statement. That ordering difference is described separately where relevant and is not encoded by flipping the examples.

### Built-in `"use server"` Baseline

Input:

```js
function myOuterFn(capture) {
  async function myInnerFn(arg) {
    'use server'
    console.log(capture, arg)
  }

  return myInnerFn
}
```

#### Plugin-rsc

Normalized output:

```js
function myOuterFn(capture) {
  const myInnerFn = registerServerReference(
    $$hoist_0_myInnerFn,
    MODULE_KEY,
    '$$hoist_0_myInnerFn',
  ).bind(null, encryptActionBoundArgs([capture]))
  return myInnerFn
}

export async function $$hoist_0_myInnerFn(encoded, arg) {
  const [capture] = await decryptActionBoundArgs(encoded)
  ;('use server')
  console.log(capture, arg)
}

Object.defineProperty($$hoist_0_myInnerFn, 'name', { value: 'myInnerFn' })
```

The built-in integration supplies `registerServerReference($$hoist_0_myInnerFn, MODULE_KEY, '$$hoist_0_myInnerFn')` as the generic hoister's runtime expression. With default action encryption enabled, it also supplies `encode` and `decode` hooks, so all captures occupy one protected bound slot and are reconstructed inside `$$hoist_0_myInnerFn`. It leaves `noExport` disabled because the generated hoist must be addressable through the server-reference manifest. See the focused comparison in [FINDINGS-INLINE-DIRECTIVE.md](./FINDINGS-INLINE-DIRECTIVE.md).

#### Next.js

Normalized output:

```js
function myOuterFn(capture) {
  const myInnerFn = $$RSC_SERVER_ACTION_0.bind(
    null,
    encryptActionBoundArgs(ID, capture),
  )
  return myInnerFn
}

export const $$RSC_SERVER_ACTION_0 = async function myInnerFn(bound, arg) {
  const [capture] = await decryptActionBoundArgs(ID, bound)
  console.log(capture, arg)
}

registerServerReference($$RSC_SERVER_ACTION_0, ID, null)
```

Next.js uses the same essential server-action mechanism, but it registers `$$RSC_SERVER_ACTION_0` once at module scope, associates capture encryption with `ID`, and encodes transformed-parameter admission in the ID for its client router transport. React registration mutates the generated export with server-reference metadata and a reference-aware `.bind()`, which is why the standalone registration statement can discard its return value. These differences are server-reference integration policy rather than cache behavior.

The two `"use server"` outputs establish the reusable baseline: hoist a manifest-addressable implementation, protect captures, register the exported function, and bind captures at the original lexical site.

### Minimal `"use cache"` Demo

The cache plugin calls the generic hoister with a one-argument runtime expression in [packages/plugin-rsc/examples/basic/vite.config.ts:338](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/examples/basic/vite.config.ts#L338).

Input:

```js
function myOuterFn(capture) {
  async function myInnerFn(arg) {
    'use cache'
    console.log(capture, arg)
  }

  return myInnerFn
}
```

```text
source function
  -> hoisted implementation $$hoist_0_myInnerFn(captures..., invocationArgs...)
  -> cacheWrapper($$hoist_0_myInnerFn)
  -> optional .bind(null, captures...)
  -> cached callable
```

Normalized output:

```js
function myOuterFn(capture) {
  const myInnerFn = cacheWrapper($$hoist_0_myInnerFn).bind(null, capture)
  return myInnerFn
}

async function $$hoist_0_myInnerFn(capture, arg) {
  'use cache'
  console.log(capture, arg)
}
```

The demo deliberately sets `noExport: true`, so `$$hoist_0_myInnerFn` remains an internal implementation rather than a manifest-addressable server reference. It also leaves `encode` and `decode` unset, so captures remain direct leading parameters and `.bind()` arguments. These are integration choices made for a small in-process cache example, not missing generic-hoister capabilities: the built-in `"use server"` path above already exercises exported hoists plus protected single-payload capture encoding and decoding.

The relevant generic-hoister configuration difference is small:

| Integration             | Runtime expression                                              | Hoisted export                    | Capture hooks                                              |
| ----------------------- | --------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| Built-in `"use server"` | `registerServerReference($$hoist_0_myInnerFn, moduleKey, name)` | Exported for manifest loading     | `encode` and `decode` protect one bound payload by default |
| Minimal `"use cache"`   | `cacheWrapper($$hoist_0_myInnerFn)`                             | Internal through `noExport: true` | Unset, so captures remain direct bound arguments           |

This makes the architectural question more precise. Plugin-rsc already has the knobs needed to produce the protected, exported server-function shape. The cache demo opts out because it treats cached functions as server-local callables. Next.js instead registers the cache wrapper itself, so its cached function receives the same transport capabilities as its `"use server"` references.

The transform prepends captures to the original parameters and applies binding after the runtime expression in [packages/plugin-rsc/src/transforms/hoist.ts:76](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L76) and [packages/plugin-rsc/src/transforms/hoist.ts:113](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L113).

The runtime receives only `$$hoist_0_myInnerFn`. A later invocation presents bound captures and call-time arguments as one positional `args` list in [packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx:20](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx#L20).

### Next.js `"use cache"`

Next.js creates a distinct inner implementation and module-level runtime wrapper in [crates/next-custom-transforms/src/transforms/server_actions.rs:3063](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L3063).

Input:

```js
function myOuterFn(capture) {
  async function myInnerFn(arg) {
    'use cache'
    console.log(capture, arg)
  }

  return myInnerFn
}
```

```text
source function
  -> inner implementation $$RSC_SERVER_CACHE_0_INNER([captures...], invocationArgs...)
  -> module-level React.cache wrapper
  -> cache(kind, id, captureCount, $$RSC_SERVER_CACHE_0_INNER, admittedArgs)
  -> registered callable
  -> optional .bind(null, protectedCapturePayload)
```

Normalized output:

```js
function myOuterFn(capture) {
  return $$RSC_SERVER_CACHE_0.bind(null, encryptActionBoundArgs(ID, capture))
}

const $$RSC_SERVER_CACHE_0_INNER = async function myInnerFn([capture], arg) {
  console.log(capture, arg)
}

export const $$RSC_SERVER_CACHE_0 = React.cache(function myInnerFn() {
  return cache(
    'default',
    ID,
    1,
    $$RSC_SERVER_CACHE_0_INNER,
    slice.call(arguments, 0, 2),
  )
})

registerServerReference($$RSC_SERVER_CACHE_0, ID, null)
```

The transform creates the capture-array parameter and records its length in [crates/next-custom-transforms/src/transforms/server_actions.rs:889](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L889). It emits the five-part runtime call in [crates/next-custom-transforms/src/transforms/server_actions.rs:2979](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L2979).

A representative nested cache output is [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/40/output.js:6](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/40/output.js#L6).

## Focused Fixture Comparison

| Fixture                | Minimal demo representation                                                                                 | Next.js representation                                                    | First-pass semantic result                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Plain async function   | `cacheWrapper($$hoist_0_myInnerFn)`                                                                         | `React.cache(() => cache(kind, id, 0, $$RSC_SERVER_CACHE_0_INNER, []))`   | Both provide one reusable callable during the loaded module lifetime.                                               |
| Explicit arguments     | Wrapper receives every supplied argument                                                                    | Transform emits `[]`, a declared-prefix slice, or all arguments           | Extra undeclared arguments affect demo keys but are omitted by Next.js for fixed signatures.                        |
| One closure capture    | Capture is a leading parameter and direct `.bind()` argument                                                | Captures form one leading array parameter and one protected bound payload | Both preserve the capture in execution and key material. Only Next.js preserves the boundary explicitly at runtime. |
| Nested closure         | Runtime expression runs at the original nested site; runtime deduplicates by the generated hoisted function | Base wrapper is hoisted once; nested site creates a bound callable        | Current demo semantics are equivalent because its runtime memoizes wrappers by generated function identity.         |
| Member-only capture    | Transform constructs a partial object preserving source member paths                                        | Transform binds selected leaf/path values and rewrites references         | Both avoid capturing the unused root object. No feature difference was demonstrated.                                |
| Cached component props | Props are one ordinary invocation argument                                                                  | Props are one ordinary invocation argument                                | No component-specific transform difference. Dynamic-child behavior is runtime-only here.                            |

Next.js plain-function output is illustrated by [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/33/output.js:5](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/33/output.js#L5). Fixed-argument slicing is visible in [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/48/output.js:27](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/48/output.js#L27). Component props remain one argument in [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/41/output.js:13](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/41/output.js#L13).

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

The generic runtime callback receives the generated value, name, and directive match in [packages/plugin-rsc/src/transforms/hoist.ts:21](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L21), but the demo callback uses only the value in [packages/plugin-rsc/examples/basic/vite.config.ts:346](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/examples/basic/vite.config.ts#L346).

## Detailed Findings

### 1. Capture Flattening Is A Demo Choice, Not A Hoister Ceiling

The current cache demo does not configure `encode` or `decode`, so each captured variable becomes a direct leading `.bind()` argument and the cache runtime sees captures plus invocation arguments as one list.

The generic transform can instead bind one encoded capture payload and decode it into the original capture bindings inside the hoisted function. This behavior is implemented in [packages/plugin-rsc/src/transforms/hoist.ts:81](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L81) and demonstrated by [packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.encode.js:1](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.encode.js#L1).

The production server-action integration already uses these hooks for protected bound arguments in [packages/plugin-rsc/src/plugin.ts:2059](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2059).

This means the generic approach can package captures into one slot and reconstruct them inside the inner implementation. It does not by itself expose the slot's meaning to the cache runtime because `decode` runs inside the generated hoisted function, after the wrapper has received the arguments. A cache runtime that must interpret the payload before calling that implementation needs either a self-describing payload or capture metadata in the transform/runtime contract.

### 2. Wrapper Placement Shifts A Requirement To The Runtime

For a nested cached function, the demo emits `cacheWrapper($$hoist_0_myInnerFn)` at the original declaration site. Re-entering the outer function therefore evaluates the runtime expression again and creates a fresh `.bind()` result.

The demo runtime compensates by memoizing `cacheWrapper($$hoist_0_myInnerFn)` in a `WeakMap`, so every evaluation for the same generated module-level function recovers the same base cached wrapper in [packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx:14](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx#L14). The bound callable is fresh, but cache entries remain attached to the shared base wrapper.

Next.js hoists the base wrapper itself to module scope, then creates only the bound callable at the nested site. This makes one-time base-wrapper creation a transform guarantee rather than a runtime convention.

No current semantic gap results because the demo runtime satisfies the convention. A future runtime that stores state during wrapper construction must retain function-object memoization or the transform would need to hoist wrapper creation as Next.js does.

### 3. Argument Admission Is A Genuine Transform-Output Difference

The demo wrapper is variadic and serializes every supplied argument. The transform preserves the original implementation parameters but does not tell the runtime how many invocation arguments are semantically admitted.

Next.js emits argument normalization from the AST in [crates/next-custom-transforms/src/transforms/server_actions.rs:3005](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L3005):

- `[]` when the transformed inner function has no parameters, which means it has neither captures nor source parameters.
- `slice(arguments, 0, transformedParameterCount)` for a fixed signature. This is the source parameter count plus one payload slot when the function has captures.
- `slice(arguments)` when rest parameters are present or the signature is not statically known.

Consequently, `cached(1, 2, extra)` and `cached(1, 2, anotherExtra)` share a Next.js entry when the function declares only two fixed parameters, but produce different demo keys.

`Function.length` cannot reproduce this exactly because default and rest parameters make it an incomplete representation of the source signature, and the runtime also needs to account for transform-generated capture slots. Exact parity requires a generated wrapper that performs the slicing before entering the runtime or transform-produced total-admitted-prefix metadata consumed by the runtime.

### 4. Cache Kind Is Missing Only From The Demo Integration

Next.js passes the parsed cache kind directly to its runtime, which uses it for handler selection in [packages/next/src/server/use-cache/use-cache-wrapper.ts:1612](../../../../../code/others/next.js/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1612). Custom-kind output is shown in [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/38/output.js:4](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/38/output.js#L4).

The demo matches only exact `"use cache"`, but the generic hoister supports regex directives and passes the match to the runtime callback. This is covered by [packages/plugin-rsc/src/transforms/hoist.test.ts:445](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.test.ts#L445).

Supporting kind dispatch would require changing the demo integration and runtime signature, not the generic transform approach.

### 5. Function Identity Is Adequate For The Current Demo Scope

The demo scopes cache entries first by the hoisted function object and then by serialized arguments. That provides per-definition isolation while the module instance remains loaded.

Next.js supplies a generated reference ID to the runtime and includes it in cache-key parts in [packages/next/src/server/use-cache/use-cache-wrapper.ts:2016](../../../../../code/others/next.js/packages/next/src/server/use-cache/use-cache-wrapper.ts#L2016). The transform hashes salt, filename, and export/generated name, then adds a leading metadata byte encoding cache/action type and parameter/rest information in [crates/next-custom-transforms/src/transforms/server_actions.rs:284](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L284).

This richer identity is not needed for the current in-memory demo because its entries cannot outlive the function object. Whether a generated ID is sufficient or necessary across builds, HMR, deployments, persistent stores, or distributed handlers remains a follow-up rather than a first-pass finding.

### 6. Capture Representation Differs Without A Demonstrated Feature Gap

For member-only access such as `x.y.z`, the generic hoister keeps the inner body unchanged and binds a synthesized partial object such as `{ y: { z: x.y.z } }`. The output is demonstrated in [packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.js:1](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.js#L1).

Next.js collects member paths, retains the shortest covering path, binds selected values, and rewrites inner references. The path reduction is implemented in [crates/next-custom-transforms/src/transforms/server_actions.rs:2918](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L2918).

Both approaches avoid serializing unused parts of the root object. The demo may serialize constant property labels and wrapper objects that Next.js avoids, but no relevant runtime feature was found that depends on this representational difference. Syntax coverage for computed access, optional access, and other complex forms belongs to the broader-transform follow-up.

## Capability Matrix

| Capability                                        | Demo status                                                       | Transform dependency                                                                         | Classification                                         |
| ------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Per-definition in-memory cache isolation          | Supported through hoisted function-object identity                | Hoisted implementation object                                                                | Directly supported                                     |
| Closure values participate in cache identity      | Supported as leading arguments                                    | Capture collection and binding                                                               | Directly supported                                     |
| Nested cached closures share base cache state     | Supported because runtime memoizes by hoisted function            | Hoisted implementation identity; wrapper placement creates a runtime obligation              | Runtime-only convention with current transform support |
| Distinguish one bound payload from call arguments | Not used by cache demo                                            | Existing hooks can package captures, but runtime-visible distinction needs a tag or metadata | Integration protocol or small ABI extension            |
| Ignore extra positional arguments                 | Not supported exactly                                             | Total admitted transformed prefix and rest/unknown policy                                    | Genuine generated-output change or ABI extension       |
| Dispatch by cache kind                            | Not supported by demo                                             | Directive match already available                                                            | Integration/runtime change, not a hoister extension    |
| Invoke an unwrapped inner implementation          | Supported because runtime receives the generated hoisted function | Hoisted implementation                                                                       | Directly supported                                     |
| Persistent or distributed identity                | Not evaluated                                                     | Likely requires generated identity and build/storage policy                                  | Follow-up                                              |
| Cross-environment bound references                | Not evaluated                                                     | Requires registration and protected bound-reference protocol                                 | Follow-up                                              |

## Smallest Relevant Changes

### Exact Argument Admission

Emit a generated wrapper that supplies only admitted arguments, or extend the transform/runtime contract with positional-argument policy. The minimum useful metadata for the latter is total admitted positional prefix, including any transform-generated capture slot, versus pass-all for rest or unknown signatures. This is the only clear generic generated-output change identified in the first pass.

### Cache Kind

Change the demo directive to a regex, derive the kind from `directiveMatch`, and call a runtime accepting `(kind, fn)`. No generic-hoister change is required.

### Packaged Captures

Use existing `encode` and `decode` hooks if a future inner implementation needs captures packaged into one bound payload. Use a self-describing payload or add capture metadata to the runtime callback if the cache runtime must inspect, decode, key, or validate that payload before invoking the inner function.

### Generated Identity

The runtime callback already receives the generated hoist name, and the surrounding Vite transform hook can incorporate module identity as the production server-action integration does in [packages/plugin-rsc/src/plugin.ts:2061](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2061). Define the required lifetime and invalidation semantics before changing the cache ABI; that design belongs to the stable-identity follow-up.

## Completed Follow-Ups

- [Stability across builds, HMR, deployments, persistent stores, and distributed handlers](./FINDINGS-STABLE-CACHE-IDENTITY.md).
- [Inline `"use server"` directive handling compared with Next.js](./FINDINGS-INLINE-DIRECTIVE.md).
- [Mixed-directive composition](./FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md). Independent complete transforms do not compose module-level defaults with inline role overrides; those modules require shared role classification before code generation and claim ownership.
- [Cache Server Reference transport](./FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md). PR #1246's transform ABI plus plugin-rsc's Server Reference claim API is sufficient for unmixed module and inline transport; no additional generic transform field or core API was demonstrated.

## Planned Transform Follow-Ups

### Broader Transform Surface

Research source forms deferred from the first comparison: named and default exports, module-level directives, object and class methods, computed and optional member access, destructuring, shadowing, nested closures, and capture-path reduction. Begin with the four-way directive-placement matrix above and produce exact input/output comparisons for file-level and function-level `"use server"` and `"use cache"`. Compare semantic support rather than incidental formatting.

Deliverable: `FINDINGS-BROADER-TRANSFORM-SURFACE.md` containing a detailed directive-placement breakdown, a Next.js versus Vite/PR #1246 capability matrix, focused input/output fixtures for each materially different form, classification of unsupported forms as transform limitations or intentional exclusions, and the smallest generic-hoister changes needed for parity.

This track excludes diagnostics except where generated output is unsound without rejection, and it excludes cross-environment transport after confirming that the correct callable shape is emitted.

### Transform Validation

Research validation only after the mixed-directive and broader-surface semantics are established. Inventory checks that protect transform invariants, such as unsupported `this`, `super`, or `arguments` capture, illegal directive combinations, non-async functions, invalid method forms, and client-boundary restrictions. Do not pursue message wording parity without a behavioral reason.

Deliverable: `FINDINGS-TRANSFORM-VALIDATION.md` containing an invalid-input fixture matrix, the invariant protected by each error, current Next.js and Vite behavior, missing checks that otherwise produce invalid or misleading output, and a minimum validation contract for the public transform helpers.

This track excludes framework cache policy validation and comprehensive diagnostic text matching.

## Research Order

1. Broader transform surface, using the completed composition and transport findings to distinguish unsupported source forms from orchestration constraints.
2. Transform validation, after supported semantics and intentional exclusions are known.

## Excluded Runtime Observations

Both implementations perform Flight argument encoding, temporary-reference management, pending-call deduplication, result-stream serialization, and replay in runtime code. The focused inspection found no additional transform information required for those techniques once each runtime has its chosen function identity and argument list. They were therefore excluded from the capability comparison.

Next.js cache life, tags, prerender stages, custom handler policy, resume data, and invalidation are also outside this transform-derived investigation.

## Verification

The findings use existing transform snapshots and direct source inspection. No repository files were modified and no test suites were run because the relevant emitted forms are already snapshot fixtures in both repositories.
