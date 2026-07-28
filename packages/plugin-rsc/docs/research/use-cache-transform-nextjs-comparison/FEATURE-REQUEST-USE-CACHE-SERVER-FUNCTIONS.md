# Feature Request: Framework-Owned `"use cache"` Server Functions

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 39d38933a1ed75cf9aa3c20a6902c205c7c90411
- Branch: callable-inline-hoist
- Worktree: /Users/hogawa/code/others/vite-plugin-react-callable-inline-hoist
- Status: Draft

## Request

Provide the plugin-rsc infrastructure needed for a framework-owned directive such as `"use cache"` to produce React Server Functions with Next.js-compatible callable and transport behavior, without teaching plugin-rsc cache storage or invalidation policy.

The framework should be able to wrap module-level and inline functions with its cache runtime, register the wrapper as the canonical server reference, transport it through Client Components, and resolve the same wrapper in development and production.

## Motivation

Next.js cached functions are not only server-local memoized functions. A cached module export can be imported by a Client Component, and an inline cached closure can be passed through Flight and invoked from the browser. In both cases, React Server Function transport resolves and invokes the cache wrapper rather than bypassing it for the raw implementation.

plugin-rsc already provides most of the lower-level pieces: directive transforms, closure hoisting, protected bound arguments, server-reference proxies, development loading, and production manifests. The remaining work is now concrete enough to track as one feature stream rather than as independent transform experiments.

## Target Behavior

### Module-Level Cache Directive

Given:

```js
'use cache'

export async function getValue(input) {
  return compute(input)
}
```

A framework integration should be able to:

1. Keep a private implementation.
2. Create one module-level cache wrapper.
3. Register and export that wrapper as the server-reference target.
4. Emit browser and SSR proxies for `getValue`.
5. Resolve the wrapper through the development loader and production manifest.

### Inline Cache Directive

Given:

```js
function Component({ accountId }) {
  async function getValue(input) {
    'use cache'
    return compute(accountId, input)
  }

  return <Client getValue={getValue} />
}
```

A framework integration should be able to:

1. Hoist a private implementation.
2. Create one module-level cache wrapper and register it as a server reference.
3. Export the wrapper under a generated name so manifests can resolve it.
4. Bind one protected capture payload to the registered wrapper at the original lexical site.
5. Decrypt captures in the cache wrapper before cache-key construction and implementation invocation.
6. Invoke the same wrapper whether called locally or through Flight.

## Architecture Boundary

plugin-rsc should own reusable Server Function infrastructure:

- Canonical development and production module identity.
- Owner- and environment-scoped server-reference claims.
- Module and inline directive transform primitives.
- Protected capture transport.
- Browser and SSR proxy generation.
- Development resolution and production manifest publication.

The framework integration should own `"use cache"` semantics:

- Directive spelling and cache kind selection.
- Cache wrapper construction.
- Cache keys, handlers, lifetime, tags, invalidation, and persistence.
- Build or deployment cache namespaces.
- Argument-admission policy.
- Whether a cached callable participates in Server Function transport.

The feature is therefore not a request to hardcode `"use cache"` into plugin-rsc. It is a request to make the proven Server Function extension path sufficient and maintainable for a framework to implement it.

## Current Status

