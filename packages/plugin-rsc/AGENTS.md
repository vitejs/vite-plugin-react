# AI Agent Guide for @vitejs/plugin-rsc

This document provides AI-agent-specific guidance for the React Server Components (RSC) plugin. For comprehensive documentation, see:

- **[README.md](README.md)** - Plugin overview, concepts, and examples
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and testing guidelines

## Quick Reference for AI Agents

### Key Plugin Concepts

The RSC plugin creates three environments (see [README.md Basic Concepts](README.md#basic-concepts) for diagrams):

- **rsc** - Server component rendering
- **ssr** - Server-side rendering
- **client** - Browser hydration

### Essential Commands

```bash
pnpm -C packages/plugin-rsc dev       # Watch mode development
pnpm -C packages/plugin-rsc test-e2e  # Run e2e tests
pnpm -C packages/plugin-rsc test-e2e basic  # Test specific example
```

### AI-Specific Development Tips

#### Making RSC Changes

1. **Start with `examples/starter/`** - Best learning resource for understanding RSC flows
2. **Use `examples/basic/` for testing** - Comprehensive test suite with routing
3. **Test across all environments** - Verify rsc, ssr, and client functionality
4. **Check virtual modules** - Important for RSC manifest and reference handling

#### Testing Patterns

- **examples/basic** - Add test cases to `src/routes/`, update routing, add tests to `e2e/basic.test.ts`
- **setupInlineFixture** - For isolated edge cases (see `e2e/ssr-thenable.test.ts` pattern)

#### Important File Locations

- `src/plugin.ts` - Main plugin implementation
- `src/environment/` - Environment-specific logic
- `rsc/`, `ssr/`, `browser/` - Runtime APIs
- `examples/` - Test applications and learning resources

### Debugging RSC Issues

1. Use `examples/starter` for basic reproduction
2. Check environment builds in `.vite/` directory
3. Examine RSC streams and client/server manifests
4. Verify HMR behavior across environments

For detailed setup, testing procedures, and architectural deep-dives, refer to the comprehensive documentation in [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
