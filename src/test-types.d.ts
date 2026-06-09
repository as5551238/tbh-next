import 'vitest';
import '@testing-library/jest-dom';

declare module 'vitest' {
  interface Assertion<T> {
    toBeInTheDocument(): T;
    toHaveTextContent(text: string): T;
    toBeVisible(): T;
  }
}
