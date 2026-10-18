'use client';
import { Button, ConfirmDialog, toast } from '@hub/ui';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { publishLegalAction } from '@/app/actions/console';
import { useErrorText } from '@/components/forms';

export function PublishButton({ kind, title, version, disabled }: { kind: string; title: string; version: string; disabled: boolean }) {
  const t = useTranslations('console.legal');
  const tc = useTranslations('common');
  const errorText = useErrorText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  return (
    <>
      <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        {t('publish')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="primary"
        title={t('publishTitle', { title, version })}
        description={t('publishText')}
        confirmLabel={t('publish')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        pending={busy}
        onConfirm={() =>
          start(async () => {
            const r = await publishLegalAction(kind);
            setOpen(false);
            if (r.ok) {
              toast.success(t('publishedOk'));
              router.refresh();
            } else toast.error(errorText(r.error));
          })
        }
      />
    </>
  );
}
