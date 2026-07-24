# Contributing to @vitejs/plugin-rsc

This guide provides essential tips for contributors working on the RSC plugin.

## Testing

### End-to-End Tests

Tests use Playwright and are located in `e2e/` and use `examples` as test apps.

Avoid reducing plugin or runtime behavior to mocked unit tests. Craft E2E coverage that clearly demonstrates the relevant RSC bundler semantics.

#### Choosing a Test Fixture

**Adding a dedicated example**

Prefer a runnable app under `examples/<feature>` for substantial end-to-end behavior. Add a corresponding thin test under `e2e/` and cover both development and production build modes when applicable.

**Expanding `examples/basic`**

Use `examples/basic`, which contains comprehensive test scenarios, when the case is a small extension of the existing application and does not require distinct configuration or framework behavior:

1. Add the test case files to `examples/basic/src/routes/`.
2. Update the routing in `examples/basic/src/routes/root.tsx`.
3. Add corresponding tests in `e2e/basic.test.ts`.

**Using `setupInlineFixture`**

Use `setupInlineFixture` with `examples/starter` for narrow configuration variants, invalid-input coverage, and cases where a standalone runnable example would add mostly boilerplate. Test projects are written under `examples/e2e/temp/`, with dependencies managed in `examples/e2e/package.json`. See `e2e/ssr-thenable.test.ts` for the pattern.

### Unit Tests

Use colocated unit tests for self-contained transforms and utilities.

## Development Workflow

```bash
# Build packages
pnpm dev # pnpm -C packages/plugin-rsc dev

# Type check
pnpm -C packages/plugin-rsc tsc-dev

# Run unit tests
pnpm -C packages/plugin-rsc test --run

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