| Work item                                                  | Status                                 | Tracking                                                                                                                                                          |
| ---------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner-aware server-reference claims and canonical identity | Complete                               | [PR #1310](https://github.com/vitejs/vite-plugin-react/pull/1310)                                                                                                 |
| Canonical module-level wrapper for inline directives       | In progress                            | [PR #1330](https://github.com/vitejs/vite-plugin-react/pull/1330)                                                                                                 |
| Rich transform metadata, syntax coverage, and validation   | Proposed                               | [PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246)                                                                                                 |
| Module and inline callable cache transport E2E             | Not started                            | Specified in [FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md](./FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md#narrow-development-and-build-e2e-proof)                |
| Mixed module/inline directive ownership                    | Researched; implementation not started | [FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md](./FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md) and closed [PR #1315](https://github.com/vitejs/vite-plugin-react/pull/1315) |
| Higher-level Server Function helper                        | Deferred                               | [SERVER-FUNCTION-EXTENSIBILITY.md](./SERVER-FUNCTION-EXTENSIBILITY.md#optional-higher-level-helper)                                                               |

## Proposed Work Stream

### 1. Land The Canonical Callable Primitive

Finish PR #1330 so `transformHoistInlineDirective` can make the runtime result, rather than the raw implementation, the generated module binding.

Required invariants:

- The implementation remains private.
- The runtime wrapper is created once at module scope.
- The generated export resolves to the wrapper.
- Closure binding targets the registered wrapper.
- `noExport` controls visibility independently from wrapper placement.
- Existing transform behavior remains unchanged unless the option is enabled.

This is the minimum transform correction needed to prevent remote resolution from bypassing framework behavior.

### 2. Add A Framework-Owned Cache Transport Integration

Build one external plugin, modeled on `examples/custom-server-function`, that owns `"use cache"` while using plugin-rsc's public identity and claim APIs.

In the RSC environment:

- Resolve canonical module identity through `manager.serverReferences`.
- Use `transformWrapExport` for module-level cache directives.
- Use `transformHoistInlineDirective` with the canonical runtime binding for inline cache directives.
- Construct the cache wrapper before calling `registerServerReference`.
- Claim source export names or generated inline export names.
- For captured inline functions, configure capture encoding but let the cache wrapper perform decoding.

In browser and SSR environments:

- Proxy module-level cache exports with `transformDirectiveProxyExport`.
- Publish matching claims without deleting claims from other owners or environments.

This integration can initially live in an example or downstream framework. It does not require a new in-core directive registry.

### 3. Prove Development And Production Transport

Add one focused E2E fixture covering both forms:

- A module-level cached export imported by a Client Component.
- An inline cached closure passed to a Client Component through Flight.
- Equal calls hit the same cache entry and different arguments miss.
- Inline captures affect the key and are reconstructed correctly.
- The captured secret is not present in plaintext Flight output.
- Module and inline wrappers have distinct reference identities.
- A clean production build resolves both references without a prior development request.

Run the same assertions under `vite dev` and a production build/server. Keep the cache runtime deliberately small so failures remain attributable to transform, proxy, claim, or manifest behavior.

This is the first feature milestone. At this point a framework can implement transported callable caching for unmixed directive modules.

### 4. Land Next.js-Compatibility Metadata And Validation

Narrow PR #1246 around capabilities not superseded by the canonical callable work:

- Source parameter metadata such as `{ count, hasRest }`.
- A capture-boundary signal for the protected leading argument.
- Generated-name stability with a clearly documented contract.
- Object-method and static-method support where semantics are sound.
- Rejection of sync functions and meaning-changing constructs.
- Correct directive-prologue recognition.

The cache wrapper can use parameter metadata to reproduce Next.js-style fixed-prefix versus pass-all argument admission. This is compatibility hardening rather than a prerequisite for proving that the registered wrapper is transported and invoked.

Validation should prioritize transformations that can change meaning, including `this`, `super`, `arguments`, unsupported instance methods, and known closure-hoisting initialization hazards.

### 5. Support Mixed Directive Ownership

Independent complete transforms cannot correctly compose these cases:

```js
'use server'

export async function cached() {
  'use cache'
}
```

```js
'use cache'

export async function action() {
  'use server'
}
```

Implement shared role classification before generating wrappers, exports, proxies, and claims:

1. Parse the module-level default role.
2. Classify explicit function-level overrides in one traversal.
3. Assign one owner and canonical callable to each transformed function.
4. Generate server output and client/SSR proxies from the same classification.
5. Publish non-conflicting claims for the final exported references.

This should build on the canonical-callable representation rather than retrying transform-order composition. It is required for broad Next.js source compatibility, but it should not block the unmixed transport milestone.

### 6. Derive A Higher-Level Helper Only After The Integration Works

The external cache plugin will repeat environment branching, runtime import injection, proxy generation, capture encryption, and claim cleanup already used by built-in `"use server"`.

After the E2E proves the lifecycle, evaluate a helper such as `createServerFunctionPlugin`. Derive its API from the working built-in and cache integrations rather than designing a generic directive system first.

The helper should standardize Server Function lifecycle mechanics while leaving callable production and directive semantics under framework control.

## Milestones

### Milestone A: Transport-Capable `"use cache"`

- PR #1310 claim infrastructure is used rather than private metadata mutation.
- PR #1330 exports and registers the canonical inline wrapper.
- Module-level and inline cached functions cross a Client Component boundary.
- Development and production E2E pass.
- Cache policy remains framework-owned.

### Milestone B: Next.js Source Compatibility

- Fixed and rest parameter admission can match Next.js behavior.
- Captures are protected, decoded before keying, and included in cache arguments.
- Module-level defaults and inline role overrides compose correctly.
- Unsupported hoisting constructs fail with diagnostics instead of producing meaning-changing output.
- Generated reference identity has a documented stability contract.

### Milestone C: Maintainable Framework API

- Built-in and framework-owned Server Function integrations share lifecycle plumbing where practical.
- Userland integrations do not reproduce identity normalization, manifest publication, stale-claim cleanup, or environment-specific proxy orchestration.
- The public API remains independent from cache storage and invalidation policy.

## Acceptance Criteria

The feature stream is complete when:

1. A framework plugin can implement both module-level and inline callable `"use cache"` without patching plugin-rsc internals.
2. React Server Function resolution always targets the cache wrapper rather than the private implementation.
3. Inline captures survive Flight as protected bound arguments and participate in cache keys.
4. Browser, SSR, development RSC, and production RSC environments agree on reference identity and ownership.
5. Mixed `"use server"` and `"use cache"` roles are classified consistently rather than depending on plugin order.
6. Focused transform fixtures and development/build E2E protect the above behavior.

## Non-Goals

- Implement Next.js cache storage inside plugin-rsc.
- Standardize cache handlers, tags, lifetime, revalidation, or persistence.
- Reproduce Next.js's exact server-reference hash format.
- Guarantee cache reuse across deployments from transform identity alone.
- Require opaque preservation of server references during cached Flight replay.
- Make every custom directive remotely callable.
- Introduce a generic directive-provider API before a working integration demonstrates its shape.

## Open Questions

1. Which remaining pieces of PR #1246 should land independently after PR #1330, and which are superseded?
2. What stability guarantee should generated inline export names provide beyond deterministic output for one source and build configuration?
3. Should argument admission remain framework metadata or become a reusable Server Function transform concept?
4. Should mixed-role classification first live in a framework integration or replace the built-in module-versus-inline branch in plugin-rsc?
5. Which validation rules belong in the generic hoister versus a directive-specific policy layer?
6. At what point does duplicated lifecycle code justify a first-class `createServerFunctionPlugin`-style helper?

## Research Basis

- [FINDINGS.md](./FINDINGS.md) compares the generic transform and Next.js transform-to-runtime ABIs.
- [FINDINGS-INLINE-DIRECTIVE.md](./FINDINGS-INLINE-DIRECTIVE.md) establishes that the underlying inline Server Function model is already closely aligned.
- [FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md](./FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md) specifies wrapper registration, protected captures, claims, proxies, and the focused E2E.
- [FINDINGS-STABLE-CACHE-IDENTITY.md](./FINDINGS-STABLE-CACHE-IDENTITY.md) separates per-definition identity from captures and deployment invalidation.
- [FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md](./FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md) demonstrates why independent transform ordering cannot solve mixed roles.
- [PLAN-CANONICAL-CALLABLE-TRANSFORM.md](./PLAN-CANONICAL-CALLABLE-TRANSFORM.md) defines the canonical wrapper primitive implemented by PR #1330.
- [SERVER-FUNCTION-EXTENSIBILITY.md](./SERVER-FUNCTION-EXTENSIBILITY.md) defines the plugin-rsc versus framework responsibility boundary.
