# Inline `"use server"` Directive Comparison

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 28f66372d91df0bdf62b59be15f58e0b3b8548e2
- Branch: main
- Worktree: /Users/hogawa/code/others/vite-plugin-react
- Next.js repo: git@github.com:vercel/next.js.git
- Next.js commit: 153bf8ac5fa00888ef5fbb2b65cac12f0942a44f
- Next.js branch: canary
- Next.js worktree: /Users/hogawa/code/others/next.js
- Reviewed: 2026-07-27

## Question

How does plugin-rsc's built-in inline `"use server"` handling compare with Next.js when caching is removed from the analysis?

The scope is the server-layer transform and the minimum surrounding runtime contract needed to explain its output. Module-level `"use server"` handling and client proxies are included only where they clarify inline-action registration, identity, or transport. Cache wrappers, cache keys, persistence, and replay are excluded.

## Executive Findings

The core transformation is the same. With plugin-rsc's default action encryption enabled, both implementations hoist an inline async function into a module export, turn lexical captures into one encrypted bound argument, decrypt those captures at the beginning of the hoisted function, register the exported function as a React server reference, and leave a bound callable at the original lexical site.

The cache comparison overstated how unusual Next.js's representation is for the underlying inline-directive problem. Once cache-specific wrappers and runtime fields are removed, the main output shapes are close.

Four differences remain relevant:

1. Next.js encodes parameter admission in the first byte of the server-reference ID and filters action arguments in its client router transport. The transformed parameter list includes the synthetic closure slot when captures exist. Plugin-rsc's IDs carry no parameter metadata, so its framework callback receives every supplied argument. This is a real behavioral difference for undeclared extra arguments, but it belongs to the generated identity plus client transport contract rather than the hoisting representation alone.
2. Next.js registers the hoisted base function at module scope. Plugin-rsc emits `registerServerReference` at the original lexical site and can execute it each time that scope runs. React registration mutates and returns the same function rather than allocating a wrapper, and both implementations create a capture-bound callable at the lexical site. Unlike cache-wrapper placement, no separately allocated stateful wrapper or resulting behavior gap was found here.
3. With plugin-rsc's default action encryption enabled, both package captures into one encrypted bound value. Next.js includes the action ID in encryption and decryption, while plugin-rsc encrypts one capture array without binding the ciphertext to a particular action ID. This is an integration and security-contract difference, not a limitation of generic closure hoisting.
4. Next.js enforces a substantially broader transform validity contract. It rejects misplaced directives, `this`, `super`, `arguments`, inline actions in client components, and instance methods. Plugin-rsc rejects non-async functions but otherwise has missing validation that can accept non-directives or produce meaning-changing hoisted output.

## Equivalent Example

For easier comparison, both normalized outputs show the original `myOuterFn` first and generated module-level declarations afterward. Plugin-rsc actually appends its hoisted implementation after the original function, while Next.js inserts its generated action before the containing source statement.

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

### Plugin-rsc Output

Normalized from the generic hoister and the built-in runtime callbacks in [hoist.ts:76](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L76) and [plugin.ts:2064](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2064):

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

