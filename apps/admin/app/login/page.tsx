'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { loginRequest } from '@/lib/api/web-client';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await loginRequest(values.email, values.password);
      toast.success('Login successful');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
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
