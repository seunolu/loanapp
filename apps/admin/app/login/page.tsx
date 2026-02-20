'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminLogin } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

const schema = z.object({
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
  email: z.string().email(),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setToken, token, hydrated } = useAuth();
  const { clearTenant } = useTenant();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: 'demo', email: '', password: '' }
  });

  useEffect(() => {
    if (hydrated && token) {
      router.replace('/dashboard');
    }
  }, [hydrated, router, token]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = await adminLogin(values);
      setToken(payload.accessToken);
      clearTenant();
      toast.success('Login successful');
      router.replace('/select-tenant');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  });

  if (hydrated && token) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="tenantSlug">
                Tenant Slug
              </label>
              <Input id="tenantSlug" {...form.register('tenantSlug')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>
            <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
