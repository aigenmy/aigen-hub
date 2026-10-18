'use client';
// In-app dialogs (never browser alert/confirm) and toasts.
import { Dialog as RDialog } from 'radix-ui';
import { X } from 'lucide-react';
import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';
import { Button, Input } from './primitives';
import { cn } from './styles';

export { toast };

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={5000}
      toastOptions={{
        classNames: {
          toast: 'rounded-md border border-border bg-surface text-text shadow-pop text-base',
          description: 'text-text-2',
        },
      }}
    />
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel,
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel: string;
  wide?: boolean;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(15_23_42/0.35)] backdrop-blur-[2px]" />
        <RDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'rounded-lg border border-border bg-surface shadow-pop focus:outline-none',
            wide ? 'max-w-2xl' : 'max-w-md',
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <RDialog.Title className="text-lg font-semibold text-text">{title}</RDialog.Title>
              {description ? (
                <RDialog.Description className="mt-1 text-sm text-text-2">{description}</RDialog.Description>
              ) : (
                <RDialog.Description className="sr-only">{title}</RDialog.Description>
              )}
            </div>
            <RDialog.Close asChild>
              <button
                aria-label={closeLabel}
                className="inline-flex size-8 items-center justify-center rounded-md text-text-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="size-4" aria-hidden />
              </button>
            </RDialog.Close>
          </div>
          {children ? <div className="space-y-4 px-5 py-4">{children}</div> : null}
          {footer ? <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/** Confirmation for a destructive action. With `typeToConfirm`, the button unlocks only when the object's name is typed. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onConfirm,
  pending,
  typeToConfirm,
  typePrompt,
  tone = 'danger',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  typeToConfirm?: string;
  typePrompt?: string;
  tone?: 'danger' | 'primary';
}) {
  const [typed, setTyped] = React.useState('');
  React.useEffect(() => {
    if (!open) setTyped('');
  }, [open]);
  const locked = typeToConfirm ? typed.trim() !== typeToConfirm.trim() : false;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      closeLabel={closeLabel}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={locked} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeToConfirm ? (
        <div className="space-y-1">
          <p className="text-sm text-text-2">{typePrompt}</p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={typePrompt} autoFocus />
        </div>
      ) : null}
    </Dialog>
  );
}
