# Vinext Server-Reference Preservation Analysis

## Conclusion

`preserveServerReferences` is not required for Next.js-compatible `"use cache"` behavior.

Vinext currently uses the option when decoding cached Flight, so plugin-rsc PR #1289 is a dependency of that implementation. However, no Vinext failure or test demonstrates that opaque preservation is required. Next.js revives the referenced server module during cache replay and then reserializes the registered function as a Server Reference.

The actual compatibility requirement is that a Server Reference survives cached Flight replay and remains invocable. Avoiding implementation-module revival is a separate plugin-rsc capability.

## Relevant Changes

### Original Vinext Failure

[Vinext PR #1871](https://github.com/cloudflare/vinext/pull/1871) targets nested cached functions passed to Client Components and invoked through `useActionState`.

The failures identified during its review were:

- The transformed function used an incorrect, non-normalized reference ID.
- Its module and hoisted exports were absent from `RscPluginManager.serverReferenceMetaMap`.
- Consequently, the production `virtual:vite-rsc/server-references` manifest could not resolve the submitted action.
- The built-in `rsc:use-server` transform later deleted metadata contributed by Vinext.

These are registration, identity, manifest, and metadata-lifecycle problems. They do not imply that cache replay must preserve references opaquely.

### Preservation Appears Later

[Vinext commit b8a116c](https://github.com/cloudflare/vinext/commit/b8a116cf61642fc9b02903ad619f701c67139771) introduced:

```ts
createFromReadableStream(stream, {
  serverReferences: 'preserve',
})
```

The change was part of `refactor(use-cache): use plugin-rsc directive transforms`. Its commit message does not describe a failure caused by normal reference revival.

The corresponding preservation implementation had been added to plugin-rsc minutes earlier in [vite-plugin-react commit 2ae42d1](https://github.com/vitejs/vite-plugin-react/commit/2ae42d1221f5eacaa89eec7e4d64fdaf39324149), initially as part of [plugin-rsc PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246).

The feature was later isolated in [plugin-rsc PR #1253](https://github.com/vitejs/vite-plugin-react/pull/1253) and landed in narrower form as [plugin-rsc PR #1289](https://github.com/vitejs/vite-plugin-react/pull/1289).

[Vinext PR #2156](https://github.com/cloudflare/vinext/pull/2156) only migrates the existing call to the landed API:

```ts
createFromReadableStream(stream, {}, { preserveServerReferences: true })
```

Therefore #2156 listing #1289 as an upstream dependency describes its current code path, not a requirement established by the Next.js compatibility target.

## The Conflated Requirements

Two different properties were treated as one:

1. A cached Flight fragment containing a Server Reference must replay into a value that can be serialized to the browser and invoked later.
2. The replaying RSC runtime must not import the referenced implementation module.

Next.js requires the first property but does not implement the second.

Normal revival is sufficient when the implementation is registered correctly:

```text
cached Flight
  -> createFromReadableStream
  -> server module map lookup
  -> import registered implementation
  -> recover registered Server Reference identity
  -> serialize it into the enclosing Flight response
```

Opaque preservation instead creates a synthetic registered reference carrying the original ID without importing the implementation. That is a valid optimization or framework architecture, but it is not necessary for compatibility.

## Next.js Behavior

On cache replay, Next.js constructs a `serverConsumerManifest` containing `serverModuleMap` in [`use-cache-wrapper.ts:3325`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L3325).

It passes that manifest to `createFromReadableStream` in [`use-cache-wrapper.ts:3336`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L3336). React uses the map to resolve and load the Server Function implementation. Because the loaded export is already registered, rendering the decoded value into the outer RSC response serializes it as a Server Reference again.

Next.js has no equivalent of plugin-rsc's `preserveServerReferences` mode. Plugin-rsc PR #1289 explicitly records this distinction in its description.

## Plugin-rsc Behavior

Plugin-rsc's default `createFromReadableStream` supplies a server manifest in [`packages/plugin-rsc/src/react/rsc/client.ts:30`](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/react/rsc/client.ts#L30).

Without preservation, the manifest resolves references through `requireModule` in [`packages/plugin-rsc/src/core/rsc.ts:87`](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/core/rsc.ts#L87). Development imports the normalized Vite module URL, while production resolves through `virtual:vite-rsc/server-references`.

With preservation enabled, `createServerManifest` prefixes the reference ID in [`packages/plugin-rsc/src/core/rsc.ts:100`](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/core/rsc.ts#L100). The loader recognizes that prefix and constructs an opaque reference without loading the implementation. Such a reference can be reserialized but deliberately cannot be invoked inside the replaying RSC runtime.

PR #1289's E2E specifically tests the no-load property. It proves that default replay imports the implementation immediately while preserved replay delays the import until browser invocation. This validates the optional feature, not its necessity for Vinext.

## Why The Original Rationale Does Not Transfer

Plugin-rsc PR #1253 motivates preservation with a cache layer replaying a framework-owned action that should not need to import through the application bundler manifest.

Vinext's nested cached functions are different:

- Vinext intentionally registers their normalized IDs and exports in plugin-rsc's server-reference metadata.
- The production server-reference manifest must contain them so later action POSTs can resolve.
- Their implementation modules are therefore application-manifest-owned and available to normal replay.
- Preservation cannot replace correct registration because eventual invocation still requires the manifest entry.

Once Vinext performs the registration work required by #1871 and #2156, the premise that replay cannot or should not resolve those modules no longer follows.

## Test Coverage Gap

Vinext's tests establish that transformed references serialize and that action POSTs can resolve and invoke them. They do not establish that preservation is required:

- Development bypasses shared cache replay.
- No Vinext test asserts that referenced implementation modules remain unloaded during replay.
- Repeated action calls demonstrate caching of action results, but do not necessarily prove a cache hit replaying the enclosing component Flight.
- There is no paired test showing that default revival fails while preserved replay succeeds.

The explicit no-module-load assertion exists in plugin-rsc's #1289 E2E because that test is designed to demonstrate preservation itself.

## Recommended Verification

Vinext should test the compatibility path without preservation:

1. Remove `{ preserveServerReferences: true }` from cached Flight decoding.
2. Render and persist a cached Flight value containing a nested cached function.
3. Restart the production server so replay must resolve the reference through the generated manifest rather than reuse an already evaluated module.
4. Trigger a genuine cache hit and verify that the cached UI renders.
5. Invoke the replayed function from the browser and verify cache semantics.

If this fails, the failure should be traced through normalized identity, `serverReferenceMetaMap`, generated manifest contents, or module loading. Preservation should not be used to bypass those failures because Next.js exercises normal revival.

## Implication For Plugin-rsc API Design

Server-reference preservation should remain outside the custom Server Function registration discussion.

The relevant plugin-rsc extension surface is:

- Normalized reference identity.
- Owner-safe metadata registration and cleanup.
- Server registration and client/SSR proxies.
- Development validation and production manifest publication.
- Bound-argument encryption and reference loading.

These allow a userland directive to opt into Server Function semantics. Whether cached Flight resolves or opaquely preserves those references is an independent runtime policy.
