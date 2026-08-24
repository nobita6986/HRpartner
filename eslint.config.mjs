// ESLint 9 flat config — G0-04 / RQ-03. Minimal Next 15 + TypeScript baseline.
// Lints app / src / packages / scripts / root config. Only genuinely non-source or
// foreign-runtime paths are ignored; NO source directory is blanket-ignored to fake green.
//
// Warning policy (RQ-03 / AC-03): stylistic / low-signal rules that already fire across
// the existing baseline are 'warn' (surfaced, not silenced, not ignored) so `eslint .`
// exits 0 on a clean baseline. Tighten to `--max-warnings 0` after the debt is burned down.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Zero-dependency placeholder so the pre-existing inline
// `// eslint-disable-next-line react-hooks/exhaustive-deps` in src/shared/ui resolves
// WITHOUT pulling eslint-plugin-react-hooks (which would begin enforcing hook rules across
// app/** — scope creep for a CI-bootstrap task). Enabling the real plugin = documented follow-up.
const reactHooksPlaceholder = {
  rules: {
    'exhaustive-deps': { meta: { schema: [] }, create: () => ({}) },
    'rules-of-hooks': { meta: { schema: [] }, create: () => ({}) },
  },
};

export default tseslint.config(
  {
    // Generated / vendored / non-source / foreign-runtime only — NEVER app/src/packages.
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      'next-env.d.ts',
      '**/*.d.ts',
      'prisma/migrations/**',
      'public/**', // static assets + generated mockups (sw.js, frame.js) — not app source
      'docs/**', // documentation + mockup assets — not app source
      'appBCC/**', // separate parallel project (Python), not this app's TS source
      // stray root diagnostic throwaways (not part of the app; check_rls.cjs is not valid JS)
      'check.js',
      'check_user.js',
      'check_rls.cjs',
      'apply-changes.mjs',
      '.tmp-*', // transient lint/report scratch files
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // App / library / test TypeScript.
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooksPlaceholder },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // Documented warning policy (see header) — real bugs stay 'error' via recommended.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-irregular-whitespace': 'warn',
      'prefer-const': 'warn',
    },
  },
  {
    // Plain JS / tooling — Node context.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // tseslint recommended enables its unused-vars rule for these files too — match the warn policy.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // k6 load-test scripts run in the k6 runtime (not Node) — declare its injected globals.
    files: ['scripts/load-test/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
  },
);
