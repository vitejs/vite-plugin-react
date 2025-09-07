# AI Agent Guide for @vitejs/plugin-rsc

This document provides specific guidance for AI agents working with the React Server Components (RSC) plugin.

## Overview

The `@vitejs/plugin-rsc` provides React Server Components support for Vite. It's built on the Vite environment API and enables:

- Framework-agnostic RSC bundler features
- HMR support for both client and server components
- CSS code-splitting and injection
- Runtime-agnostic builds (works with various deployment targets)

## Key Concepts

### Environments

The plugin creates three distinct environments:

1. **rsc** - React server components rendering
2. **ssr** - Server-side rendering environment
3. **client** - Browser environment for hydration

### Architecture

```
RSC Component → RSC Stream → SSR/Client Consumption → DOM/HTML
```

See [Basic Concepts](README.md#basic-concepts) in the README for detailed flow diagrams.

## Development Workflow

### Setup

```bash
# Build the plugin
pnpm -C packages/plugin-rsc dev

# Type checking
pnpm -C packages/plugin-rsc tsc-dev
```

### Testing

```bash
# Run all e2e tests
pnpm -C packages/plugin-rsc test-e2e

# Run with UI (interactive filtering)
pnpm -C packages/plugin-rsc test-e2e --ui

# Run specific test file
pnpm -C packages/plugin-rsc test-e2e basic

# Run with grep filter
pnpm -C packages/plugin-rsc test-e2e -g "hmr"
```

### Examples

- `examples/starter/` - **Start here** - Comprehensive learning resource
- `examples/basic/` - Advanced features and main e2e test suite
- `examples/ssg/` - Static site generation example
- `examples/react-router/` - React Router integration

## Important Files

### Core Plugin Files

- `src/plugin.ts` - Main plugin implementation
- `src/environment/` - Environment-specific logic
- `src/types/` - TypeScript definitions
- `types/` - External type definitions

### Runtime APIs

- `rsc/` - Server component runtime
- `ssr/` - SSR runtime
- `browser/` - Client runtime
- `vendor/` - Vendored react-server-dom

### Configuration

- `vite.config.ts` - Development configuration
- `tsdown.config.ts` - Build configuration
- `playwright.config.ts` - E2E test configuration

## Testing Patterns

### Test Fixture Patterns

1. **examples/basic** - Comprehensive test suite
   - Add test cases to `src/routes/`
   - Update routing in `src/routes/root.tsx`
   - Add tests to `e2e/basic.test.ts`

2. **setupInlineFixture** - Isolated edge case testing
   - Best for specific scenarios
   - See `e2e/ssr-thenable.test.ts` for pattern
   - Dependencies managed in `examples/e2e/package.json`

### Adding Tests

```bash
# Create new test project (automatically runnable)
pnpm -C packages/plugin-rsc/examples/e2e/temp/my-test dev
```

## Common Development Tasks

### Adding New RSC Features

1. Understand the React Server Components specification
2. Check existing implementation in `src/environment/`
3. Add runtime support in appropriate environment
4. Update type definitions
5. Add comprehensive tests
6. Update documentation

### Debugging Issues

1. Use `examples/starter` for basic reproduction
2. Check environment-specific builds in `.vite/`
3. Examine RSC streams and manifests
4. Test across all three environments
5. Verify HMR behavior

### Performance Optimization

1. Analyze bundle outputs with metadata plugins
2. Check CSS code-splitting effectiveness
3. Monitor RSC payload sizes
4. Test streaming performance

## Key Plugin APIs

### Virtual Modules

- `virtual:vite-rsc/assets-manifest`
- `virtual:vite-rsc/client-references`
- `virtual:vite-rsc/server-references`
- `virtual:vite-rsc/encryption-key`

### Environment Helper API

- `import.meta.viteRsc.loadCss()` - CSS loading
- `?vite-rsc-css-export=<name>` - CSS exports

### Runtime Modules

- `@vitejs/plugin-rsc/rsc` - Server component rendering
- `@vitejs/plugin-rsc/ssr` - SSR utilities
- `@vitejs/plugin-rsc/browser` - Client-side RSC

## Best Practices

1. **Use setupInlineFixture for new tests** - More maintainable and faster
2. **Follow existing patterns** - Check `examples/basic` for comprehensive examples
3. **Test across environments** - Ensure functionality works in rsc, ssr, and client
4. **Maintain backward compatibility** - RSC ecosystem is evolving rapidly
5. **Document breaking changes** - Update CHANGELOG.md appropriately

## Troubleshooting

### Common Issues

1. **Module resolution errors** - Check `optimizeDeps.include` configuration
2. **CSS not loading** - Verify `loadCss()` usage and environment setup
3. **HMR not working** - Check component boundaries and environment isolation
4. **Build failures** - Verify environment-specific configurations

### Debugging Tools

- Vite's built-in inspect plugin
- Browser DevTools for client environment
- Server logs for rsc/ssr environments
- Playwright test inspector for e2e tests

For more detailed contributing guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
