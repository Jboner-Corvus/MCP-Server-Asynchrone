// eslint.config.js (Correction Finale)
import globals from 'globals';
import eslintJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  // 1. Fichiers et dossiers à ignorer globalement
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'logs/',
      '*.log',
      '.vscode/',
      '.idea/',
      '.DS_Store',
      '*.env.*.local',
      '.env.local',
      'src/utils/src/utils/',
    ],
  },

  // 2. Configuration de base recommandée par ESLint
  eslintJs.configs.recommended,

  // 3. Configuration principale pour TOUS les fichiers TypeScript
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
      import: eslintPluginImport,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'import/no-unresolved': 'error',
      'import/export': 'error',
      // CORRECTION FINALE : Ajustement de la règle 'import/extensions'
      'import/extensions': [
        'error',
        'never', // Ne jamais utiliser d'extension par défaut...
        {
          js: 'always', // ...SAUF pour les .js, qui sont obligatoires
          ignorePackages: true, // Ignorer les paquets comme 'zod' ou 'pino'
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
  },

  // 4. Configuration spécifique pour les fichiers de test
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    languageOptions: {
      globals: { ...globals.jest },
    },
    rules: {
      'import/no-unresolved': 'off',
    },
  },

  // 5. Configuration pour Prettier (doit être le dernier élément)
  eslintPluginPrettierRecommended,
];
