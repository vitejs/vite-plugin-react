# AI Agent Development Guide

This document provides AI-agent-specific guidance for working with the vite-plugin-react monorepo. For comprehensive documentation, see:

- **[README.md](README.md)** - Repository overview and package links
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Setup, testing, debugging, and contribution guidelines

## Quick Reference for AI Agents

### Repository Navigation

This monorepo contains multiple packages (see [README.md](README.md#packages) for details):

- `packages/plugin-react/` - Main React plugin with Babel
- `packages/plugin-react-swc/` - SWC-based React plugin
- `packages/plugin-rsc/` - React Server Components ([AI guidance](packages/plugin-rsc/AGENTS.md), [architecture](packages/plugin-rsc/docs/architecture.md))
- `packages/plugin-react-oxc/` - Deprecated (merged with plugin-react)

### Essential Setup Commands

```bash
pnpm install && pnpm build   # Initial setup (see CONTRIBUTING.md for details)
pnpm dev                     # Watch mode development
pnpm test                    # Run all tests
```
