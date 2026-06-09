import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, getLocale, registerTranslations, translations } from '@/lib/i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('zh');
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
      registerTranslations('zh', { 'greet': 'Hello, {name}!' });
      expect(t('greet', { name: 'World' })).toBe('Hello, World!');
    });

    it('interpolates multiple parameters', () => {
      registerTranslations('zh', { 'info': '{count} items, {status}' });
      expect(t('info', { count: 5, status: 'active' })).toBe('5 items, active');
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
  });

  describe('registerTranslations', () => {
    it('flattens nested objects to dot-notation keys', () => {
      registerTranslations('zh', {
        flattest: { home: 'Home', user: { profile: 'Profile' } },
      });
      expect(translations.zh['flattest.home']).toBe('Home');
      expect(translations.zh['flattest.user.profile']).toBe('Profile');
    });
  });
});
