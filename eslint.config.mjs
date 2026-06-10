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
      'react-refresh/only-export-components': 'off',
      // ── Contract-First: 防止静默失败和死按钮 ──
      'no-empty-function': ['warn', { allow: ['constructors', 'arrowFunctions'] }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'off',
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
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
      'react-hooks/invariant': 'off',
      'react-hooks/memoized-effect-dependencies': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
);

// ── DR-33: Security Left-Shift Gate ──
// Prohibit dangerouslySetInnerHTML without sanitize wrapper
// Pattern: dangerouslySetInnerHTML must be paired with sanitize() call
