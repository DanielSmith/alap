import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.iife.js',
      '**/vendor/**',
      '**/.astro/**',
      '**/.vitepress/cache/**',
      '**/env.d.ts',
    ],
  },

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx,js,jsx}'],
  })),

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'no-var': 'error',
      'prefer-arrow-callback': 'error',

      // We use tsc for type checking — disable noisy typescript-eslint rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
];
