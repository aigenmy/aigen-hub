import 'server-only';
import { env } from './env';

// Service email through Resend when RESEND_API_KEY and MAIL_FROM are set (Vercel env); otherwise nothing is sent
// and the caller shows the link to copy instead. Returns true only when the provider accepted the message.
export async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  const { RESEND_API_KEY, MAIL_FROM } = env();
  if (!RESEND_API_KEY || !MAIL_FROM) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
