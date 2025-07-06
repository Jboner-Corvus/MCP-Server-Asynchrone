// eslint.config.js
import globals from 'globals';
import eslintJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'libs/',
      'coverage/',
      'logs/',
      '*.log',
      '.vscode/',
      '.idea/',
      '.DS_Store',
      '*.env.*.local',
      '.env.local',
      // Ensure the problematic nested path is ignored if it somehow persists temporarily
      'src/utils/src/utils/',
      'eslint.config.js', // Ignore eslint config file from linting itself with TS rules
    ],
  },

  eslintJs.configs.recommended,

  // Base TypeScript configuration for all .ts files (syntax, basic rules)
  {
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
      import: eslintPluginImport,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // No 'project' here for the general .ts file pass
        sourceType: 'module',
        ecmaVersion: 'latest',
        // tsconfigRootDir: import.meta.dirname, // Only needed if 'project' is used
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'import/no-unresolved': 'error', // Relies on 'import/resolver'
      'import/export': 'error',
      'import/extensions': ['error', 'ignorePackages', { ts: 'never', js: 'never' }],
    },
    settings: {
      'import/resolver': {
        typescript: {
          // No 'project' needed here for basic resolution if moduleResolution in tsconfig is enough
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
  },

  // Configuration for TypeScript files that ARE part of the main project (application code)
  // This is where type-aware linting rules go.
  {
    files: ['src/**/*.ts'],
    // IMPORTANT: Exclude test files from this specific typed-linting configuration
    ignores: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/__tests__/**/*.ts',
      'src/utils/src/utils/**/*.ts', // Belt-and-suspenders for the problematic path
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json', // Apply project-based linting ONLY to app files
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Add any TypeScript rules here that REQUIRE type information, e.g.:
      // ...tseslint.configs.recommendedTypeChecked.rules, // If you want the full set
      // '@typescript-eslint/no-floating-promises': 'error',
      // Note: some rules from 'tseslint.configs.recommended.rules' might already be type-aware.
      // If they are applied in the block above without `parserOptions.project`, they might not work as intended
      // or ESLint might default them to off. This block ensures they run with type info for app code.
    },
  },

  // Configuration for test files
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    languageOptions: {
      // parserOptions: { // Optional: if you have a tsconfig.test.json
      // project: './tsconfig.test.json',
      // tsconfigRootDir: import.meta.dirname,
      // },
      globals: {
        ...globals.vitest,
        ...globals.node,
        ...globals.jest,
        NodeJS: true, // Explicitly define NodeJS as a global
        vi: true, // Explicitly define vi as a global for Vitest
      },
    },
    rules: {
      // You can relax or change rules specifically for tests here
      // e.g., '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  eslintPluginPrettierRecommended,
];
