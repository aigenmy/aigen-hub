import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEGAL_DOCS, LEGAL_KINDS } from '../src/index';

describe('legal documents', () => {
  it('every kind exists in English with a version and a title', () => {
    for (const k of LEGAL_KINDS) {
      const d = LEGAL_DOCS.find((x) => x.kind === k && x.locale === 'en');
      expect(d, k).toBeDefined();
      expect(d!.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d!.title.length).toBeGreaterThan(3);
    }
  });

  it('the five documents users accept are marked so; the others are not', () => {
    const must = LEGAL_DOCS.filter((d) => d.requiresAcceptance).map((d) => d.kind).sort();
    expect(must).toEqual(['ai_notice', 'aup', 'dpa', 'privacy', 'terms']);
  });

  it('the stored fingerprint matches the text, and no raw placeholder is left', () => {
    for (const d of LEGAL_DOCS) {
      expect(createHash('sha256').update(d.bodyMd).digest('hex')).toBe(d.sha256);
      expect(d.bodyMd).not.toMatch(/\{\{\w+\}\}/);
    }
  });

  it('internal links point to documents that exist', () => {
    for (const d of LEGAL_DOCS) {
      for (const m of d.bodyMd.matchAll(/\]\(\/legal\/([a-z_]+)\)/g)) {
        expect(LEGAL_KINDS as readonly string[], `${d.kind} → ${m[1]}`).toContain(m[1]);
      }
    }
  });
});