Object.defineProperty($$hoist_0_myInnerFn, 'name', {
  value: 'myInnerFn',
})
```

The registration expression replaces the original function directly. The hoisted function is moved to the end of the module and exported under a generated name in [hoist.ts:94](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L94). The plugin records that generated export in its server-reference manifest in [plugin.ts:2084](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2084).

### Next.js Output

The maintained one-capture fixture is [server-graph/19/input.js:3](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/19/input.js#L3). Its output is [server-graph/19/output.js:3](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/19/output.js#L3). The equivalent canonical input above normalizes to:

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

Next.js places the exported implementation and its registration at module scope, then emits only the bind at the original site. Its internal action-entry comment maps `ID` to the generated export for manifest construction.

### Why Registration Can Discard Its Return Value

Next.js's private server-reference module directly re-exports `registerServerReference` from the React server runtime in [server-reference.ts:1](../../../../../code/others/next.js/packages/next/src/build/webpack/loaders/next-flight-loader/server-reference.ts#L1). The server implementation mutates the supplied function with non-enumerable reference metadata and returns that same function. The compiled implementation is visible in [app-page-turbo.runtime.prod.js:19496](../../../../../code/others/next.js/turbopack/crates/turbopack-ecmascript/tests/benches/app-page-turbo.runtime.prod.js#L19496):

```js
function registerServerReference(reference, id, exportName) {
  return Object.defineProperties(reference, {
    $$typeof: { value: Symbol.for('react.server.reference') },
    $$id: {
      value: exportName === null ? id : `${id}#${exportName}`,
      configurable: true,
    },
    $$bound: { value: null, configurable: true },
    bind: { value: serverReferenceBind, configurable: true },
  })
}
```

The standalone Next.js statement works because `registerServerReference($$RSC_SERVER_ACTION_0, ...) === $$RSC_SERVER_ACTION_0`: the generated export already refers to the mutated object, so reassignment is unnecessary.

Flight later recognizes the `$$typeof` marker and reads `$$id` and `$$bound` when serializing the function as a server reference. React also replaces `.bind()` with a reference-aware implementation. That implementation performs the normal JavaScript bind, then copies the reference marker and ID to the new function and records the bound arguments in `$$bound`; the exact compiled code is in [app-page-turbo.runtime.prod.js:17094](../../../../../code/others/next.js/turbopack/crates/turbopack-ecmascript/tests/benches/app-page-turbo.runtime.prod.js#L17094). This is how the lexical `$$RSC_SERVER_ACTION_0.bind(null, encryptedCaptures)` remains a serializable server reference.

The WeakMap implementation is a related but different mechanism. React's client/reply-side registration tracks `{ id, bound, originalBind }` by function in a WeakMap rather than exposing `$$typeof`, `$$id`, and `$$bound` directly on the function. It can still add other integration properties such as `$$FORM_ACTION`. The Next.js bundle initializes that WeakMap in [app-page-turbo.runtime.prod.js:9175](../../../../../code/others/next.js/turbopack/crates/turbopack-ecmascript/tests/benches/app-page-turbo.runtime.prod.js#L9175) and its client-side registration stores metadata through the helper called at [app-page-turbo.runtime.prod.js:10918](../../../../../code/others/next.js/turbopack/crates/turbopack-ecmascript/tests/benches/app-page-turbo.runtime.prod.js#L10918). The generated server-side registration uses the property-mutation implementation, not that WeakMap.

## Pipeline Comparison

### Plugin-rsc

```text
inline async function
  -> collect lexical captures
  -> append exported hoisted implementation
  -> when captures exist, prepend one encoded capture parameter
  -> with default encryption, decrypt a capture array inside the body
  -> register the hoisted export at the original site
  -> optionally bind one encrypted capture-array promise
  -> serialize the resulting reference through Flight
```

The built-in server transform selects the generic inline hoister when the module itself lacks `"use server"` in [server-action.ts:30](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/server-action.ts#L30). Runtime registration and encryption are supplied by plugin integration rather than hardcoded in the hoister in [plugin.ts:2064](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2064).

### Next.js

```text
inline async function
  -> collect lexical captures
  -> emit exported hoisted implementation
  -> prepend one encrypted closure parameter
  -> decrypt captures inside the body
  -> register the hoisted export at module scope
  -> bind one action-ID-scoped encrypted capture promise at the original site
  -> encode transformed-parameter policy in the action ID
  -> filter arguments in the Next.js client router transport
