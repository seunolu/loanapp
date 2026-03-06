import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getOnboardingSeen } from '../src/lib/storage';
import { useAuth } from '../src/providers/auth-provider';
import { FullScreenLoader } from '../src/ui';

export default function Index() {
  const { status } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (status !== 'unauthenticated') {
      return () => {
        active = false;
      };
    }
    getOnboardingSeen()
      .then((seen) => {
        if (active) {
          setOnboardingSeen(seen);
        }
      })
      .catch(() => {
        if (active) {
          setOnboardingSeen(false);
        }
      });
    return () => {
      active = false;
    };
  }, [status]);

  if (status === 'unknown' || (status === 'unauthenticated' && onboardingSeen === null)) {
    return <FullScreenLoader message="Preparing your workspace..." />;
  }

  if (status === 'authenticated') {
    return <Redirect href={'/home' as any} />;
  }

  return <Redirect href={(onboardingSeen ? '/login' : '/onboarding') as any} />;
}