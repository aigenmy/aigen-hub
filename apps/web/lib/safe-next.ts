/** Only same-site relative paths may be used as a "next" redirect (no open redirects). */
export function safeNext(value: unknown, fallback = '/home'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
