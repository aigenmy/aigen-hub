// The same tokens for code that needs raw values (charts, canvas, emails). Keep in step with tokens.css.
export const colors = {
  bg: '#f6f8fb',
  surface: '#ffffff',
  border: '#e5e9f0',
  text: '#0f172a',
  text2: '#64748b',
  accent: '#5ac8ff',
  accentStrong: '#1a6e99',
  success: '#1b7a43',
  warning: '#b45309',
  danger: '#b91c1c',
} as const;

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'webchat' | 'tiktok' | 'email';

export const channelColors: Record<Exclude<Channel, 'email'>, { brand: string; tint: string; text: string }> = {
  whatsapp: { brand: '#25D366', tint: '#E8F8EE', text: '#1B7A43' },
  instagram: { brand: '#E1306C', tint: '#FDEAF1', text: '#B02356' },
  messenger: { brand: '#0084FF', tint: '#E6F2FF', text: '#0A5BB5' },
  telegram: { brand: '#229ED9', tint: '#E6F4FB', text: '#17688F' },
  webchat: { brand: '#5ac8ff', tint: '#E9F7FF', text: '#1A6E99' },
  tiktok: { brand: '#69C9D0', tint: '#E9F9FA', text: '#0F6B72' },
};

/** One colour per mailbox, in this order (spec §2.2). */
export const mailboxColors = [
  { name: 'amber', brand: '#d97706', tint: '#fef3e2', text: '#92400e' },
  { name: 'violet', brand: '#7c3aed', tint: '#f1ebfe', text: '#5b21b6' },
  { name: 'teal', brand: '#0d9488', tint: '#e5f6f4', text: '#115e59' },
  { name: 'slate', brand: '#475569', tint: '#eef1f5', text: '#334155' },
  { name: 'coral', brand: '#f0644b', tint: '#fdeeea', text: '#b33a24' },
  { name: 'olive', brand: '#65a30d', tint: '#eff7e4', text: '#3f6212' },
] as const;
