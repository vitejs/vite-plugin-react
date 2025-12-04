import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const babelPlugins = [['babel-plugin-react-compiler', {}]]
  if (command === 'serve') {
    babelPlugins.push(['@babel/plugin-transform-react-jsx-development', {}])
  }

  return {
    server: { port: 8900 /* Should be unique */ },
    plugins: [react({ babel: { plugins: babelPlugins } })],
  }
})
