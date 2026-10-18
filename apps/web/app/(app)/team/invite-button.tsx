'use client';
import { Button, Dialog } from '@hub/ui';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { InviteForm } from '@/components/invite-form';

export function InviteButton({ allowAdmin }: { allowAdmin: boolean }) {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        {t('invite.button')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t('invite.title')} closeLabel={tc('close')} wide>
        {open ? (
          <InviteForm
            allowAdmin={allowAdmin}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        ) : null}
      </Dialog>
    </>
  );
}
