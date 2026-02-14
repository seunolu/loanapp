'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantShell } from '@/src/components/tenant-shell';
import { requestOtp, verifyOtp } from '@/src/lib/api';

const requestSchema = z.object({
  phone: z.string().min(8)
});

const verifySchema = z.object({
  phone: z.string().min(8),
  otpRef: z.string().min(1),
  otp: z.string().length(6)
});

type RequestForm = z.infer<typeof requestSchema>;
type VerifyForm = z.infer<typeof verifySchema>;

export default function LoginPage({ params }: { params: { slug: string } }) {
  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { phone: '' }
  });
  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { phone: '', otpRef: '', otp: '' }
  });

  const onRequest = requestForm.handleSubmit(async (values) => {
    try {
      const response = await requestOtp(params.slug, values.phone);
      verifyForm.setValue('phone', values.phone);
      verifyForm.setValue('otpRef', response.otpRef);
      toast.success('OTP requested.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request OTP.');
    }
  });

  const onVerify = verifyForm.handleSubmit(async (values) => {
    try {
      await verifyOtp(params.slug, {
        phone: values.phone,
        otpRef: values.otpRef,
        otp: values.otp
      });
      toast.success('Login successful.');
      window.location.href = `/l/${params.slug}/profile`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'OTP verification failed.');
    }
  });

  return (
    <TenantShell slug={params.slug} title="Login">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request OTP</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onRequest}>
              <Input placeholder="+2348012345678" {...requestForm.register('phone')} />
              <Button className="w-full" type="submit">
                Request OTP
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verify OTP</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onVerify}>
              <Input placeholder="Phone" {...verifyForm.register('phone')} />
              <Input placeholder="OTP Ref" {...verifyForm.register('otpRef')} />
              <Input placeholder="123456" {...verifyForm.register('otp')} />
              <Button className="w-full" type="submit">
                Verify & Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </TenantShell>
  );
}
