'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { setupPasswordRequest } from '@/lib/api/web-client';

const schema = z
  .object({
    token: z.string().min(1, 'Invite token is required'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string().min(12)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get('token') ?? '';
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: tokenFromQuery, password: '', confirmPassword: '' }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await setupPasswordRequest(values.token, values.password);
      toast.success('Password set. Please login.');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setup failed');
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="token">
                Invite Token
              </label>
              <Input id="token" {...form.register('token')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                New Password
              </label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="confirm-password">
                Confirm Password
              </label>
              <Input id="confirm-password" type="password" {...form.register('confirmPassword')} />
            </div>
            <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? 'Saving...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">Loading...</main>}>
      <SetupPasswordForm />
    </Suspense>
  );
}
