import { redirect } from 'next/navigation';
import { getClaims } from '@/lib/session';

export default async function Root() {
  redirect((await getClaims()) ? '/home' : '/login');
}
