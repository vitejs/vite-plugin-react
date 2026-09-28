import regexp from 'eslint-plugin-regexp'
import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['typescript', 'node', 'import', 'unicorn'],
  jsPlugins: ['eslint-plugin-n', 'eslint-plugin-regexp'],
  categories: {
    correctness: 'error',
  },
  env: {
    builtin: true,
    es2024: true,
    node: true,
  },
  ignorePatterns: [
    '**/dist/**',
    '**/playground-temp/**',
    '**/temp/**',
    'packages/plugin-rsc/**',
  ],
  rules: {
    eqeqeq: [
      'warn',
      'always',
      {
        null: 'never',
      },
    ],
    'no-empty': [
      'warn',
      {
        allowEmptyCatch: true,
      },
    ],
    'prefer-const': [
      'warn',
      {
        destructuring: 'all',
      },
    ],
    'no-restricted-globals': ['error', 'require', '__dirname', '__filename'],
    'no-empty-function': [
      'error',
      {
        allow: ['arrowFunctions'],
      },
    ],
    'no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'no-case-declarations': 'error',
    'no-fallthrough': 'error',
    'typescript/explicit-module-boundary-types': [
      'error',
      {
        allowArgumentsExplicitlyTypedAsAny: true,
      },
    ],
    'typescript/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],
    'unicorn/prefer-node-protocol': 'error',
    'import/no-duplicates': 'error',
    'import/default': 'off',

    'n/no-extraneous-import': 'error',
    'n/no-extraneous-require': 'error',
    'n/no-unsupported-features/es-builtins': 'error',
    'n/no-unsupported-features/node-builtins': 'error',
    ...regexp.configs['flat/recommended'].rules,
    'regexp/prefer-regexp-exec': 'error',
    'regexp/prefer-regexp-test': 'error',
    // in some cases using explicit letter-casing is more performant than the `i` flag
    'regexp/use-ignore-case': 'off',
  },
  overrides: [
    {
      files: [
        'packages/**/*.test.{,c,m}[jt]s{,x}',
        'playground/**/*.{,c,m}[jt]s{,x}',
        'packages/plugin-react-swc/playground/**/*.{,c,m}[jt]s{,x}',
      ],
      rules: {
        'n/no-extraneous-import': 'off',
        'n/no-extraneous-require': 'off',
        'n/no-unsupported-features/es-builtins': 'off',
        'n/no-unsupported-features/node-builtins': 'off',
        'no-empty': 'off',
        'no-constant-condition': 'off',
        'no-unused-expressions': 'off',
        'no-unused-vars': 'off',
        'no-empty-function': 'off',
        'typescript/explicit-module-boundary-types': 'off',
      },
    },
  ],
})
