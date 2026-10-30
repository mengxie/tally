import eslint from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/', '**/coverage/', '**/node_modules/'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'vitest.config.ts', 'apps/api/build.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // React event handlers may be async; the promise is deliberately not awaited by React.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      eqeqeq: 'error',
    },
  },
  { files: ['apps/web/**/*.{ts,tsx}'], ...reactHooks.configs.flat.recommended },
  {
    files: ['**/test/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  { files: ['**/*.js', '**/*.mjs'], ...tseslint.configs.disableTypeChecked },
);
