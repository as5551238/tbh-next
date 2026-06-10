import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/', '.temp/', 'node_modules/', 'scripts/', 'supabase/', 'tailwind.config.cjs'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // ── Contract-First: 防止静默失败和死按钮 ──
      'no-empty-function': ['warn', { allow: ['constructors', 'arrowFunctions'] }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // DR-22: Prohibit React.xxx namespace access (causes "React is not defined" in prod builds)
      'no-restricted-properties': ['error', {
        message: 'DR-22: Use named imports instead of React.xxx. Replace React.lazy with lazy, React.FC with FC, etc.',
        property: 'lazy',
        object: 'React',
      }, {
        message: 'DR-22: Use named import type FC instead of React.FC',
        property: 'FC',
        object: 'React',
      }, {
        message: 'DR-22: Use named import type ReactNode instead of React.ReactNode',
        property: 'ReactNode',
        object: 'React',
      }, {
        message: 'DR-22: Use named import type CSSProperties instead of React.CSSProperties',
        property: 'CSSProperties',
        object: 'React',
      }],
      // DR-27: Prohibit direct setInterface/setActiveModule calls outside appStore
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@/stores/appStore',
          message: 'DR-27: Do not import setInterface/setActiveModule directly. Use navigateTo() from appStore instead. See MEMORY.md state consistency red line.',
          importNames: ['setInterface', 'setActiveModule'],
        }],
      }],
      // ── React Compiler rules (react-hooks@7) — downgrade to warn ──
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/invariant': 'warn',
      'react-hooks/memoized-effect-dependencies': 'warn',
      'react-hooks/exhaustive-effect-dependencies': 'warn',
    },
  },
);

// ── DR-33: Security Left-Shift Gate ──
// Prohibit dangerouslySetInnerHTML without sanitize wrapper
// Pattern: dangerouslySetInnerHTML must be paired with sanitize() call
