import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';
import unusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      'next-env.d.ts',
    ],
  },

  // Extend Next.js configs using compatibility layer
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Global configuration for all files
  {
    plugins: {
      'unused-imports': unusedImports,
    },

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      // Disable rules that conflict with TypeScript or cause issues
      '@typescript-eslint/no-explicit-any': 'off',

      // Disable the base rule as it can report incorrect errors
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',

      // Use unused-imports plugin instead (auto-fixable!)
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Next.js specific
      '@next/next/no-html-link-for-pages': 'off',

      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // General code quality
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
];
