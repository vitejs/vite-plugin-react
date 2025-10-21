# browser-mode2

Hybrid RSC example that combines:

- The `rsc` environment from [examples/no-ssr](../no-ssr) (simple RSC setup with `entry.rsc.tsx`)
- The module runner approach from [examples/browser-mode](../browser-mode) (runs RSC on browser via module runner)

This example demonstrates how to run React Server Components entirely in the browser using Vite's module runner API, without requiring a Node.js server environment. The RSC rendering logic that would normally run on the server is executed in the browser through the module runner.

## Key Features

- **No Node.js server required**: The RSC environment runs in the browser
- **Module Runner**: Uses Vite's module runner to load and execute the RSC environment in the browser
- **HMR Support**: Hot module replacement for both client and RSC code
- **Server Actions**: Full support for server actions, executed in the browser context

## How it works

1. The main entry point (`src/framework/main.tsx`) loads both the RSC and client environments
2. In dev mode, the RSC environment is loaded via module runner (`load-rsc-dev.tsx`)
3. The client environment consumes the RSC output through the standard RSC protocol
4. Server actions are handled by the RSC environment running in the browser

## Architecture

```
Browser Context
├── Client Environment (src/framework/entry.browser.tsx)
│   ├── React Client Components ('use client')
│   └── RSC Consumer (renders server components)
└── RSC Environment (via Module Runner)
    ├── Server Components (src/framework/entry.rsc.tsx)
    └── Server Actions (src/action.tsx)
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
```
