'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logoutRequest } from '@/lib/api/web-client';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      await logoutRequest().catch(() => null);
      router.replace('/login');
      router.refresh();
    })();
  }, [router]);

  return <div className="p-6 text-sm text-muted-foreground">Signing you out...</div>;
}
