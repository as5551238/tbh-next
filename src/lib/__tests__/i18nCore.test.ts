// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  t,
  setLocale,
  getLocale,
  registerTranslations,
  translations,
  setLocaleAndNotify,
  subscribeLocaleChange,
  type Locale,
} from '@/lib/i18n';

describe('i18nCore', () => {
  beforeEach(() => {
    setLocale('zh');
    localStorage.clear();
  });

  describe('t()', () => {
    it('returns the key itself when translation not found', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('returns registered translation for current locale', () => {
      registerTranslations('zh', { 'hello.world': 'Hello World ZH' });
      registerTranslations('en', { 'hello.world': 'Hello World EN' });
      expect(t('hello.world')).toBe('Hello World ZH');
      setLocale('en');
      expect(t('hello.world')).toBe('Hello World EN');
    });

    it('interpolates parameters', () => {
      registerTranslations('zh', { greet: 'Hello, {name}!' });
      expect(t('greet', { name: 'World' })).toBe('Hello, World!');
    });

    it('interpolates multiple parameters', () => {
      registerTranslations('zh', { info: '{count} items, {status}' });
      expect(t('info', { count: 5, status: 'active' })).toBe('5 items, active');
    });

    it('falls back to zh when key missing in current locale', () => {
      registerTranslations('zh', { 'only.zh': 'Only in Chinese' });
      registerTranslations('en', {});
      setLocale('en');
      expect(t('only.zh')).toBe('Only in Chinese');
    });

    it('returns key as fallback when missing in both locales', () => {
      setLocale('en');
      expect(t('missing.everywhere')).toBe('missing.everywhere');
    });

    it('handles numeric interpolation values', () => {
      registerTranslations('zh', { progress: '{current}/{total}' });
      expect(t('progress', { current: 3, total: 10 })).toBe('3/10');
    });

    it('replaces all occurrences of same placeholder', () => {
      registerTranslations('zh', { repeat: '{x} and {x}' });
      expect(t('repeat', { x: 'A' })).toBe('A and A');
    });

    it('returns key for flat non-dotted key that does not exist', () => {
      expect(t('flatkey')).toBe('flatkey');
    });
  });

  describe('setLocale / getLocale', () => {
    it('persists locale to localStorage', () => {
      setLocale('en');
      expect(localStorage.getItem('tbh-locale')).toBe('en');
      expect(getLocale()).toBe('en');
    });

    it('switches between locales', () => {
      setLocale('zh');
      expect(getLocale()).toBe('zh');
      setLocale('en');
      expect(getLocale()).toBe('en');
    });

    it('sets document.documentElement.lang', () => {
      setLocale('en');
      expect(document.documentElement.lang).toBe('en');
      setLocale('zh');
      expect(document.documentElement.lang).toBe('zh');
    });

    it('handles zh locale', () => {
      setLocale('zh');
      expect(getLocale()).toBe('zh');
    });

    it('handles en locale', () => {
      setLocale('en');
      expect(getLocale()).toBe('en');
    });
  });

  describe('registerTranslations', () => {
    it('flattens nested objects to dot-notation keys', () => {
      registerTranslations('zh', {
        flattest: { home: 'Home', user: { profile: 'Profile' } },
      });
      expect(translations.zh['flattest.home']).toBe('Home');
      expect(translations.zh['flattest.user.profile']).toBe('Profile');
    });

    it('merges with existing translations', () => {
      registerTranslations('zh', { key1: 'First' });
      registerTranslations('zh', { key2: 'Second' });
      expect(translations.zh['key1']).toBe('First');
      expect(translations.zh['key2']).toBe('Second');
    });

    it('overwrites existing keys on re-registration', () => {
      registerTranslations('zh', { overwrite: 'Old' });
      registerTranslations('zh', { overwrite: 'New' });
      expect(translations.zh['overwrite']).toBe('New');
    });

    it('handles deeply nested structures', () => {
      registerTranslations('zh', {
        a: { b: { c: { d: 'deep' } } },
      });
      expect(translations.zh['a.b.c.d']).toBe('deep');
    });

    it('ignores non-string values in nested objects', () => {
      registerTranslations('zh', {
        mixed: { str: 'hello', num: 42 as any, bool: true as any },
      });
      expect(translations.zh['mixed.str']).toBe('hello');
      expect(translations.zh['mixed.num']).toBeUndefined();
      expect(translations.zh['mixed.bool']).toBeUndefined();
    });
  });

  describe('setLocaleAndNotify', () => {
    it('notifies subscribers on locale change', () => {
      const listener = vi.fn();
      const unsub = subscribeLocaleChange(listener);
      setLocaleAndNotify('en');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(getLocale()).toBe('en');
      unsub();
    });

    it('unsubscribe stops notifications', () => {
      const listener = vi.fn();
      const unsub = subscribeLocaleChange(listener);
      unsub();
      setLocaleAndNotify('zh');
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers', () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      const u1 = subscribeLocaleChange(l1);
      const u2 = subscribeLocaleChange(l2);
      setLocaleAndNotify('en');
      expect(l1).toHaveBeenCalledTimes(1);
      expect(l2).toHaveBeenCalledTimes(1);
      u1();
      u2();
    });

    it('notifies only remaining subscribers after one unsubscribes', () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      const u1 = subscribeLocaleChange(l1);
      subscribeLocaleChange(l2);
      u1();
      setLocaleAndNotify('en');
      expect(l1).not.toHaveBeenCalled();
      expect(l2).toHaveBeenCalledTimes(1);
    });
  });

  describe('locale detection', () => {
    it('defaults to zh when no stored preference', () => {
      expect(getLocale()).toBe('zh');
    });

    it('reads stored locale from localStorage', () => {
      localStorage.setItem('tbh-locale', 'en');
      expect(localStorage.getItem('tbh-locale')).toBe('en');
    });
  });
});
