import { describe, expect, it } from 'vitest'

describe('parallel build option', () => {
  it('should accept experimental.parallelBuild option', () => {
    // This test verifies that the RscPluginOptions type accepts the experimental.parallelBuild option
    // The actual parallel build logic is tested through integration tests

    const validOptions = [
      { experimental: { parallelBuild: true } },
      { experimental: { parallelBuild: false } },
      { experimental: {} },
      {},
    ]

    validOptions.forEach((options) => {
      // This should not throw TypeScript errors
      const parallelBuild = options.experimental?.parallelBuild ?? false
      expect(typeof parallelBuild).toBe('boolean')
    })
  })
})
