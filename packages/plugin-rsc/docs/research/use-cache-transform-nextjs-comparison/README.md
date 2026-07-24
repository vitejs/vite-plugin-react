# `use cache` Transform Comparison Plan

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 32611a28365435d81a513c559715411bdc8f127e
- Branch: main
- Next.js repo: git@github.com:vercel/next.js.git
- Next.js commit: 153bf8ac5fa00888ef5fbb2b65cac12f0942a44f
- Next.js branch: canary

## Published Research

- [FINDINGS.md](./FINDINGS.md): completed first-pass transform comparison.
- [FINDINGS-STABLE-CACHE-IDENTITY.md](./FINDINGS-STABLE-CACHE-IDENTITY.md): completed stable-identity follow-up.
- [VINEXT-CONTEXT.md](./VINEXT-CONTEXT.md): completed Vinext compatibility context.
- [SERVER-FUNCTION-EXTENSIBILITY.md](./SERVER-FUNCTION-EXTENSIBILITY.md): focused implementation analysis and API proposal.
- [VINEXT-SERVER-REFERENCE-PRESERVATION.md](./VINEXT-SERVER-REFERENCE-PRESERVATION.md): completed cache-replay preservation analysis.

Each document is a research snapshot tied to the repository commits listed in its header. Later implementation changes do not rewrite the historical observations unless a note explicitly says otherwise.

## Goal

Compare the transform approach used by the minimal `"use cache"` demo in `@vitejs/plugin-rsc` with the approach used by Next.js. The primary question is what information each transform makes available to its runtime and which relevant RSC cache features are consequently enabled or constrained.

Runtime implementation is evidence only when it consumes transform-produced information or demonstrates that missing transform information blocks a feature. A difference implemented entirely with runtime-only RSC techniques is not a transform difference and is outside the main investigation.

This note records the plan after a high-level skim. Its observations are preliminary rather than conclusions from a complete implementation trace.

## Initial Code Map

