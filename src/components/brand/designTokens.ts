/**
 * Brand Design Token System — 经验教训L6转化
 *
 * 从TBH Review提取：TBH品牌体系仅6个CSS变量(accent/surface)，
 * 缺间距/字体/阴影/动画等完整Token体系，无法支撑SaaS级一致性。
 *
 * tbh-next改进：基于设计系统的三层Token架构
 * - Primitive: 原始值(颜色/间距/字号)
 * - Semantic: 语义映射(primary/surface/danger)
 * - Component: 组件级覆盖(--btn-padding, --card-shadow)
 *
 * 使用方式：在index.css中引入本文件生成的CSS变量，
 * 或在Tailwind config中引用token值。
 */

// ===== Primitive Tokens =====
export const primitives = {
  color: {
    // Brand palette
    brand50: '#eef2ff',
    brand100: '#dbe4ff',
    brand200: '#bac8ff',
    brand300: '#91a7ff',
    brand400: '#748ffc',
    brand500: '#5c7cfa',
    brand600: '#4c6ef5',
    brand700: '#4263eb',
    brand800: '#3b5bdb',
    brand900: '#364fc7',
    // Neutral
    gray50: '#f8f9fa',
    gray100: '#f1f3f5',
    gray200: '#e9ecef',
    gray300: '#dee2e6',
    gray400: '#ced4da',
    gray500: '#adb5bd',
    gray600: '#868e96',
    gray700: '#495057',
    gray800: '#343a40',
    gray900: '#212529',
    // Semantic
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    info: '#339af0',
  },
  spacing: {
    0: '0px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)',
  },
  transition: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
} as const;

// ===== Semantic Tokens (Dark Theme Default) =====
export const semanticDark = {
  'bg-primary': primitives.color.brand600,
  'bg-primary-hover': primitives.color.brand500,
  'bg-primary-foreground': '#ffffff',
  'bg-surface': '#0a0c12',
  'bg-surface-elevated': '#131620',
  'bg-surface-hover': '#1a1e2e',
  'text-primary': '#eaecf4',
  'text-secondary': '#8b92a5',
  'text-tertiary': '#7580a0',
  'border-default': '#272d42',
  'border-focus': primitives.color.brand500,
  'status-success': primitives.color.success,
  'status-warning': primitives.color.warning,
  'status-danger': primitives.color.danger,
  'status-info': primitives.color.info,
};

// ===== Semantic Tokens (Light Theme) =====
export const semanticLight = {
  'bg-primary': primitives.color.brand600,
  'bg-primary-hover': primitives.color.brand700,
  'bg-primary-foreground': '#ffffff',
  'bg-surface': '#ffffff',
  'bg-surface-elevated': '#f8f9fa',
  'bg-surface-hover': '#f1f3f5',
  'text-primary': '#212529',
  'text-secondary': '#495057',
  'text-tertiary': '#6c757d',
  'border-default': '#dee2e6',
  'border-focus': primitives.color.brand500,
  'status-success': primitives.color.success,
  'status-warning': primitives.color.warning,
  'status-danger': primitives.color.danger,
  'status-info': primitives.color.info,
};

/** 生成CSS变量声明字符串(用于注入index.css) */
export function generateCSSTokens(isDark: boolean = true): string {
  const tokens = isDark ? semanticDark : semanticLight;
  const lines = Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};`);
  return `:root {\n${lines.join('\n')}\n}`;
}
