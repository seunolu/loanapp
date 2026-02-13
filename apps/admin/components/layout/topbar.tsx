'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { logoutRequest } from '@/lib/api/web-client';

export function Topbar() {
  const router = useRouter();
  const { auth } = useAuth();

  const onLogout = async () => {
    try {
      await logoutRequest();
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="text-sm text-muted-foreground">{auth.role ?? 'Admin'}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {auth.email ?? 'Account'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
