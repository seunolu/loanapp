'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantShell } from '@/src/components/tenant-shell';
import { getMe, updateProfile } from '@/src/lib/api';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  gender: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional()
});
type FormValues = z.infer<typeof schema>;

export default function ProfilePage({ params }: { params: { slug: string } }) {
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe()
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      addressLine1: '',
      city: '',
      state: ''
    }
  });

  useEffect(() => {
    if (!meQuery.data?.profile) {
      return;
    }
    form.reset({
      firstName: meQuery.data.profile.firstName,
      lastName: meQuery.data.profile.lastName,
      dateOfBirth: meQuery.data.profile.dateOfBirth,
      gender: meQuery.data.profile.gender ?? '',
      addressLine1: meQuery.data.profile.addressLine1 ?? '',
      city: meQuery.data.profile.city ?? '',
      state: meQuery.data.profile.state ?? ''
    });
  }, [meQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile(values);
      toast.success('Profile updated.');
      await meQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    }
  });

  return (
    <TenantShell slug={params.slug} title="Profile">
      {meQuery.isLoading && <p className="text-sm text-muted-foreground">Loading profile...</p>}
      {meQuery.isError && (
        <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">Unable to load profile.</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Borrower Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <Input placeholder="First name" {...form.register('firstName')} />
            <Input placeholder="Last name" {...form.register('lastName')} />
            <Input placeholder="YYYY-MM-DD" {...form.register('dateOfBirth')} />
            <Input placeholder="Gender" {...form.register('gender')} />
            <Input placeholder="Address" {...form.register('addressLine1')} />
            <Input placeholder="City" {...form.register('city')} />
            <Input placeholder="State" {...form.register('state')} />
            <Button type="submit">Save Profile</Button>
          </form>
        </CardContent>
      </Card>
    </TenantShell>
  );
}
