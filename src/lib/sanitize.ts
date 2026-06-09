/**
 * DOMPurify Sanitization Wrapper — DR-33: Security Left-Shift Gate
 *
 * ALL HTML rendering of user-generated content MUST go through this module.
 * Direct use of dangerouslySetInnerHTML without sanitize() is prohibited.
 *
 * Pattern:
 *   import { sanitize } from '@/lib/sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitize(rawHtml) }} />
 *
 * Fail-closed: If DOMPurify is not available, rendering is blocked
 * rather than showing unsanitized HTML.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string for safe rendering.
 * Blocks rendering if DOMPurify is not available (fail-closed).
 */
export function sanitize(dirty: string): string {
  if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    console.error('[sanitize] DOMPurify unavailable — blocking potentially unsafe HTML rendering.');
    return '';
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'em', 'del', 'code', 'pre',
      'blockquote',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize Markdown-rendered HTML (more permissive for code blocks etc.)
 */
export function sanitizeMarkdown(html: string): string {
  if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    console.error('[sanitize] DOMPurify unavailable — blocking markdown HTML rendering.');
    return '';
  }
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['input'],
    ADD_ATTR: ['checked', 'disabled', 'type'],
  });
}
