# Vite + RSC starter-extra

This fixture starts as a copy of [`examples/starter`](../starter) and is reserved for focused e2e scenarios that should not make the public starter demo harder to read.

Use this when a scenario needs a small starter-like app but requires extra test-only routes, components, styles, or deployment variants.

```sh
# run dev server
npm run dev

# build for production and preview
npm run build
npm run preview
```

## Scope

Keep [`examples/starter`](../starter) as the minimal public demo.

Use this fixture for medium-sized regression coverage before reaching for [`examples/basic`](../basic), which is the full integration matrix.

Good candidates:

- starter-like option variants
- visible CSS HMR edge cases
- small deployment/config variants such as Cloudflare single-worker mode
- scenarios where the test should prove the fixture shape from rendered UI
