import { describe, expect, it } from 'vitest';
import { allMessages, formatRM, keyPaths, LOCALES, pickLocale } from '../src/index';

describe('languages', () => {
  it('every language has exactly the English keys', () => {
    const en = keyPaths(allMessages.en).sort();
    for (const l of LOCALES) expect(keyPaths(allMessages[l]).sort()).toEqual(en);
  });

  it('no translation is left empty or still in English placeholders', () => {
    for (const l of LOCALES) {
      const flat = keyPaths(allMessages[l]);
      for (const k of flat) {
        const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], allMessages[l]);
        expect(typeof v === 'string' && v.trim().length > 0, `${l}.${k}`).toBe(true);
      }
    }
  });

  it('picks the cookie first, then the browser language, then English', () => {
    expect(pickLocale('zh', 'ms-MY')).toBe('zh');
    expect(pickLocale(undefined, 'ms-MY,en;q=0.8')).toBe('ms');
    expect(pickLocale(undefined, 'zh-CN,zh;q=0.9')).toBe('zh');
    expect(pickLocale('fr', 'fr-FR')).toBe('en');
  });

  it('money is RM with two decimals and thousands separators', () => {
    expect(formatRM(12900)).toBe('RM 129.00');
    expect(formatRM(123450)).toBe('RM 1,234.50');
    expect(formatRM(0)).toBe('RM 0.00');
  });
});
