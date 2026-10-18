// Legal documents of AIGen Hub (spec §8.7). Source: ../docs/<kind>.<locale>.md (versioned in git);
// published copies with acceptance records live in the database (legal_documents / legal_acceptances).
import { LEGAL_DOCS, OPERATOR_MISSING } from './docs.generated';

export type LegalDoc = (typeof LEGAL_DOCS)[number];
export const LEGAL_KINDS = ['terms', 'privacy', 'dpa', 'aup', 'ai_notice', 'subprocessors', 'cookies', 'refund', 'sla'] as const;
export type LegalKindName = (typeof LEGAL_KINDS)[number];

export { LEGAL_DOCS, OPERATOR_MISSING };

export const bundledDoc = (kind: string, locale = 'en'): LegalDoc | undefined =>
  LEGAL_DOCS.find((d) => d.kind === kind && d.locale === locale) ?? LEGAL_DOCS.find((d) => d.kind === kind && d.locale === 'en');

export const isLegalKind = (v: unknown): v is LegalKindName => typeof v === 'string' && (LEGAL_KINDS as readonly string[]).includes(v);
