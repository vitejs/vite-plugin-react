# GitHub Copilot Instructions for Vite Plugin React

This workspace contains multiple Vite plugins for React:

## Package Structure

- `packages/plugin-react/` - Babel-based React plugin
- `packages/plugin-react-swc/` - SWC-based React plugin
- `packages/plugin-react-oxc/` - Oxc-based React plugin
- `packages/plugin-rsc/` - React Server Components plugin

## Key Conventions

- Use TypeScript with strict typing
- Follow existing patterns in each package
- Write tests for new features using Vitest + Playwright
- Use pnpm for package management
- Follow semantic commit conventions

## Development Patterns

- Plugin exports should follow Vite plugin conventions
- Options interfaces should be well-typed
- Error handling should be consistent across packages
- Tests should cover both serve and build modes

## Common Code Patterns

```typescript
// Plugin definition pattern
export interface PluginOptions {
  // options interface
}

export function pluginName(options: PluginOptions = {}): Plugin {
  return {
    name: 'vite:plugin-name',
    // plugin implementation
  }
}
```

When suggesting code, prioritize:

1. Type safety and proper TypeScript usage
2. Consistency with existing code patterns
3. Performance considerations for build tools
4. Proper error handling and edge cases
5. Test coverage for new functionality
