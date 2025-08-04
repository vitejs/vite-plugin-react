// @ts-check
import { builtinModules } from 'node:module'
import eslint from '@eslint/js'
import pluginN from 'eslint-plugin-n'
import pluginImportX from 'eslint-plugin-import-x'
import pluginRegExp from 'eslint-plugin-regexp'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/playground-temp/**', '**/temp/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  pluginN.configs['flat/recommended'],
  pluginRegExp.configs['flat/recommended'],
  {
    name: 'main',
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2021,
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
    plugins: {
      n: pluginN,
      'import-x': pluginImportX,
    },
    rules: {
      eqeqeq: ['warn', 'always', { null: 'never' }],
      'no-debugger': ['error'],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': [
        'warn',
        {
          destructuring: 'all',
        },
      ],

      'n/no-process-exit': 'off',
      'n/no-deprecated-api': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unpublished-require': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-missing-import': [
        'error',
        {
          tryExtensions: ['.ts', '.js', '.jsx', '.tsx', '.d.ts'],
        },
      ],

      '@typescript-eslint/explicit-module-boundary-types': [
        'error',
        { allowArgumentsExplicitlyTypedAsAny: true },
      ],
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['arrowFunctions'] },
      ],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-extra-semi': 'off',
      '@typescript-eslint/no-extra-semi': 'off', // conflicts with prettier
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': [
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
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      // disable rules set in @typescript-eslint/stylistic which conflict with current code
      // we should discuss if we want to enable these as they encourage consistent code
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-function-type': 'off',

      'import-x/no-nodejs-modules': [
        'error',
        { allow: builtinModules.map((mod) => `node:${mod}`) },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/order': 'error',
      'sort-imports': [
        'error',
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
          allowSeparatedGroups: false,
        },
      ],

      'regexp/prefer-regexp-exec': 'error',
      'regexp/prefer-regexp-test': 'error',
      // in some cases using explicit letter-casing is more performant than the `i` flag
      'regexp/use-ignore-case': 'off',
    },
  },
  {
    name: 'vite/globals',
    files: ['packages/**/*.?([cm])[jt]s?(x)'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-globals': ['error', 'require', '__dirname', '__filename'],
    },
  },
  {
    name: 'disables/playground',
    files: [
      'packages/**/*.test.?([cm])[jt]s?(x)',
      'playground/**/*.?([cm])[jt]s?(x)',
      'packages/plugin-react-swc/playground/**/*.?([cm])[jt]s?(x)',
    ],
    rules: {
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',
      'n/no-missing-import': 'off',
      'n/no-missing-require': 'off',
      'n/no-unsupported-features/es-builtins': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    name: 'disables/js',
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    name: 'disables/dts',
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    name: 'plugin-rsc/node-features',
    files: ['packages/plugin-rsc/**/*.?([cm])[jt]s?(x)'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-missing-import': [
        'error',
        {
          tryExtensions: ['.ts', '.js', '.jsx', '.tsx', '.d.ts'],
          allowModules: ['estree'],
        },
      ],
    },
  },
  {
    name: 'plugin-rsc/virtual-imports',
    files: [
      'packages/plugin-rsc/src/utils/encryption-runtime.ts',
      'packages/plugin-rsc/src/rsc.tsx',
      'packages/plugin-rsc/src/ssr.tsx',
      'packages/plugin-rsc/src/browser.ts',
      'packages/plugin-rsc/src/react/**/*.?([cm])[jt]s',
      'packages/plugin-rsc/src/core/**/*.?([cm])[jt]s',
      'packages/plugin-rsc/src/index.ts',
      'packages/plugin-rsc/src/plugin.ts',
    ],
    rules: {
      'n/no-missing-import': 'off',
    },
  },
  {
    name: 'plugin-rsc/examples-and-test-files',
    files: [
      'packages/plugin-rsc/examples/**/*.?([cm])[jt]s?(x)',
      'packages/plugin-rsc/e2e/**/*.?([cm])[jt]s?(x)',
      'packages/plugin-rsc/**/*.test.?([cm])[jt]s?(x)',
      'packages/plugin-rsc/vitest.config.ts',
      'packages/plugin-rsc/tsdown.config.ts',
    ],
    rules: {
      'n/no-missing-import': 'off',
      'n/no-extraneous-import': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-empty-pattern': 'off',
      'import-x/no-nodejs-modules': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'prefer-spread': 'off',
      'no-constant-condition': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'regexp/no-super-linear-backtracking': 'off',
    },
  },
  {
    name: 'plugin-rsc/test-utils',
    files: ['packages/plugin-rsc/src/transforms/test-utils.ts'],
    rules: {
      'import-x/no-nodejs-modules': 'off',
    },
  },
)