The demo Vite plugin detects source containing `use cache`, parses it, applies the generic inline-directive hoister, and injects the example cache runtime in [packages/plugin-rsc/examples/basic/vite.config.ts:338](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/vite.config.ts#L338).

The reusable transform is [packages/plugin-rsc/src/transforms/hoist.ts:13](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.ts#L13). It finds directive-bearing functions, hoists them, gathers closure references, turns captured values into leading parameters, wraps the hoisted function with a supplied runtime expression, and binds captured values at the original declaration site.

Relevant transform snapshots begin at [packages/plugin-rsc/src/transforms/hoist.test.ts:420](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/transforms/hoist.test.ts#L420). Existing coverage includes `noExport` and directive-pattern handling.

The demo runtime ABI consumer begins at [packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx:20](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/src/framework/use-cache-runtime.tsx#L20). Inspect it only to establish what the generated wrapper passes to the runtime and which transform distinctions it can observe.

Representative demo behavior is in [packages/plugin-rsc/examples/basic/src/routes/use-cache/server.tsx:39](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/examples/basic/src/routes/use-cache/server.tsx#L39), covering a normal function, a component with dynamic children, and a closure.

Next.js implements `"use cache"` as part of its SWC server-actions transform in [crates/next-custom-transforms/src/transforms/server_actions.rs:283](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L283).

Runtime and registration imports are emitted around [crates/next-custom-transforms/src/transforms/server_actions.rs:2582](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L2582).

A representative nested closure output is [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/40/output.js:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/40/output.js#L1). It shows the emitted callable shape, generated reference ID, explicit inner function, closure-bound argument representation, and runtime call.

A representative custom cache-kind output is [crates/next-custom-transforms/tests/fixture/server-actions/server-graph/38/output.js:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/38/output.js#L1).

The Next.js runtime ABI consumer begins at [packages/next/src/server/use-cache/use-cache-wrapper.ts:1612](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1612). Its wider cache implementation is not part of the comparison unless a specific behavior depends on the transform call shape.

## Preliminary Architectural Difference

The demo performs a generic rewrite whose essential shape is `runtime(hoistedFunction).bind(null, capturedValues...)`. The runtime receives the hoisted function, while closure captures are subsequently attached through ordinary JavaScript binding.

Next.js emits a framework-specific wrapper whose runtime call carries a cache kind, generated reference ID for the examined build, bound-argument count, inner implementation, and bound captures as distinct inputs.

The investigation should test the consequences of this representational difference. It should not assume that surrounding Next.js infrastructure is required merely because it appears in the same output or runtime module.

## Related Context

- [FINDINGS.md](./FINDINGS.md) contains the completed first-pass comparison.
- [FINDINGS-STABLE-CACHE-IDENTITY.md](./FINDINGS-STABLE-CACHE-IDENTITY.md) expands the generated-identity follow-up while keeping runtime cache policy secondary.
- [VINEXT-CONTEXT.md](./VINEXT-CONTEXT.md) explains Vinext's compatibility target where `"use cache"` implicitly also has `"use server"` transport semantics, how it differs from the server-local demo model, and why it activates the cross-environment server-reference follow-up.
- [SERVER-FUNCTION-EXTENSIBILITY.md](./SERVER-FUNCTION-EXTENSIBILITY.md) documents how Vinext #2156 uses the generalized #1246 transforms and proposes a framework-neutral server-reference registration API.
- [VINEXT-SERVER-REFERENCE-PRESERVATION.md](./VINEXT-SERVER-REFERENCE-PRESERVATION.md) explains why plugin-rsc's opaque replay option is a Vinext implementation choice rather than a Next.js compatibility requirement.

## Research Plan

### 1. Build A Focused Fixture Matrix

Use equivalent small inputs for both transforms: a plain local async function, a function with explicit arguments, one closure capture, nested closures, member-only object capture, and a cached component whose props test invocation-argument representation.

Keep declaration-form and syntax breadth out of this matrix. Add a case only when it isolates a difference in callable representation, capture representation, identity, or runtime ABI.

### 2. Compare Generated Representation And Runtime ABI

Record exact generated output or normalized pseudocode for each fixture. Reduce each output to:

- The transformed callable and inner implementation shape.
- The point where the runtime wrapper is created.
- The representation and ordering of closure captures.
- The representation of invocation arguments.
- The generated identity and metadata passed to the runtime.
- The behavior of nested transformed functions and repeated wrapper creation.

Avoid starting with broad Next.js end-to-end suites because transform fixtures expose this contract more directly.

### 3. Inventory Transform-Provided Information

Build a compact table showing whether each implementation exposes the following information explicitly, leaves it inferable from JavaScript behavior, or loses it before the runtime call:

- Per-definition identity during the loaded module lifetime.
- Cache kind.
- Closure capture count and ordering.
- The boundary between closure captures and invocation arguments.
- A separately addressable inner implementation.
- Generated reference metadata present in the output, without evaluating its cross-environment use.

Trace runtime code only far enough to confirm which entries in this inventory it consumes. Do not compare how the runtime implements serialization, caching, or replay after consuming them.

### 4. Map Transform-Constrained Capabilities

For each candidate capability, first identify the transform-produced information it requires. Include the capability in the comparison only when that dependency is demonstrated.

The initial candidates are:

- Correct identity when wrappers are recreated within one module lifetime.
- Runtime treatment of closure captures separately from invocation arguments.
- Cache-kind dispatch.
- Nested cached functions and nested capture binding.
- Runtime access to an unwrapped inner implementation.

Classify each capability as supported directly, possible through runtime-only changes, requiring an extended transform ABI, or unsupported by the current representation. A feature missing from the demo runtime is not evidence of a transform limitation.

### 5. Confirm Uncertain Transform Facts

Use existing transform snapshots first. Add or propose a narrow fixture only when generated output or runtime ABI consumption remains uncertain. Do not expand confirmation into broad runtime or end-to-end behavior testing.

### 6. Produce The First Research Output

Deliver:

- A concise pipeline diagram for each transform.
- Annotated generated output for the focused fixtures.
- The transform-information inventory.
- A capability matrix containing only demonstrated transform dependencies.
- The earliest transform-level constraint behind each material difference.
- The smallest transform ABI extension that could remove each important constraint without importing unrelated Next.js policy.

Classify recommendations as: preserve the minimal design, document an intentional difference, harden the generic hoister, extend the demo transform ABI, or defer because the behavior is framework-specific.

## Follow-Up Investigations

These topics are related but should not expand the first pass unless a core semantic dependency requires them.

### Stable Identity Beyond A Module Lifetime

Compare source and build hashes, argument masks, manifests, code-change invalidation, deployment boundaries, persistent entries, distributed handlers, module reloads, and HMR. This deserves a separate investigation because it depends on build-system and storage policy beyond the current in-memory demo.

### Cross-Environment Server References

Investigate `registerServerReference`, client-layer proxies, export annotations, protected bound arguments, and whether cached callables need to cross an RSC boundary. The current demo invokes cached functions inside the RSC environment, so this is not required to explain its existing behavior.

### Broader Transform Surface

Compare named and default exports, arrow functions, file-level directives, methods, module-scope variants, computed access, optional access, destructuring, shadowing, and other declaration or capture forms. Include these when considering a supported general-purpose transform rather than the semantics of the current example.

### Validation And Diagnostics

Inventory validation after the semantic work. Focus on checks that prevent unsound transforms or protect runtime invariants, such as unsupported closure forms and client-boundary restrictions. Skip comprehensive typo and diagnostic-message comparison unless validation itself becomes the subject of later work.

### Next.js Cache Policy

Study cache life, tags, stale/revalidate/expire metadata, prerender stages, request APIs, custom handlers, resume data, hanging-fill diagnostics, and invalidation as independent framework features.

## Explicit Exclusions

Exclude Flight argument encoding, temporary-reference set mechanics, result-stream serialization and replay, console replay, pending-call deduplication, and cache storage mechanics when they require no additional generated information. Differences in these techniques are not evidence of a transform limitation.

Do not treat the current demo as a proposed public `@vitejs/plugin-rsc` API. It is configured inside `examples/basic` and currently demonstrates composition of the generic directive hoister with an application runtime.

## Expected Outcome

The first write-up should answer four questions:

1. What callable representation and runtime ABI does each transform emit?
2. What information does the Next.js transform provide that the generic hoist-and-bind transform does not?
3. Which relevant capabilities are demonstrably constrained by those information differences rather than merely absent from the demo runtime?
4. What is the smallest transform ABI change needed to remove each important constraint?
