# AI Agent Development Guide

This document provides guidance for AI agents working with the vite-plugin-react monorepo.

## Repository Structure

This is a monorepo containing multiple Vite React plugins:

```
packages/
├── plugin-react/        # Main React plugin with Babel transformation
├── plugin-react-swc/    # React plugin with SWC transformation
├── plugin-react-oxc/    # Deprecated React plugin (merged with plugin-react)
├── plugin-rsc/          # React Server Components plugin
└── common/              # Shared utilities
```

## Development Workflow

### Prerequisites

- Node.js ^20.19.0 || >=22.12.0
- pnpm (package manager) - version 10.15.0

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development mode (watch builds)
pnpm dev
```

### Key Commands

```bash
# Linting
pnpm lint                # ESLint across all packages
pnpm format              # Prettier formatting

# Type checking
pnpm typecheck           # TypeScript checking

# Testing
pnpm test                # Run all tests
pnpm test-unit           # Unit tests only
pnpm test-serve          # Development server tests
pnpm test-build          # Build tests
```

## Important Files

- `package.json` - Monorepo configuration and scripts
- `pnpm-workspace.yaml` - Workspace configuration
- `eslint.config.js` - ESLint configuration
- `playground/` - Test applications for each plugin

## Plugin-Specific Notes

### @vitejs/plugin-react

- Located in `packages/plugin-react/`
- Uses Babel for transformation
- Primary React plugin for Vite

### @vitejs/plugin-react-swc

- Located in `packages/plugin-react-swc/`
- Uses SWC for faster transformation
- Alternative to Babel-based plugin

### @vitejs/plugin-rsc

- Located in `packages/plugin-rsc/`
- Experimental React Server Components support
- See [packages/plugin-rsc/AGENTS.md](packages/plugin-rsc/AGENTS.md) for detailed guidance

## Testing Guidelines

Each package has its own test suite. The playground directory contains integration tests that verify plugin functionality in realistic scenarios.

### Running Package-Specific Tests

```bash
# Test specific package
pnpm --filter ./packages/plugin-react test
pnpm --filter ./packages/plugin-rsc test-e2e
```

## Code Quality

- Code is automatically formatted with Prettier on commit
- ESLint enforces code quality and consistency
- TypeScript provides type safety
- All packages require tests for new features

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all linting and tests pass
5. Keep changes focused and atomic

## Common Tasks for AI Agents

### Adding a New Feature

1. Identify the appropriate package
2. Read existing code patterns
3. Add implementation with proper TypeScript types
4. Add comprehensive tests
5. Update relevant documentation

### Debugging Issues

1. Check playground tests for reproduction cases
2. Use `pnpm dev` for live development
3. Run specific test suites to isolate problems
4. Review build outputs and error messages

### Performance Optimization

1. Profile with `vite-plugin-inspect`
2. Analyze bundle sizes in playground builds
3. Test with various React application patterns
4. Ensure backward compatibility
