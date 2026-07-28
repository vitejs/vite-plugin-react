# AI Agent Guide for @vitejs/plugin-rsc

This document provides AI-agent-specific guidance for the React Server Components (RSC) plugin. For comprehensive documentation, see:

- **[README.md](README.md)** - Plugin overview, concepts, and examples
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and testing guidelines

Before adding integration coverage, follow the test fixture guidance in [CONTRIBUTING.md](CONTRIBUTING.md#choosing-a-test-fixture).

Before creating or changing a conventional RSC example, use [`examples/starter-extra/src/framework`](examples/starter-extra/src/framework) as the comment-light framework baseline. Keep framework code aligned unless the example requires a behavioral difference. The specialized architectures described in [CONTRIBUTING.md](CONTRIBUTING.md#framework-baseline) may diverge.

## Quick Reference for AI Agents

### Essential Commands

```bash
# inside packages/plugin-rsc directory
pnpm build                          # build package
pnpm tsc                            # typecheck
pnpm test                           # Run unit tests
pnpm test-e2e                       # Run e2e tests
```
