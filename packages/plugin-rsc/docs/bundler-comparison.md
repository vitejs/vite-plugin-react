# RSC Bundler Architecture Comparison

How different bundlers/frameworks handle the architectural complexity of React Server Components.

## The Core Challenge

RSC requires discovering two types of references at build time:

1. **Client references** (`"use client"`) - components that run on the client
2. **Server references** (`"use server"`) - functions callable from client

The challenge: server references are often **imported by client components**, creating a dependency:

```
Server components → discover client boundaries → client components → discover server references
```

## Architectural Approaches

### 1. Multi-Graph / Multi-Pass (Vite RSC Plugin)

**Approach**: Separate module graphs per environment, sequential scan phases.

```
RSC scan → SSR scan → RSC build → Client build → SSR build
```

**How it works**:

- Each environment (rsc, ssr, client) has its own module graph
- RSC scan populates `clientReferenceMetaMap`
- SSR scan reads this via `virtual:vite-rsc/client-references` to discover server references
- Sequential dependency prevents parallelization

**Trade-offs**:

- Clean separation of concerns
- Works with existing Vite environment API
- Multiple Rollup orchestration cycles
- Cannot parallelize scan phases (architectural dependency)

### 2. Unified Graph with Transitions (Turbopack/Next.js)

**Approach**: Single compiler with environment "transitions" at module boundaries.

**How it works**:

> "We can mark an import as a transition from server to browser or from browser to server. This is what allows Turbopack to efficiently bundle Server Components and Client Components, as well as Server Functions imported from Client Components."

- Single unified graph for all environments
- `"use client"` creates a transition point, not a separate graph
- No separate scan phase needed - references discovered during single traversal

**Trade-offs**:

- Single compilation pass
- No coordination between compiler processes
- Better debugging (single source of truth)
- Requires bundler-level architecture changes (Rust rewrite)

**Source**: [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)

### 3. Unified Graph with Environments (Parcel)

**Approach**: Single module graph spanning environments, environment property per module.

**How it works**:

> "Unlike most other bundlers, Parcel has a single unified module graph spanning across environments rather than splitting each environment into a separate build. This enables code splitting to span environments too."

- Each module has an associated environment (server, react-client, etc.)
- `"use client"` transforms imports to Client References at boundary
- Single compilation discovers all references

**Trade-offs**:

- Single compilation pass
- Cross-environment code splitting
- Environment-aware from v2 (2021)
- Different mental model than traditional bundlers

**Source**: [How Parcel bundles React Server Components](https://devongovett.me/blog/parcel-rsc.html)

### 4. Plugin-Based Discovery (Webpack)

**Approach**: Webpack plugin generates client manifest during standard compilation.

**How it works**:

- `react-server-dom-webpack/plugin` scans for `"use client"` directives
- Generates `react-client-manifest.json` with module IDs, chunks, exports
- Server uses manifest to create Client References
- Client uses manifest to load chunks on demand

**Trade-offs**:

- Integrates with existing Webpack ecosystem
- Leverages Webpack's chunk loading runtime
- Requires framework-level orchestration (Next.js handles multi-environment)

**Source**: [react-server-dom-webpack](https://www.npmjs.com/package/react-server-dom-webpack)

### 5. Layers (Rspack)

**Approach**: Using "layers" feature to implement RSC in a Webpack-compatible way.

**How it works**:

- Rspack 1.0.0-beta.1 introduced "layers" support
- Layers allow frameworks to implement RSC environment separation
- Built-in RSC support on roadmap, inspired by Parcel

**Status**: In development, not yet fully built-in.

**Source**: [Rspack Roadmap](https://rspack.rs/misc/planning/roadmap)

## Key Architectural Insight

### Why Unified Graph Avoids Multi-Pass

In a **multi-graph** approach (Vite):

```
Graph 1 (RSC): server.tsx → client.tsx (stops at boundary)
Graph 2 (SSR): needs to know about client.tsx → action.tsx

Problem: Graph 2 can't start until Graph 1 identifies boundaries
Solution: Sequential scan phases
```

In a **unified graph** approach (Parcel/Turbopack):

```
Single Graph: server.tsx → client.tsx[transition] → action.tsx

All modules in one graph with environment transitions at boundaries
No sequential dependency - discovered in single traversal
```

The unified approach treats `"use client"` as a **transition annotation** rather than a **graph boundary**.

## Comparison Table

| Bundler   | Graph Model            | Passes              | Parallelizable         | Complexity   |
| --------- | ---------------------- | ------------------- | ---------------------- | ------------ |
| Vite RSC  | Multi-graph            | 5 (with SSR)        | No (architectural dep) | Medium       |
| Turbopack | Unified + transitions  | 1                   | N/A (single pass)      | High (Rust)  |
| Parcel    | Unified + environments | 1                   | N/A (single pass)      | Medium       |
| Webpack   | Plugin-based           | Framework-dependent | Framework-dependent    | Low (plugin) |
| Rspack    | Layers (WIP)           | TBD                 | TBD                    | Medium       |

## Implications for Vite RSC Plugin

The multi-pass approach is a consequence of Vite's environment API design, where each environment has its own module graph. This is fundamentally different from Parcel/Turbopack's unified graph.

**Potential future optimizations**:

1. **Cache scan results** - Skip scan phases on incremental builds if references unchanged
2. **Skip SSR scan** - For apps without `"use server"` (rare, ~12% of apps)
3. **Vite architecture evolution** - If Vite adopts unified graph concepts, could enable single-pass

**Not possible without architectural changes**:

- Parallel scan phases (SSR scan depends on RSC scan output)
- Single-pass compilation (requires unified graph)

## References

- [Why Does RSC Integrate with a Bundler?](https://overreacted.io/why-does-rsc-integrate-with-a-bundler/) - Dan Abramov
- [How Parcel bundles React Server Components](https://devongovett.me/blog/parcel-rsc.html) - Devon Govett
- [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack) - Next.js
- [Parcel RSC Recipe](https://parceljs.org/recipes/rsc/) - Parcel
- [react-server-dom-webpack](https://www.npmjs.com/package/react-server-dom-webpack) - React
- [Waku Migration to @vitejs/plugin-rsc](https://waku.gg/blog/migration-to-vite-plugin-rsc) - Waku
