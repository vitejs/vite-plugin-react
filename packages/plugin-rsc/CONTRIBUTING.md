# Contributing to @vitejs/plugin-rsc

This guide provides essential tips for contributors working on the RSC plugin.

## Testing

### E2E Test Setup

Tests use Playwright and are located in `e2e/` and uses `examples` as test app.

#### Test Fixture Patterns

- `examples/basic` as the comprehensive test suite for the RSC plugin
- `examples/starter` as the lightweight base template for writing more targeted tests using `setupInlineFixture` utility
- `examples/e2e/temp/` as base directory for test projects

### Adding New Test Cases

**Expanding `examples/basic` (for comprehensive features)**
Best for features that should be part of the main test suite. `examples/basic` is mainly used for e2e testing:

1. Add your test case files to `examples/basic/src/routes/`
2. Update the routing in `examples/basic/src/routes/root.tsx`
3. Add corresponding tests in `e2e/basic.test.ts`

**Using `setupInlineFixture` (for specific edge cases)**
Best for testing specific edge cases or isolated features. See `e2e/ssr-thenable.test.ts` for the pattern.

<!-- TODO: mention unit test -->

## Development Workflow

<!-- TODO: mention playwright vscode extension? -->

```bash
# Build packages
pnpm dev # pnpm -C packages/plugin-rsc dev

# Run examples
pnpm -C packages/plugin-rsc/examples/basic dev # build / preview
pnpm -C packages/plugin-rsc/examples/starter dev # build / preview

# Run all e2e tests
pnpm -C packages/plugin-rsc test-e2e

# Run with UI (this allows filtering interactively)
pnpm -C packages/plugin-rsc test-e2e --ui

# Run specific test file
pnpm -C packages/plugin-rsc test-e2e basic

# Run with filter/grep
pnpm -C packages/plugin-rsc test-e2e -g "hmr"

# Test projects created with `setupInlineFixture` are locally runnable. For example:
pnpm -C packages/plugin-rsc/examples/e2e/temp/react-compiler dev
```

## Tips

- Prefer `setupInlineFixture` for new tests - it's more maintainable and faster
- The `examples/basic` project contains comprehensive test scenarios
- Dependencies for temp test projects are managed in `examples/e2e/package.json`
