import type { UserConfig } from 'vite'

import react from '@vitejs/plugin-react'

const config: UserConfig = {
  server: { port: 8902 /* Should be unique */ },
  mode: 'development',
  plugins: [
    react(),
    {
      name: 'add-export',
      transform: {
        filter: { id: /\/inject-exports-later\.jsx$/ },
        handler(code) {
          return code + '\nexport const testArray = ["1", "2", "3"];'
        },
      },
    },
  ],
  build: {
    // to make tests faster
    minify: false,
  },
}

export default config
