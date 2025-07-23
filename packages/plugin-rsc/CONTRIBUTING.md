# Contributing to @vitejs/plugin-rsc

This guide provides essential tips for contributors working on the RSC plugin.

## Testing

### E2E Test Setup

The e2e testing uses a scalable approach inspired by React Router's integration tests. Tests use Playwright and are located in `e2e/`.

#### Test Fixture Patterns

**1. Using existing examples directly:** See `e2e/starter.test.ts` for examples using `useFixture` with existing example projects.

**2. Creating isolated fixtures:** See `e2e/basic.test.ts` for examples using `setupIsolatedFixture` for tests that need to modify files.

**3. Creating inline fixtures (recommended for new tests):** See `e2e/ssr-thenable.test.ts` for examples using `setupInlineFixture` to create test-specific variations.

The new test structure uses:

- `examples/e2e/temp/` as base directory for test projects
- `setupInlineFixture` utility for creating test environments
- `examples/starter` as the lightweight base template (faster than `examples/basic`)
- Each test project is runnable locally

### Adding New Test Cases

**Option 1: Using `setupInlineFixture` (Recommended)**
Best for testing specific features or edge cases. See `e2e/ssr-thenable.test.ts` for the pattern.

**Option 2: Expanding `examples/basic`**
Best for comprehensive features that should be part of the main test suite:

1. Add your test case files to `examples/basic/src/routes/`
2. Update the routing in `examples/basic/src/routes/root.tsx`
3. Add corresponding tests in `e2e/basic.test.ts`

### Running Tests

```bash
# Run all e2e tests
pnpm -C packages/plugin-rsc test-e2e

# Run specific test file
pnpm -C packages/plugin-rsc test-e2e basic

# Run with filter/grep
pnpm -C packages/plugin-rsc test-e2e -g "hmr"

# Run with UI (convenient for development)
pnpm -C packages/plugin-rsc test-e2e --ui

# Run with debug output
TEST_DEBUG=1 pnpm -C packages/plugin-rsc test-e2e

# Skip build step (faster during development)
TEST_SKIP_BUILD=1 pnpm -C packages/plugin-rsc test-e2e
```

## Development Workflow

### Local Development

1. Make changes to plugin source code in `src/`
2. Test changes using existing examples:
   ```bash
   # From repo root
   pnpm -C packages/plugin-rsc dev
   # Or from plugin directory
   cd packages/plugin-rsc && pnpm dev
   ```
3. Run e2e tests to ensure no regressions
4. Add new tests for new features using `setupInlineFixture`

### Test Project Debugging

Test projects created with `setupInlineFixture` are locally runnable:

```bash
pnpm -C packages/plugin-rsc/examples/e2e/temp/my-test dev
```

## Tips

- Study existing test patterns in `e2e/` directory
- Prefer `setupInlineFixture` for new tests - it's more maintainable and faster
- Always test both dev and build modes when adding new features
- Use `TEST_DEBUG=1` to see detailed output during test development
- The `examples/basic` project contains comprehensive test scenarios - study it for inspiration
- Dependencies for temp test projects are managed in `examples/e2e/package.json`
