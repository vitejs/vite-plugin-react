# Partial prerendering example

This example demonstrates:

- RSC static prerendering through `@vitejs/plugin-rsc/rsc/static`
- A build-time HTML shell with a dynamic Suspense boundary
- Request-time `react-dom` resume with fresh Flight data
- Browser hydration and client-side RSC navigation

The timer-bounded dynamic boundary is deliberately minimal. Production
frameworks such as Next.js and vinext use warmup passes and tracked cache work
before cutting off their final prerender.

## Usage

```sh
pnpm dev
pnpm build
pnpm preview
```
