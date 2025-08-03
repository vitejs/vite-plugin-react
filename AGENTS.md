# AI Agents and Development Assistance

This guide provides best practices for using AI-powered development tools, particularly GitHub Copilot, when contributing to the Vite Plugin React project.

## Overview

AI development tools can significantly enhance productivity when working with this codebase. This document outlines how to effectively use these tools while maintaining code quality and following project conventions.

## GitHub Copilot Setup

### Prerequisites

1. **GitHub Copilot subscription**: Ensure you have access to GitHub Copilot through your GitHub account
2. **IDE/Editor support**: Install the Copilot extension for your preferred editor:
   - [VS Code](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
   - [JetBrains IDEs](https://plugins.jetbrains.com/plugin/17718-github-copilot)
   - [Neovim](https://github.com/github/copilot.vim)

### Project-Specific Configuration

When working with this repository, configure your AI assistant with the following context:

#### Codebase Structure

- **Monorepo**: Multiple packages under `packages/` directory
- **Package Manager**: pnpm with workspaces
- **Main Packages**:
  - `@vitejs/plugin-react`: Babel-based React support
  - `@vitejs/plugin-react-swc`: SWC-based React support
  - `@vitejs/plugin-react-oxc`: Oxc-based React support
  - `@vitejs/plugin-rsc`: React Server Components support

#### Technology Stack

- **Language**: TypeScript
- **Build Tool**: tsdown (rolldown-based)
- **Testing**: Vitest + Playwright for E2E
- **Linting**: ESLint with TypeScript
- **Formatting**: Prettier

## Best Practices for AI-Assisted Development

### 1. Understanding the Context

Before accepting AI suggestions, ensure you understand:

- Which package you're working in (`plugin-react`, `plugin-react-swc`, etc.)
- The specific use case being addressed
- How the change fits into the overall architecture

### 2. Code Quality Guidelines

#### TypeScript Usage

- Leverage AI for type inference and completion
- Always verify generated types are accurate and follow project conventions
- Use strict TypeScript settings as defined in the project's `tsconfig.json`

```typescript
// Good: AI-generated code with proper typing
export interface PluginOptions {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  jsxImportSource?: string
}

// Verify AI suggestions match existing patterns
export function createPlugin(options: PluginOptions = {}): Plugin {
  // Implementation
}
```

#### Testing Patterns

- Use AI to generate test cases based on existing patterns in `__tests__` directories
- Follow the established Vitest + Playwright conventions
- Ensure tests cover both serve and build modes

```typescript
// Example: AI can help generate tests following project patterns
test('should transform JSX correctly', async () => {
  const { page } = await createTestEnvironment()
  await page.goto('/test-page')
  expect(await page.textContent('.test-component')).toBe('Expected output')
})
```

### 3. Documentation and Comments

- Use AI to help generate JSDoc comments that follow project style
- Ensure generated documentation is accurate and helpful
- Update README files when adding new features

```typescript
/**
 * Creates a Vite plugin for React support with the specified options
 * @param options - Configuration options for the plugin
 * @returns A Vite plugin instance
 */
export function react(options: PluginOptions = {}): Plugin
```

### 4. Error Handling

- Review AI-generated error handling to ensure it follows project patterns
- Verify error messages are helpful and consistent with existing code
- Ensure proper error propagation in plugin contexts

## Working with Different Packages

### @vitejs/plugin-react

- Focus on Babel transformations and React Fast Refresh
- Understand the relationship with `@babel/core` and React
- Pay attention to JSX transformation options

### @vitejs/plugin-react-swc

- Work with SWC-specific configurations
- Understand performance implications of SWC vs Babel
- Test both development and production builds

### @vitejs/plugin-react-oxc

- Newer package using Oxc for transformations
- Follow emerging patterns and conventions
- Ensure compatibility with existing React patterns

### @vitejs/plugin-rsc

- Complex package dealing with React Server Components
- Understand server/client boundaries
- Pay attention to serialization and hydration concerns

## AI-Assisted Debugging

### Using Copilot for Troubleshooting

1. **Error Analysis**: Paste error messages and let AI suggest solutions
2. **Code Review**: Ask AI to review your changes for potential issues
3. **Pattern Matching**: Use AI to find similar patterns in the codebase

### Common Scenarios

```typescript
// AI can help identify why a transform isn't working
if (id.includes('node_modules') && !options.include?.test?.(id)) {
  return null // AI might suggest this check
}
```

## Validation and Quality Assurance

### Before Committing AI-Generated Code

1. **Run Tests**: Always run the full test suite

   ```bash
   pnpm test
   ```

2. **Lint and Format**: Ensure code passes all checks

   ```bash
   pnpm run lint
   pnpm run format
   ```

3. **Build Verification**: Verify all packages build successfully

   ```bash
   pnpm run build
   ```

4. **Manual Testing**: Test your changes in the playground environments

### Code Review Considerations

- Mark AI-generated code in PR descriptions when significant
- Explain the reasoning behind AI suggestions you've accepted
- Be prepared to discuss and modify AI-generated solutions

## Limitations and Cautions

### When to Override AI Suggestions

- **Security Concerns**: Always review security-related code manually
- **Performance Critical Code**: Verify performance implications
- **Plugin Architecture**: Ensure AI understands Vite's plugin system
- **Breaking Changes**: Be cautious with changes that might affect backwards compatibility

### Common AI Pitfalls

1. **Outdated Patterns**: AI might suggest older React patterns
2. **Plugin System Misunderstanding**: Verify AI understands Vite's plugin lifecycle
3. **Monorepo Context**: Ensure AI considers the correct package context
4. **Test Environment**: Verify AI understands the Playwright + Vitest setup

## Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Vite Plugin Development Guide](https://vite.dev/guide/api-plugin.html)
- [React Documentation](https://react.dev)
- [Contributing Guidelines](./CONTRIBUTING.md)

## Getting Help

If you encounter issues with AI-assisted development:

1. Check existing issues and discussions
2. Review the [Contributing Guide](./CONTRIBUTING.md)
3. Ask questions in the [Vite Discord](https://chat.vite.dev)
4. Open an issue if you discover AI-related development problems

---

Remember: AI tools are powerful assistants, but human judgment and understanding of the project's goals and constraints remain essential for high-quality contributions.
