/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PRICE_PRO_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_PRO_YEARLY?: string;
  readonly VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_ENTERPRISE_YEARLY?: string;
  readonly VITE_AI_PROXY_URL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
