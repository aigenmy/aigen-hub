'use client';
// Buttons, fields, badges, cards and small building blocks. Plain Tailwind on the tokens in tokens.css.
import { Checkbox as RCheckbox, Switch as RSwitch, Tooltip as RTooltip, Popover as RPopover } from 'radix-ui';
import { Check, CircleHelp, Loader2 } from 'lucide-react';
import * as React from 'react';
import { buttonClass, cn, type ButtonSize, type ButtonVariant } from './styles';


// ---------- Tooltip (every icon-only control has one; 400 ms delay) ----------
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
    </RTooltip.Provider>
  );
}

export function Tooltip({ label, children, side = 'top' }: { label: React.ReactNode; children: React.ReactElement; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-text px-2 py-1 text-xs text-white shadow-pop"
        >
          {label}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

// ---------- Button ----------
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }
>(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: ButtonVariant; size?: ButtonSize }
>(function IconButton({ label, variant = 'ghost', size = 'md', className, children, ...rest }, ref) {
  return (
    <Tooltip label={label}>
      <button
        ref={ref}
        aria-label={label}
        className={buttonClass(variant, size, cn(size === 'sm' ? 'w-8 px-0' : 'w-9 px-0', className))}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
});

// ---------- Fields ----------
const fieldBase =
  'w-full rounded-md border border-border bg-surface px-3 text-base text-text placeholder:text-text-3 ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent disabled:bg-surface-2 disabled:text-text-2 ' +
  'aria-[invalid=true]:border-danger';

export function Label({ className, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-sm font-medium text-text', className)} {...rest} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, 'h-9', className)} {...rest} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, 'min-h-20 py-2 [field-sizing:content]', className)} {...rest} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, 'h-9 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-text-2">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  id,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  required,
  children,
  className,
}: {
  id: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <RCheckbox.Root
        id={id}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        required={required}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-surface data-[state=checked]:border-accent-strong data-[state=checked]:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <RCheckbox.Indicator>
          <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      {children ? (
        <label htmlFor={id} className="text-sm leading-5 text-text">
          {children}
        </label>
      ) : null}
    </div>
  );
}

/** Switch with a visible on/off word next to it (spec §3). */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  onLabel,
  offLabel,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  onLabel: string;
  offLabel: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <RSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="relative h-5 w-9 shrink-0 rounded-full bg-border-strong transition-colors data-[state=checked]:bg-accent-strong disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <RSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </RSwitch.Root>
      <span className={cn('text-sm', checked ? 'text-text' : 'text-text-2')}>{checked ? onLabel : offLabel}</span>
    </span>
  );
}

// ---------- Display ----------
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-2 border-border',
  accent: 'bg-accent-tint text-accent-strong border-[#c6ebff]',
  success: 'bg-success-tint text-success border-[#c7ecd6]',
  warning: 'bg-warning-tint text-warning border-[#f7dfb5]',
  danger: 'bg-danger-tint text-danger border-[#f5caca]',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-md font-semibold text-text">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-text-2">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Avatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter((p) => /^\p{L}/u.test(p))
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ width: size, height: size, background: `hsl(${hue} 70% 93%)`, color: `hsl(${hue} 45% 32%)` }}
    >
      {initials}
    </span>
  );
}

export function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-accent-tint text-accent-strong">{icon}</div>
      <p className="max-w-sm text-sm text-text-2">{text}</p>
      {action}
    </div>
  );
}

export function KpiTile({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm text-text-2">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-text">{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-2">{hint}</div> : null}
    </Card>
  );
}

/** The red box for every legal / privacy warning (spec §8.8). With `confirm`, a required tick box sits under the text. */
export function WarningBox({
  title,
  children,
  confirm,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  confirm?: { id: string; name?: string; label: React.ReactNode; checked?: boolean; onCheckedChange?: (v: boolean) => void };
}) {
  return (
    <div role="note" className="rounded-md border border-[#f5caca] bg-danger-tint px-3 py-2.5 text-sm text-[#7f1414]">
      <p className="font-semibold text-danger">{title}</p>
      <div className="mt-1 leading-5">{children}</div>
      {confirm ? (
        <Checkbox
          id={confirm.id}
          name={confirm.name}
          checked={confirm.checked}
          onCheckedChange={confirm.onCheckedChange}
          required
          className="mt-2"
        >
          <span className="font-medium text-[#7f1414]">{confirm.label}</span>
        </Checkbox>
      ) : null}
    </div>
  );
}

/** The "?" that opens a one-paragraph explanation (spec §3). */
export function HelpTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RPopover.Root>
      <Tooltip label={label}>
        <RPopover.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-5 items-center justify-center rounded-full text-text-3 hover:text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CircleHelp className="size-4" aria-hidden />
          </button>
        </RPopover.Trigger>
      </Tooltip>
      <RPopover.Portal>
        <RPopover.Content
          sideOffset={6}
          className="z-50 max-w-72 rounded-md border border-border bg-surface p-3 text-sm leading-5 text-text shadow-pop"
        >
          {children}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin text-text-2', className)} aria-hidden />;
}

// ---------- Table ----------
export function Table({ className, ...rest }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-base', className)} {...rest} />
    </div>
  );
}
export function TH({ className, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('sticky top-0 border-b border-border bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-2', className)}
      {...rest}
    />
  );
}
export function TD({ className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border px-3 py-2.5 align-middle', className)} {...rest} />;
}
