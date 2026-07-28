# Support Framework-Owned `"use cache"` Server Functions

## Feature request

Provide the plugin-rsc infrastructure needed for a framework-owned directive such as `"use cache"` to produce React Server Functions with Next.js-compatible callable and transport behavior, without teaching plugin-rsc the cache implementation details.

## Architecture Boundary

plugin-rsc should own reusable Server Function infrastructure:

- Owner- and environment-scoped server-reference claims (unless proven impossibility of directive composition [#1315](https://github.com/vitejs/vite-plugin-react/pull/1315))
- Module and inline directive transform primitives.
- Closure variable capture encoding/decoding transport.
- Browser and SSR proxy generation.
- Development resolution and production manifest publication.

The framework integration should own `"use cache"` semantics:

- Directive spelling and cache kind selection.
- Cache function wrapper construction and implementation
- Whether a cached callable participates in Server Function transport.

The feature is therefore not a request to hardcode `"use cache"` into plugin-rsc (yet). It is a request to make the proven Server Function extension path sufficient and maintainable for a framework to implement it.

## Work plan

Each work item should include its own development and production E2E that demonstrates the next level of the integration, as PR #1310 and PR #1330 do.

| Work item                                                  | Tracking                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Owner-aware server-reference claims and canonical identity | [PR #1310](https://github.com/vitejs/vite-plugin-react/pull/1310)              |
| Canonical module-level wrapper for inline directives       | [PR #1330](https://github.com/vitejs/vite-plugin-react/pull/1330)              |
| Cache-relevant transform metadata                          | [PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246)              |
| Mixed module/inline directive ownership                    | Follow-up to [PR #1315](https://github.com/vitejs/vite-plugin-react/pull/1315) |
| Higher-level Server Function helper                        | Follow-up derived from the completed integration                               |

### Owner-aware server-reference claims and canonical identity

Allow independent plugins and Vite environments to contribute server-reference exports without replacing each other's metadata. plugin-rsc owns canonical development and production module identity, aggregates claims, detects conflicting export ownership, and publishes the resulting development loader and production manifest entries.

PR #1310 demonstrates this level with a custom Server Function directive that registers and resolves references through the public claim API in development and production.

### Canonical module-level wrapper for inline directives

Allow an inline directive transform to make its runtime result, rather than the private hoisted implementation, the canonical generated module binding. The wrapper is created once, exported and registered as the reference target, and used as the base for closure capture binding at the original lexical site.

PR #1330 demonstrates this level with a callable inline cache wrapper whose invocation cannot bypass the wrapper when the generated reference is resolved in development or production.

### Cache-relevant transform metadata

Expose the information a cache wrapper cannot recover reliably from the final function object, including source parameter admission and the boundary between a protected capture payload and ordinary invocation arguments. Generated identity should have an explicit stability contract suitable for exported inline wrappers.

This work should be narrowed from PR #1246. General inline-directive syntax coverage and validation belong in separate work unless a specific case is required to demonstrate `"use cache"` integration. The E2E for this level should prove that decoded captures and admitted invocation arguments participate in cache keys while undeclared extra arguments are excluded for fixed signatures.

### Mixed module/inline directive ownership

Classify module-level defaults and function-level overrides before generating wrappers, proxies, and claims. Independent `"use server"` and `"use cache"` transforms cannot reliably compose by plugin order because both can claim or rewrite the same exported callable.

The follow-up to PR #1315 should demonstrate both module-level `"use server"` with an inline `"use cache"` override and module-level `"use cache"` with an inline `"use server"` override in development and production.

### Higher-level Server Function helper

After the framework-owned cache integration works end to end, extract repeated environment branching, proxy generation, capture encryption wiring, and claim cleanup into a shared helper. The API should be derived from the working built-in and custom integrations rather than designed before their common lifecycle is proven.

This refactor should retain the existing built-in and custom integration E2Es so the helper demonstrates reuse without expanding plugin-rsc into cache policy.
