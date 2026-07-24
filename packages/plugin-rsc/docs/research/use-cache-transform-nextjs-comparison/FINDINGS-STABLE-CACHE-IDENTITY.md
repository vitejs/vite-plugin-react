# Stable Cache Identity

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 31cdbb82219b6b637eee338a3492f735c78116bf
- Branch: main
- Next.js repo: git@github.com:vercel/next.js.git
- Next.js commit: 153bf8ac5fa00888ef5fbb2b65cac12f0942a44f
- Next.js branch: canary
- Plugin-rsc PR #1246 head: 5a2fd7519fa6cce09af04b8b5288ecb8d4a2ddc3
- Reviewed: 2026-07-24

## Question

What identity information does the Next.js transform provide for `"use cache"`, what behavior depends on that transform-produced information, and does plugin-rsc PR #1246 move the generic Vite RSC transform in the same direction?

The primary scope is the transform-to-runtime ABI. Runtime cache policy is relevant only when it demonstrates how transform-produced identity is consumed or why some information is intentionally absent from the transform.

This note expands the stable-identity item under [Completed Follow-Ups](./FINDINGS.md#completed-follow-ups) and the initial generated-identity discussion under [FINDINGS.md:213](./FINDINGS.md#generated-identity). Cross-environment registration and protected bound arguments remain a separate pending follow-up.

## Executive Findings

1. Next.js emits one per-function server-reference ID and passes the same ID to both the cache runtime and React server-reference registration.
2. The ID is transform-produced from a build-provided salt, source filename, export or generated name, and parameter-shape metadata. Function bodies, closure values, and dependency code are not ID inputs.
3. The generated ID gives the cache runtime per-definition separation without requiring it to inspect the function object. It also gives the RSC transport a manifest-resolvable reference for the wrapped cached callable.
4. Exported functions use stable source export names. Inline functions use traversal-order generated names, so inserting an earlier transformed function can change later IDs even when those functions are untouched.
5. Next.js keeps captured closure values outside the function ID. The transform packages them as protected bound arguments, tells the cache runtime their count, and the runtime includes the decoded values with invocation arguments.
6. PR #1246 supplies the corresponding generic pieces: a generated name passed to the runtime, `hasBoundArgs`, parameter shape, and an exported wrapped hoist. Its `stableName` improves unrelated-insertion stability, but it is not equivalent to Next.js because it hashes the exact function source.
7. No additional transform metadata is needed merely because handlers are distributed when they consume the same emitted build. Persistence and deployment invalidation concern runtime key composition, not the directive transform.
8. A dependency-aware implementation revision would be new build-produced information for cross-deployment reuse. It is not part of current Next.js transform equivalence.

## Transform-produced Identity In Next.js

### ID generation

The shared server-actions transform generates one server-reference ID for actions and cached functions in [crates/next-custom-transforms/src/transforms/server_actions.rs:284](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L284):

```text
digest = SHA1(hashSalt + fileName + ":" + exportName)
metadata = cacheTypeBit | sixArgumentMask | restBit
serverReferenceId = hex(metadata + digest)
```

The transform receives `hashSalt` from the build configuration. The salt influences the emitted value, but its generation and rotation are build policy rather than syntax analysis.

The leading metadata byte identifies a cache function and encodes positional argument admission in [server_actions.rs:308](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L308). The current implementation marks every declared parameter as used instead of analyzing references in the body in [server_actions.rs:339](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L339).

The resulting ID therefore carries:

- Cache function versus server action.
- Up to six admitted positional arguments.
- Rest or unknown argument admission.
- A salted source location and generated/export name identity.

It does not carry:

- Function body content.
- Imported dependency content.
- Closure capture values.
- Cache kind.
- Build, deployment, or HMR identity.

### Exported and inline names

For module exports, the hash input uses the source export name. For inline functions, the transform generates names such as `$$RSC_SERVER_ACTION_0` and `$$RSC_SERVER_CACHE_0` from one traversal-order counter in [server_actions.rs:381](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L381).

This creates two identity behaviors:

- An exported function retains its ID when unrelated code changes, provided filename, export name, parameter shape, and salt remain unchanged.
- An inline function can receive a new ID when an earlier action or cached function is inserted or removed because its generated ordinal changes.

Thus, Next.js does not currently provide insertion-stable identity for every inline cached function. Its emitted ID is stable enough to address the function within one generated server-reference manifest, but it is not a semantic identity independent of transform traversal.

### ID consumption in generated output

For each cached function, the transform emits a wrapper with the normalized shape:

```js
const wrapped = cache(
  cacheKind,
  serverReferenceId,
  boundArgsLength,
  innerFn,
  admittedArgs,
)
registerServerReference(wrapped, serverReferenceId, null)
```

The cache call is assembled in [crates/next-custom-transforms/src/transforms/server_actions.rs:2979](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L2979), and the wrapped callable is registered as a server reference in [server_actions.rs:3127](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L3127).

The same transform-produced ID therefore has two consumers:

1. The cache runtime uses it as per-definition key material.
2. React server-function transport uses it to resolve the wrapped callable.

This reuse is a Next.js output design, not proof that a generic Vite RSC implementation must encode cache policy into its server-reference registry. A generic transform only needs to make a deterministic function identity available to both consumers.

## Captures Are Arguments, Not Function Identity

The transform separately analyzes closure captures, inserts them into the hoisted implementation, and reports their count to the cache runtime. The runtime call receives `boundArgsLength`, while the generated server reference is bound to one encrypted capture payload.

At runtime, the protected payload is decrypted and reconstructed before key serialization in [packages/next/src/server/use-cache/use-cache-wrapper.ts:1980](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1980). The capture values then participate in the argument portion of the cache key.

This preserves the important distinction:

- The transform-generated function ID identifies the cached definition.
- Bound capture values distinguish instances of that definition.
- Invocation arguments distinguish calls to that bound instance.

The identity investigation therefore reinforces the earlier transform ABI findings. A generic hoister should expose whether a protected capture payload exists and how source parameters are admitted, but it should not hash capture values into the generated function name.

## Transform Identity Stability Matrix

This matrix concerns the emitted Next.js server-reference/function ID only. Runtime cache epochs are intentionally excluded.

| Change                               | Exported cached function ID | Inline cached function ID                                         | Transform reason                                                                                                    |
| ------------------------------------ | --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Identical transform inputs           | Stable                      | Stable                                                            | All hash inputs and generated traversal names are unchanged.                                                        |
| Unrelated statement insertion        | Stable                      | Stable unless it adds a transformed reference before the function | Source offsets are not hashed.                                                                                      |
| Earlier action/cache insertion       | Stable                      | May change                                                        | Inline generated names use a shared traversal counter.                                                              |
| Function body edit                   | Stable                      | Stable if generated ordinal and source name remain unchanged      | Body content is not hashed.                                                                                         |
| Whitespace/comment edit              | Stable                      | Stable if traversal remains unchanged                             | Exact source slices are not hashed.                                                                                 |
| Parameter count/rest change          | Changes                     | Changes                                                           | The metadata byte changes.                                                                                          |
| Parameter rename with the same shape | Stable                      | Stable                                                            | Parameter names are not hash inputs.                                                                                |
| Export or source function rename     | Changes                     | Stable if generated ordinal remains unchanged                     | Exported IDs use the export name; inline IDs use the generated traversal name rather than the source function name. |
| File rename or move                  | Changes                     | Changes                                                           | Filename is a hash input.                                                                                           |
| Imported dependency edit             | Stable                      | Stable                                                            | Dependency content is not a transform ID input.                                                                     |
| Different hash salt                  | Changes                     | Changes                                                           | Salt is an explicit transform input.                                                                                |

## Transform Information Inventory

| Information                 | Next.js output                                        | Why the cache integration needs it                                       | PR #1246                                                                              |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Per-definition identity     | `serverReferenceId`                                   | Separates entries for different cached functions and addresses transport | Runtime receives generated hoist name; surrounding plugin can combine module identity |
| Cache/action classification | Leading ID type bit                                   | Runtime and transport metadata classification                            | Directive match identifies custom cache semantics outside the generic transform       |
| Parameter admission         | Leading argument mask/rest bit plus generated slicing | Excludes framework-supplied extra arguments from cache keys              | `parameters: { count, hasRest }`                                                      |
| Capture boundary            | `boundArgsLength` and protected first argument        | Reconstructs captures before keying and invocation                       | `hasBoundArgs` plus existing `encode`/`decode` hooks                                  |
| Cache kind                  | Separate runtime argument                             | Chooses cache handler                                                    | `directiveMatch`                                                                      |
| Wrapped export target       | Registered/exported cache wrapper                     | Remote resolution must not bypass caching                                | `exportWrappedHoist`                                                                  |
| Implementation content      | Not present in current ID                             | Not needed for current transform equivalence                             | `stableName` includes only the local source slice                                     |
| Dependency content          | Not present in current ID                             | Only needed for finer-grained durable reuse                              | Not provided                                                                          |

## Current Vite RSC Identity

### Module and export identity

Plugin-rsc resolves a production module reference key as the first 12 hex characters of SHA-256 over the root-relative normalized import path in [packages/plugin-rsc/src/plugins/server-reference.ts:29](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugins/server-reference.ts#L29) and [packages/plugin-rsc/src/plugins/utils.ts:130](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugins/utils.ts#L130). Development uses a normalized Vite import URL.

The complete server reference is effectively:

```text
referenceKey + "#" + exportName
```

The server transform registers this pair in [packages/plugin-rsc/src/plugin.ts:2042](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugin.ts#L2042), client and SSR proxies recreate it in [plugin.ts:2097](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugin.ts#L2097), and runtime loading splits it back into module and export name in [packages/plugin-rsc/src/core/rsc.ts:94](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/core/rsc.ts#L94).

PR #1310 changes ownership and cleanup rather than identity generation. Claims must agree on module identity and cannot assign the same export to different owners in [packages/plugin-rsc/src/plugins/server-reference.ts:69](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugins/server-reference.ts#L69).

### Current inline identity

The built-in hoister currently names inline references by traversal order. This has the same broad instability as Next.js inline generated names: inserting an earlier directive can rename later references.

The server-local cache example does not consume generated names as cache identity. It memoizes by the hoisted JavaScript function object and then by serialized arguments in [packages/plugin-rsc/examples/use-cache/src/framework/use-cache-runtime.tsx:14](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/examples/use-cache/src/framework/use-cache-runtime.tsx#L14). That is sufficient for one process lifetime but does not expose per-definition identity to an external or shared handler.

## PR #1246 `stableName`

PR #1246 computes an opt-in inline name from:

```text
signature = originalName + ":" + exactFunctionSourceSlice
generatedName = "$$hoist_" + sha256(signature)[0:12] + duplicateIndex + originalName
```

The implementation is in [packages/plugin-rsc/src/transforms/hoist.ts:156](https://github.com/vitejs/vite-plugin-react/blob/5a2fd7519fa6cce09af04b8b5288ecb8d4a2ddc3/packages/plugin-rsc/src/transforms/hoist.ts#L156).

Compared with Next.js inline identity:

| Change                                  | Next.js inline ID                | PR #1246 generated name                                                |
| --------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Unrelated earlier statement             | Stable                           | Stable                                                                 |
| Earlier non-identical cached function   | Changes through ordinal          | Stable                                                                 |
| Body edit                               | Stable if ordinal/name unchanged | Changes                                                                |
| Whitespace/comment edit inside function | Stable                           | Changes                                                                |
| Imported dependency edit                | Stable                           | Stable                                                                 |
| File move                               | Changes through filename         | Generated name remains; full Vite reference changes through module key |
| Exact duplicate insertion/reordering    | Can change through ordinal       | Can change through duplicate index                                     |

`stableName` is therefore not a direct reproduction of Next.js identity. It trades Next.js's body-stable logical identity for local source-content invalidation and improved resistance to unrelated insertion.

When combined with `exportWrappedHoist`, the generated name addresses the exported cache wrapper instead of the raw hoisted implementation in [hoist.ts:167](https://github.com/vitejs/vite-plugin-react/blob/5a2fd7519fa6cce09af04b8b5288ecb8d4a2ddc3/packages/plugin-rsc/src/transforms/hoist.ts#L167). This output shape is aligned with Next.js because both cache and server-reference consumers must reach the same wrapped callable.

## Assessment Of PR #1246

PR #1246 is in the direction established by the original transform comparison:

- It exposes parameter shape rather than requiring the runtime to infer it from `Function.length`.
- It exposes the capture boundary before ordinary invocation arguments.
- It keeps cache kind in directive metadata.
- It can export the wrapped hoist as the manifest-addressable callable.
- It offers a generated inline identity that is less sensitive to unrelated transformed functions.

The open design question is narrower than "stable cache identity" generally:

> What stability contract should a generated inline reference name provide?

Current Next.js does not answer this perfectly because its inline ordinals are insertion-sensitive. PR #1246 improves that case, but exact-source hashing also makes transport identity change for behaviorally irrelevant edits and does not cover dependency changes. The option should therefore be justified as an insertion-stable generated reference name, not as a complete persistent cache identity or a strict Next.js reproduction.

For current Next.js-equivalent transform behavior, the surrounding integration still needs to combine:

```text
canonical module identity + generated/export name
```

and pass that identity to both the cache wrapper and server-reference registration. PR #1246 provides the generated/export-name side; plugin-rsc's server-reference manager provides canonical module identity.

## Runtime And Build Context

This section records non-transform mechanisms only to delimit what the transform ID is responsible for.

### Deployment and HMR epochs

Next.js's cache runtime serializes normalized key parts of:

```text
[
  deploymentId || buildId,
  serverReferenceId,
  decodedCaptureAndInvocationArguments,
  optionalDevelopmentHmrRefreshHash,
]
```

The runtime explicitly says the action ID is not unique per implementation, so a build ID prevents unsafe reuse across builds in [packages/next/src/server/use-cache/use-cache-wrapper.ts:1843](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1843). It assembles the final key parts in [use-cache-wrapper.ts:2016](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L2016).

`deploymentId` is effectively a runtime cache namespace constant. It does not add function-level transform information. Its relevance here is only that Next.js deliberately handles body and deployment invalidation outside the transform-generated function ID.

Likewise, the development HMR refresh hash is not evidence that the transform needs source-content identity. It is an external invalidation mechanism compensating for IDs that remain stable across body edits.

### Persistence and distributed handlers

Next.js intentionally does not reuse ordinary `"use cache"` or `"use cache: remote"` entries across deployments. The documentation identifies build or deployment identity as the safety boundary in [docs/01-app/03-api-reference/01-directives/use-cache-remote.mdx:92](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/docs/01-app/03-api-reference/01-directives/use-cache-remote.mdx#L92).

This policy does not introduce another transform requirement. Multiple handlers running the same emitted build naturally receive the same function IDs. Whether they share entries depends on the cache handler and key namespace, not additional directive metadata.

### Experimental implementation hash

Turbopack can emit a separate `codeHash` for cache references under `experimental.durableUseCacheEntries`. Manifest generation computes a server dependency-subtree hash in [crates/next-api/src/server_actions.rs:232](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-api/src/server_actions.rs#L232) and [server_actions.rs:360](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-api/src/server_actions.rs#L360).

Tests show that it changes with the cached module and server dependencies while remaining stable for unrelated and client-only changes in [test/production/app-dir/use-cache-code-hash/use-cache-code-hash.test.ts:52](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/production/app-dir/use-cache-code-hash/use-cache-code-hash.test.ts#L52).

The standard cache runtime does not currently consume this manifest field. It should be treated as possible future build-produced information for durable reuse, not as part of the current directive transform contract.

## Focused Conclusions

The stable-identity follow-up produces one additional transform conclusion beyond the original findings:

> A cache integration that can outlive a JavaScript function object needs a deterministic per-definition identity supplied by generated output.

For module exports, canonical module identity plus export name already provides that value. For inline functions, a generated exported name is required. PR #1246 supplies such a name and makes the wrapped callable exportable.

The remaining choices are policy and stability details:

- Whether inline identity should follow Next.js's traversal ordinal exactly.
- Whether it should instead survive unrelated transformed-function insertion.
- Whether body edits should change transport identity or be handled by an external build/HMR epoch.
- Whether a stronger dependency-aware implementation revision is ever needed for cross-deployment reuse.

Only the first three affect the transform name contract. Deployment constants, shared storage, and invalidation epochs belong to the consuming cache integration.

## Next Proof

The next proof should remain transform-focused. Apply the Next.js and PR #1246 transforms to equivalent fixtures and record only generated identity and wrapper placement for:

1. Two identical transforms.
2. An unrelated statement insertion.
3. An earlier inline cached-function insertion.
4. A body-only edit.
5. A whitespace-only edit.
6. A parameter-shape change.
7. A function rename.
8. A file move after composing module and generated identity.

The deliverable should decide and test the intended `stableName` contract. Runtime cache-hit tests across deployments are not needed for that decision because they exercise namespace and storage policy rather than transform-provided information.
