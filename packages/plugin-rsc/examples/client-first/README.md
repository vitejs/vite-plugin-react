# Client-first RSC

This example sketches the minimum framework machinery for rendering an RSC value inside a client-owned page. The page reads a cached RSC-function promise with React `use` while retaining ordinary client state.

The framework pieces are intentionally direct:

- `routes/page.tsx` co-locates the page and RSC-function handler.
- `runtime.tsx` creates a callable RSC-function stub and caches its promise for Suspense.
- `entry.rsc.tsx` executes RSC functions and encodes their results as Flight streams.
- `entry.ssr.tsx` configures an in-process RSC caller before rendering HTML.
- `entry.browser.tsx` configures an HTTP RSC caller before hydrating the same page.

For now, `entry.rsc.tsx` imports the co-located handler explicitly. A later module-splitting transform should replace that bridge by moving the handler into the RSC graph while leaving only its caller stub in the SSR and browser graphs.

There is deliberately no SSR-to-browser data handoff yet. SSR and the browser each execute the RSC function independently, which keeps serialization transport separate from the core client-first model.

This example is based on [hi-ogawa/experiments: tanstack-start-rsc](https://github.com/hi-ogawa/experiments/tree/main/tanstack-start-rsc), especially its RSC serialization runtimes and route-level `use` pattern.
