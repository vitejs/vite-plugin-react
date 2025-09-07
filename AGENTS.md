# AI Agent Development Guide

This document provides AI-agent-specific guidance for working with the vite-plugin-react monorepo. For comprehensive documentation, see:

- **[README.md](README.md)** - Repository overview and package links
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Setup, testing, debugging, and contribution guidelines

## Quick Reference for AI Agents

### Repository Navigation

This monorepo contains multiple packages (see [README.md](README.md#packages) for details):

- `packages/plugin-react/` - Main React plugin with Babel
- `packages/plugin-react-swc/` - SWC-based React plugin
- `packages/plugin-rsc/` - React Server Components ([AI guidance](packages/plugin-rsc/AGENTS.md))
- `packages/plugin-react-oxc/` - Deprecated (merged with plugin-react)

### Essential Setup Commands

```bash
pnpm install && pnpm build   # Initial setup (see CONTRIBUTING.md for details)
pnpm dev                     # Watch mode development
pnpm test                    # Run all tests
```

### AI-Specific Workflow Tips

1. **Start with existing documentation** - Always read package-specific READMEs before making changes
2. **Use playground tests** - Each package has `playground/` examples for testing changes
3. **Focus on minimal changes** - Prefer surgical edits over large refactors
4. **Test early and often** - Run `pnpm test` after each logical change
5. **Follow existing patterns** - Study similar implementations in the codebase first

### Common Development Tasks

#### Making Changes to Plugin Logic

1. Read the package README and existing code patterns
2. Use `pnpm dev` for watch mode during development
3. Test changes with relevant playground examples
4. Run tests: `pnpm test-serve` and `pnpm test-build`

#### Debugging Build Issues

1. Check individual package builds with `pnpm --filter ./packages/<name> build`
2. Use playground tests to isolate problems
3. See [CONTRIBUTING.md debugging section](CONTRIBUTING.md#debugging) for detailed guidance

#### Adding Tests

1. Follow patterns in existing `__tests__` directories
2. Use playground integration tests for feature verification
3. See [CONTRIBUTING.md testing section](CONTRIBUTING.md#running-tests) for comprehensive testing guide

For detailed development setup, testing procedures, and contribution guidelines, refer to [CONTRIBUTING.md](CONTRIBUTING.md).
