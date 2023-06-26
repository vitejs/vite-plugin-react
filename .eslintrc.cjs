module.exports = {
  env: { browser: true, es2020: true },
  'extends': [
    'plugin:react/recommended'
],
  
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
  },
}
