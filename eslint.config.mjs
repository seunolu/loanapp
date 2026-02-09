import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Replaces .eslintignore
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.min.*',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Treat config files as Node/CommonJS where needed
  {
    files: ['**/*.cjs', '**/*.config.cjs', '**/*.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // Basic project-wide rules
  {
    rules: {
      'no-console': 'off',
    },
  },
];
