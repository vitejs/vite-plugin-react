import type { BuildOptions, UserConfig } from 'vite'

export const silenceUseClientWarning = (userConfig: UserConfig): BuildOptions => ({
  rollupOptions: {
    onwarn(warning, defaultHandler) {
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        (warning.message.includes('use client') || warning.message.includes('use server'))
      ) {
        return
      }
      // https://github.com/vitejs/vite/issues/15012
      if (
        warning.code === 'SOURCEMAP_ERROR' &&
        warning.message.includes('resolve original location') &&
        warning.pos === 0
      ) {
        return
      }
      if (userConfig.build?.rollupOptions?.onwarn) {
        userConfig.build.rollupOptions.onwarn(warning, defaultHandler)
      } else {
        defaultHandler(warning)
      }
    },
  },
})
