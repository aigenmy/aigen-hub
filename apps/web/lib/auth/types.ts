import type { Claims } from '@hub/db';

export type AuthResult = { ok: true } | { ok: false; code: string };

export type Factor = { id: string; name: string; status: 'verified' | 'unverified'; createdAt: string };

export type Enrollment = { factorId: string; qrDataUrl: string; secret: string };

export interface AuthAdapter {
  mode: 'supabase' | 'local';
  getClaims(): Promise<Claims | null>;
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  signUp(input: { email: string; password: string; fullName: string; locale: string; next?: string }): Promise<AuthResult & { needsConfirmation?: boolean }>;
  signOut(): Promise<void>;
  /** Email sign-in link. Not available in local mode. */
  sendMagicLink(email: string, next: string): Promise<AuthResult>;
  /** URL to start Google sign-in. Not available in local mode. */
  googleSignInUrl(next: string): Promise<string | null>;
  requestPasswordReset(email: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  mfa: {
    /** 'aal2' when the user has a verified second factor (so an aal1 session must be challenged). */
    nextLevel(): Promise<'aal1' | 'aal2'>;
    list(): Promise<Factor[]>;
    enroll(friendlyName: string): Promise<Enrollment | { code: string }>;
    /** Verifies a code for a factor (first time = activates it) and raises this session to aal2. */
    verify(factorId: string, code: string): Promise<AuthResult>;
    unenroll(factorId: string): Promise<AuthResult>;
  };
}
