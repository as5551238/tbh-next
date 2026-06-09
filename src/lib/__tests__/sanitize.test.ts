import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeMarkdown } from '@/lib/sanitize';

describe('sanitize', () => {
  it('removes script tags (XSS prevention)', () => {
    const result = sanitize('<script>alert("xss")</script>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
  });

  it('removes onclick event handlers', () => {
    const result = sanitize('<div onclick="alert(1)">click</div>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
  });

  it('removes javascript: protocol in href', () => {
    const result = sanitize('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain('javascript:');
  });

  it('removes onerror from img tags', () => {
    const result = sanitize('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('preserves safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitize(input)).toContain('<p>');
    expect(sanitize(input)).toContain('<strong>');
  });

  it('preserves allowed tags: h1-h6, ul, ol, li, etc.', () => {
    const input = '<h1>Title</h1><ul><li>item</li></ul>';
    const result = sanitize(input);
    expect(result).toContain('<h1>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('preserves allowed attributes: href, src, alt', () => {
    const input = '<a href="https://example.com" title="link">go</a>';
    const result = sanitize(input);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('title="link"');
  });

  it('removes disallowed tags like iframe', () => {
    const result = sanitize('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain('iframe');
  });

  it('removes data-* attributes (ALLOW_DATA_ATTR: false)', () => {
    const result = sanitize('<div data-custom="val">text</div>');
    expect(result).not.toContain('data-custom');
  });

  it('returns empty string for empty input', () => {
    expect(sanitize('')).toBe('');
  });

  it('handles plain text without HTML', () => {
    expect(sanitize('just text')).toBe('just text');
  });

  it('preserves table-related tags', () => {
    const input = '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>';
    const result = sanitize(input);
    expect(result).toContain('<table>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
  });

  it('preserves blockquote and code tags', () => {
    const input = '<blockquote>quote</blockquote><code>var x</code>';
    const result = sanitize(input);
    expect(result).toContain('<blockquote>');
    expect(result).toContain('<code>');
  });

  it('removes style tags', () => {
    const result = sanitize('<style>body{display:none}</style>');
    expect(result).not.toContain('<style');
  });

  it('removes onmouseover event handlers', () => {
    const result = sanitize('<div onmouseover="alert(1)">hover</div>');
    expect(result).not.toContain('onmouseover');
  });

  it('preserves br and hr tags', () => {
    const result = sanitize('line1<br>line2<hr>');
    expect(result).toContain('<br>');
    expect(result).toContain('<hr>');
  });

  it('preserves del and em tags', () => {
    const result = sanitize('<del>removed</del><em>emphasis</em>');
    expect(result).toContain('<del>');
    expect(result).toContain('<em>');
  });

  it('preserves pre tag', () => {
    const result = sanitize('<pre>code block</pre>');
    expect(result).toContain('<pre>');
  });

  it('handles nested XSS attempts', () => {
    const result = sanitize('<p><script>alert(1)</script></p>');
    expect(result).not.toContain('script');
    expect(result).toContain('<p>');
  });

  it('removes form and input tags', () => {
    const result = sanitize('<form action="/steal"><input type="text"></form>');
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
  });
});

describe('sanitizeMarkdown', () => {
  it('allows input tags with checked and disabled attributes', () => {
    const input = '<input type="checkbox" checked disabled>';
    const result = sanitizeMarkdown(input);
    expect(result).toContain('type="checkbox"');
    expect(result).toContain('checked');
    expect(result).toContain('disabled');
  });

  it('still removes script tags', () => {
    const result = sanitizeMarkdown('<script>alert(1)</script>');
    expect(result).not.toContain('script');
  });

  it('handles empty string', () => {
    expect(sanitizeMarkdown('')).toBe('');
  });

  it('is more permissive than sanitize for markdown content', () => {
    const html = '<input type="checkbox" checked> Task item';
    const strict = sanitize(html);
    const md = sanitizeMarkdown(html);
    expect(md).toContain('<input');
  });
});
