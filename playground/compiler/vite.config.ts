import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const babelPlugins = [['babel-plugin-react-compiler', {}]]
  if (command === 'serve') {
    babelPlugins.push(['@babel/plugin-transform-react-jsx-development', {}])
  }

  return {
    server: { port: 8900 /* Should be unique */ },
    // @ts-expect-error babel plugins are not supported
    plugins: [react({ babel: { plugins: babelPlugins } })],
  }
})