```

The server-reference ID is generated from a build salt, filename, generated export name, and one parameter-information byte in [server_actions.rs:284](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L284). Encryption and registration are part of Next.js's surrounding server-action protocol.

## Focused Comparison

| Area                                | Plugin-rsc                                                                                        | Next.js                                                                                                       | Classification                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Plain inline async function         | Exported hoisted declaration; registration expression at lexical site                             | Exported hoisted value; registration statement at module scope                                                | Representation                                        |
| One closure capture                 | With default encryption, one encrypted array bound to the registered function                     | One encrypted variadic capture payload bound to the registered function                                       | Equivalent core model; runtime ABI differs            |
| Fixed parameters                    | Preserved after the synthetic capture parameter; all supplied arguments reach framework transport | Preserved after the synthetic capture parameter; ID records transformed positions, including the capture slot | Router transport behavior differs for extra arguments |
| Default and destructured parameters | Syntax is preserved after the capture parameter                                                   | Syntax is preserved and counted as fixed positions                                                            | Equivalent ordinary case                              |
| Rest parameters                     | Syntax is preserved; transport receives all supplied arguments                                    | Syntax is preserved; rest bit admits following arguments                                                      | Equivalent function behavior; metadata differs        |
| Nested actions                      | Each action is independently hoisted, registered, encrypted, and bound                            | Same                                                                                                          | Equivalent common path                                |
| Module bindings                     | Remain direct references                                                                          | Remain direct references                                                                                      | Equivalent                                            |
| Member-only captures                | Builds a partial object preserving source access paths                                            | Binds selected member values and rewrites body references                                                     | Representation; no general feature gap demonstrated   |
| Generated identity                  | Module reference key plus generated hoist export name                                             | Per-action hashed ID with type and parameter byte                                                             | Runtime and manifest policy                           |
| Function name                       | Restored with `Object.defineProperty`                                                             | Inferred on generated function where possible                                                                 | Representation                                        |
| Non-async action                    | Rejected                                                                                          | Rejected                                                                                                      | Equivalent validation                                 |
| Misplaced directive                 | Recognized anywhere among string-expression statements in the body                                | Rejected outside the directive prologue                                                                       | Plugin-rsc validation gap                             |
| `this`, `super`, `arguments`        | No inline-action rejection                                                                        | Rejected because hoisting changes their meaning                                                               | Plugin-rsc correctness gap                            |
| Inline action in client graph       | Non-RSC transform currently skips it with an unsupported-case TODO                                | Rejected as an inline action in a Client Component                                                            | Plugin-rsc diagnostic gap                             |
| Class instance method               | No explicit server-action contract                                                                | Rejected; static methods are supported                                                                        | Validation and syntax-policy difference               |

## Detailed Findings

### 1. The Hoisting Model Is Fundamentally The Same

Plugin-rsc's generic transform identifies a directive-bearing function, computes captures from ancestor local scopes, moves the implementation into an exported module-level function, and replaces the original declaration or expression with registration and binding in [hoist.ts:49](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L49). The built-in `"use server"` integration supplies React registration and capture encryption in [plugin.ts:2064](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2064).

Next.js performs the same logical decomposition. Its generated export is registered once at module scope, while the lexical site binds encrypted captures. The single-capture fixture shows the complete shape in [server-graph/19/output.js:4](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/19/output.js#L4).

This means capture hoisting, encrypted binding, and a manifest-addressable export are not cache-specific observations. They are the ordinary representation required for an inline server function to survive Flight serialization and later invocation.

### 2. Argument Admission Remains Different, But The Mechanism Changes

Plugin-rsc does not encode parameter shape in its reference key. The browser runtime delegates the action ID and argument list to the framework callback unchanged in [browser.ts:42](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/react/browser.ts#L42). A framework can choose its own transport policy, but the built-in generated identity supplies no declared-parameter count from which to reproduce Next.js behavior.

Next.js prepends a metadata byte to every reference ID. For the first six transformed parameters, it records admitted positions; it also records rest or more-than-six behavior in [server_actions.rs:308](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L308). For a captured action, the transformed list starts with the synthetic encrypted-closure parameter, so source invocation parameters follow that bound slot. The current transform conservatively marks every declared transformed parameter as used rather than performing body liveness analysis in [server_actions.rs:339](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L339).

Next.js's app-router action transport parses that byte and removes unadmitted arguments before Flight encoding in [server-reference-info.ts:27](../../../../../code/others/next.js/packages/next/src/shared/lib/server-reference-info.ts#L27) and [server-action-reducer.ts:104](../../../../../code/others/next.js/packages/next/src/client/components/router-reducer/reducers/server-action-reducer.ts#L104). These sources establish the router reducer path rather than every possible consumer of a Next.js server reference.

Consequently, calling an uncaptured two-parameter action with a third extra value transports all three values through plugin-rsc's default low-level contract, while Next.js's router action transport omits the third. For a captured action, the same policy is indexed over the combined bound slot and invocation arguments. The hoisted implementations still have equivalent JavaScript parameter lists. The difference is generated metadata consumed by framework transport.

### 3. Capture Packaging Is Already Equivalent At The Important Boundary

With default encryption enabled, plugin-rsc replaces any number of captures with one synthetic `$$hoist_encoded` parameter, encrypts one array at the bind site, and reconstructs bindings at the beginning of the hoisted body in [hoist.ts:76](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L76). The higher-order snapshot demonstrates this for nested actions in [hoist.test.ts:317](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.test.ts#L317).

Next.js also uses one synthetic bound parameter and reconstructs captures inside the body. Its encryption API accepts the action ID followed by captures, while plugin-rsc's API accepts one capture array. Both ultimately serialize one encrypted Flight value.

Next.js verifies the action ID during decryption, so a payload encrypted for one action is not accepted as another action's closure payload. Plugin-rsc's encryption runtime serializes and encrypts the value without an action-ID input in [encryption-runtime.ts:17](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/utils/encryption-runtime.ts#L17). This difference deserves separate protocol and threat-model analysis if cross-action replay resistance is a requirement, but it does not require a different hoister representation.

### 4. Wrapper Placement Is Mostly Incidental Here

Plugin-rsc emits `registerServerReference(hoisted, key, name)` where the inline function originally appeared in [hoist.ts:113](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L113). Re-entering an outer component therefore evaluates registration again before creating a fresh bound callable when captures exist.

Next.js emits `registerServerReference` once beside the hoisted export and leaves only `.bind()` at the original site when captures exist. Both implementations use the same module-level implementation object and create a fresh bound function when the enclosing scope runs only for captured actions; uncaptured actions reuse the module-level function object.

Registration attaches React's server-reference metadata and reference-aware `.bind()` directly to the module-level function object. Reapplying the same metadata to that same object at plugin-rsc's lexical site has no demonstrated behavioral difference from Next.js's one module-scope registration. This contrasts with cache-wrapper construction, where each wrapper can own distinct cache state. For ordinary server actions, placement is an idempotence and code-generation convention unless a future registration runtime allocates separate per-call state.

### 5. Capture Selection Differs More Than Capture Transport

Both implementations capture only bindings declared in enclosing local scopes. Imports, globals, and module bindings remain direct references.

For plain member chains, plugin-rsc synthesizes a partial object. An action using only `x.y.z` binds `{ y: { z: x.y.z } }`, then leaves `x.y.z` unchanged in the hoisted body. The implementation is in [hoist.ts:264](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L264), with output in [member-chain.js.snap.encode.js:1](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/fixtures/hoist/member-chain.js.snap.encode.js#L1).

Next.js binds selected member values and rewrites references to generated closure arguments. Both implementations preserve receiver objects for method calls: plugin-rsc captures the receiver prefix inside its synthesized partial object, while Next.js retains the receiver as a selected closure value. The representative Next.js fixture binds `data`, `baz.value`, and `foo` in [server-graph/32/output.js:3](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/32/output.js#L3).

Both reduce serialized data for common paths. Plugin-rsc may introduce fresh intermediate object identity, while Next.js may bind multiple selected leaves. No broad runtime capability difference follows from this alone, although identity-sensitive edge cases need focused fixtures before the representations can be called fully equivalent.

### 6. Validation Is The Clearest Plugin-rsc Gap

Plugin-rsc scans all string-expression statements in a function body and does not stop after the directive prologue in [hoist.ts:144](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/hoist.ts#L144). Code with an ordinary statement followed by `'use server'` is therefore transformed even though the string is not a JavaScript directive.

Next.js tracks whether the directive position is still open and reports a misplaced directive after any non-directive statement in [server_actions.rs:3418](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L3418). The behavior is pinned by [server-graph/8/input.js:10](../../../../../code/others/next.js/crates/next-custom-transforms/tests/errors/server-actions/server-graph/8/input.js#L10).

Next.js also rejects `this`, `super`, and `arguments` because moving a function to module scope changes their meaning in [server_actions.rs:2883](../../../../../code/others/next.js/crates/next-custom-transforms/src/transforms/server_actions.rs#L2883). Plugin-rsc has no corresponding checks. This can produce meaning-changing output rather than merely a weaker diagnostic.

Both reject known non-async inline functions. Plugin-rsc enables that check in [plugin.ts:2069](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2069), while Next.js has dedicated diagnostics and fixtures. Next.js additionally rejects inline actions in client components and class instance methods, while plugin-rsc currently skips inline server functions that enter a non-RSC graph under an explicit unsupported-case TODO in [plugin.ts:2104](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/plugin.ts#L2104).

### 7. Both Have Hoisting Edge Cases Outside The Common Model

Plugin-rsc has a checked snapshot showing a recursive local action capturing its own binding before initialization, producing a temporal-dead-zone failure in [self-ref-nested-function.js.snap.encode.js:1](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/fixtures/hoist/self-ref-nested-function.js.snap.encode.js#L1).

A named function expression that refers to its inner name also leaves that name dangling after plugin-rsc converts it into a differently named declaration. The checked output records this explicitly in [named-function-expression-self-ref.js.snap.encode.js:1](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/fixtures/hoist/named-function-expression-self-ref.js.snap.encode.js#L1). More generally, replacing a local function declaration with a `const` registration can change declaration-hoisting behavior for references that occur before the original declaration.

Next.js retains a nested-action fixture marked as an invalid transformation of hoisted functions in [server-graph/28/input.js:11](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/28/input.js#L11). Its generated outer action references `action2` before the rewritten local declaration in [server-graph/28/output.js:17](../../../../../code/others/next.js/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/28/output.js#L17).

Plugin-rsc also has a fixture where an outer capture used by a parameter default is decrypted only inside the body, after parameter initialization has already run. The invalid output is visible in [destructured-param-default-bound.js.snap.encode.js:5](../../../../../code/others/vite-plugin-react/packages/plugin-rsc/src/transforms/fixtures/hoist/destructured-param-default-bound.js.snap.encode.js#L5). Next.js preserves parameters and performs closure replacement in the body through a similar broad shape, but this investigation found no equivalent maintained fixture, so parity for that edge should not be assumed without a dedicated test.

These are correctness issues in particular scope and initialization interactions. They do not invalidate the common inline-action representation.

## Responsibility Matrix

| Responsibility               | Plugin-rsc owner                                     | Next.js owner                                  |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Detect inline directive      | Generic hoister configured with exact string         | Shared server-actions SWC pass                 |
| Hoist implementation         | Generic hoister                                      | Shared server-actions SWC pass                 |
| Select captures              | Generic scope and member-path analysis               | SWC closure and member-path analysis           |
| Package captures             | Plugin-provided `encode` callback                    | Built-in action encryption transform           |
| Register server reference    | Plugin-provided runtime expression at lexical site   | Generated module-scope registration            |
| Generate action identity     | Module reference manager plus hoist export name      | SWC hash plus metadata byte                    |
| Build server manifest        | Vite plugin claims and virtual module                | Internal action comment plus bundler plugins   |
| Create client reference      | React runtime and framework callback                 | Next client proxy and `callServer` integration |
| Filter invocation arguments  | Not encoded by built-in transform                    | ID metadata plus client action reducer         |
| Validate hoisting invariants | Async check plus incidental parser/scope constraints | Dedicated transform diagnostics                |

## Implications For `"use cache"`

This comparison establishes that plugin-rsc is not missing a fundamentally different closure-hoisting technique. Its built-in `"use server"` path already demonstrates the same core substrate that Next.js reuses around inline cache functions: hoisted module exports, capture selection, encrypted binding, server-reference registration, manifest identity, and Flight transport.

The minimal cache demo uses only part of that substrate. It invokes the generic hoister with `cacheWrapper($$hoist_0_myInnerFn)` but does not apply the built-in server-reference orchestration to the resulting cached callable. That is sufficient for an in-process demonstration where the function is called inside the RSC environment. It is not the full Next.js model for cached functions that can cross a Flight boundary or be invoked from a Client Component.

Next.js composes three distinct layers for inline `"use cache"`:

1. Generic inline-function mechanics: discover the directive, hoist the implementation, and represent captures.
2. Cache semantics: create a cache wrapper around a distinct inner implementation and pass cache kind, identity, capture count, and admitted arguments to the cache runtime.
3. Server-reference transport: register the wrapped cached callable, export it under a manifest-addressable identity, preserve bound captures, and create client-callable references when it crosses the boundary.

Plugin-rsc already has close analogues for the first and third layers through the generic hoister and built-in `"use server"` integration. The cache demo supplies a minimal version of the second. What is missing for Next.js-compatible `"use cache"` is the composition contract that makes the wrapped cached callable, rather than the raw hoisted implementation, participate in the server-reference machinery, plus any chosen Next-specific cache ABI and policy.

Therefore the likely direction is not to copy Next.js's whole shared transform or to reinterpret every `"use cache"` function as an ordinary `"use server"` action. It is to make plugin-rsc's existing server-function orchestration reusable by another directive producer while preserving the producer's wrapper as the registered export. Cache kind, persistent identity, argument admission, encryption policy, and client transport should remain explicit integration decisions rather than accidental consequences of generic hoisting.

This also narrows what the original cache comparison proves. The similar inline `"use server"` output is evidence that plugin-rsc has a viable reusable foundation. It does not show that the current cache demo already matches Next.js with only a missing cache runtime feature; wrapper ownership and server-reference orchestration still need to be composed deliberately.

## Smallest Relevant Changes

### Directive And Hoisting Validation

Restrict matching to the actual directive prologue. Reject `this`, `super`, and `arguments` in functions that will be hoisted. Add explicit errors for inline actions entering non-RSC graphs and decide whether instance and static method forms are supported. These are the highest-confidence correctness improvements because they prevent accepted input from being silently reinterpreted.

### Argument Metadata

Do not add Next.js's metadata byte merely for transform parity. First decide whether plugin-rsc's low-level API intends to omit undeclared extra arguments before transport. If it does, expose a generated parameter-admission policy alongside each server reference or include it in an extensible manifest record. The policy must count the synthetic bound slot, preserve rest behavior, and define handling beyond six parameters without inheriting Next.js's bit layout accidentally.

### Action-bound Encryption

Evaluate whether encrypted closure payloads must be cryptographically associated with their server-reference ID. If required, pass the reference identity into plugin-rsc's encryption and decryption callbacks and authenticate it as part of the encrypted payload. Treat this as a protocol and threat-model decision rather than a transform-shape requirement.

### Hoisting Edge Cases

Add focused expected-behavior tests before changing recursion, nested declaration ordering, or captured parameter defaults. Both implementations show unresolved initialization-order cases, so Next.js output is not a reliable target for these forms.

## Conclusions

The inline `"use server"` comparison confirms that plugin-rsc and Next.js use the same essential transform architecture. The earlier cache comparison's capture, identity, and hoisting observations mostly reduce to ordinary server-reference mechanics once cache wrappers are removed.

The remaining differences are narrower and easier to classify. Next.js adds framework policy around argument transport, action-scoped encryption, manifests, and diagnostics. Plugin-rsc provides a smaller generic transform plus runtime callbacks. Its transform-level deficiencies are not a missing Next.js wrapper representation; they are insufficient validation of inputs whose meaning changes when hoisted and known scope or initialization-order failures in self-reference, declaration ordering, and captured parameter defaults.

The strongest immediate follow-up is therefore directive and hoisting-invariant validation. Argument admission and action-bound encryption should be evaluated as explicit plugin protocol decisions rather than copied as incidental Next.js output details.

## Verification

The comparison uses direct source inspection and existing transform fixtures at the pinned commits. No repository source was modified and no test suite was run because the deliverable is a research note and the cited generated outputs are already maintained fixtures. Claims without an equivalent fixture, especially captured values used in parameter defaults on the Next.js side, are labeled as unresolved rather than treated as parity.
