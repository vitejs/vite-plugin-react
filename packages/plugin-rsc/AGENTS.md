# AI Agent Guide for @vitejs/plugin-rsc

This document provides AI-agent-specific guidance for the React Server Components (RSC) plugin. For comprehensive documentation, see:

- **[README.md](README.md)** - Plugin overview, concepts, and examples
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and testing guidelines

Before adding integration coverage, follow the test fixture guidance in [CONTRIBUTING.md](CONTRIBUTING.md#choosing-a-test-fixture).

Before creating or changing a conventional RSC example, use [`examples/starter-extra/src/framework`](examples/starter-extra/src/framework) as the comment-light framework baseline. Keep framework code aligned unless the example requires a behavioral difference. The specialized architectures described in [CONTRIBUTING.md](CONTRIBUTING.md#framework-baseline) may diverge.

## Quick Reference for AI Agents

### Fresh Worktree Setup

```bash
# from the repository root
pnpm install
pnpm build
```

Run the full workspace build before RSC E2E tests because examples use other workspace packages, such as `@vitejs/plugin-react`.

### Package Commands

```bash
# inside packages/plugin-rsc
pnpm tsc                            # typecheck
pnpm test --run                     # run unit tests
pnpm test-e2e                       # run E2E tests
```
