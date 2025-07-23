# Contributing to @vitejs/plugin-rsc

This guide provides essential tips for contributors working on the RSC plugin.

## Project Structure

- `src/` - Plugin source code
- `examples/` - Example projects for testing and documentation
- `e2e/` - End-to-end tests using Playwright
- `types/` - TypeScript type definitions

## Testing

### E2E Test Setup

The e2e testing uses a scalable approach inspired by React Router's integration tests. Tests use Playwright and are located in `e2e/`.

#### Test Fixture Patterns

**1. Using existing examples directly:**

```typescript
// Test against existing example projects
const f = useFixture({ root: 'examples/basic', mode: 'dev' })
```

**2. Creating isolated fixtures (full copy):**

```typescript
// For tests that need to modify files
test.beforeAll(async () => {
  await setupIsolatedFixture({
    src: 'examples/basic',
    dest: 'examples/e2e/temp/my-test',
  })
})
```

**3. Creating inline fixtures (recommended for new tests):**

```typescript
// For creating test-specific variations
test.beforeAll(async () => {
  await setupInlineFixture({
    src: 'examples/starter',
    dest: 'examples/e2e/temp/my-test',
    files: {
      'src/root.tsx': /* tsx */ `
        export function Root() {
          return <div>Custom test content</div>
        }
      `,
      'src/client.tsx': /* tsx */ `
        "use client";
        export function MyComponent() {
          return <span>Client component</span>
        }
      `,
    },
  })
})
```

The new test structure uses:

- `examples/e2e/temp/` as base directory for test projects
- `setupInlineFixture` utility for creating test environments
- `examples/starter` as the lightweight base template (faster than `examples/basic`)
- Each test project is runnable locally: `pnpm -C packages/plugin-rsc/examples/e2e/temp/my-test dev`

### Adding New Test Cases

#### Option 1: Using `setupInlineFixture` (Recommended)

Best for testing specific features or edge cases:

```typescript
import { setupInlineFixture, useFixture } from './fixture'

test.describe('my-feature', () => {
  const root = 'examples/e2e/temp/my-feature'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter', // Base template
      dest: root,
      files: {
        // Override/add specific files for your test
        'vite.config.ts': /* js */ `
          import rsc from '@vitejs/plugin-rsc'
          export default {
            plugins: [rsc({ /* test options */ })]
          }
        `,
        'src/test-component.tsx': /* tsx */ `
          "use client";
          export function TestComponent() {
            return <div data-testid="test">Hello</div>
          }
        `,
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    // Your tests here
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    // Your tests here
  })
})
```

#### Option 2: Expanding `examples/basic`

Best for comprehensive features that should be part of the main test suite:

1. Add your test case files to `examples/basic/src/routes/`
2. Update the routing in `examples/basic/src/routes/root.tsx`
3. Add corresponding tests in `e2e/basic.test.ts`

### Test Utilities

Key helper functions available in `e2e/helper.ts`:

- `waitForHydration(page)` - Wait for React hydration to complete
- `expectNoReload(page)` - Ensure no page reload during operations
- `expectNoPageError(page)` - Assert no JavaScript errors
- `testNoJs` - Test variant with JavaScript disabled

### Running Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e basic

# Run with debug output
TEST_DEBUG=1 pnpm test:e2e

# Skip build step (faster during development)
TEST_SKIP_BUILD=1 pnpm test:e2e
```

## Development Workflow

### Local Development

1. Make changes to plugin source code in `src/`
2. Test changes using existing examples:
   ```bash
   cd examples/starter
   pnpm dev
   ```
3. Run e2e tests to ensure no regressions
4. Add new tests for new features using `setupInlineFixture`

### Plugin Configuration Testing

When testing plugin options, create focused inline fixtures:

```typescript
await setupInlineFixture({
  src: 'examples/starter',
  dest: root,
  files: {
    'vite.config.ts': /* js */ `
      import rsc from '@vitejs/plugin-rsc'
      export default {
        plugins: [
          rsc({
            // Test specific plugin options here
            loadModuleDevProxy: true,
            rscCssTransform: { filter: id => id.includes('test') }
          })
        ]
      }
    `,
  },
})
```

### CSS and Style Testing

CSS handling is a key feature. Test CSS injection patterns:

```typescript
files: {
  'src/styles.css': /* css */ `
    .test-class { color: red; }
  `,
  'src/component.tsx': /* tsx */ `
    import './styles.css'
    export function Component() {
      return <div className="test-class">Styled</div>
    }
  `
}
```

## Common Testing Patterns

### Server Actions Testing

```typescript
files: {
  'src/actions.tsx': /* tsx */ `
    "use server";
    export async function myAction(formData: FormData) {
      return { success: true }
    }
  `,
  'src/form.tsx': /* tsx */ `
    import { myAction } from './actions'
    export function Form() {
      return <form action={myAction}>...</form>
    }
  `
}
```

### HMR Testing

Use the `expectNoReload` pattern and file editors:

```typescript
test('hmr works', async ({ page }) => {
  using _ = await expectNoReload(page)
  const editor = f.createEditor('src/component.tsx')

  await page.goto(f.url())
  editor.edit((content) => content.replace('Hello', 'Hi'))

  await expect(page.locator('[data-testid="greeting"]')).toHaveText('Hi')
})
```

## Tips

- Use `/* tsx */` and `/* css */` comments for syntax highlighting in template literals
- Prefer `setupInlineFixture` for new tests - it's more maintainable and faster
- Always test both dev and build modes when adding new features
- Use `TEST_DEBUG=1` to see detailed output during test development
- Test projects are locally runnable for debugging: `pnpm -C packages/plugin-rsc/examples/e2e/temp/my-test dev`
- The `examples/basic` project contains comprehensive test scenarios - study it for inspiration
- Dependencies for temp test projects are managed in `examples/e2e/package.json`
