// Plain class helpers, usable from server and client components alike (no 'use client' here).
import { extendTailwindMerge } from 'tailwind-merge';

// Later classes win over earlier ones of the same kind (e.g. a caller's w-48 over a field's w-full).
const merge = extendTailwindMerge({ extend: { theme: { shadow: ['card', 'pop'] } } });
export const cn = (...parts: (string | false | null | undefined)[]) => merge(parts.filter(Boolean).join(' '));

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ' +
  'disabled:pointer-events-none disabled:opacity-50';
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-[#45bdf7] active:bg-[#34b2ef]',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2 active:bg-bg',
  ghost: 'text-text-2 hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger text-white hover:bg-[#a11818]',
  link: 'text-accent-strong underline-offset-2 hover:underline px-0',
};
const buttonSizes: Record<ButtonSize, string> = { sm: 'h-8 px-2.5 text-sm', md: 'h-9 px-3.5 text-base' };

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  return cn(buttonBase, buttonVariants[variant], variant === 'link' ? 'h-auto' : buttonSizes[size], extra);
}
