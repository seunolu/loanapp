'use client';

import { useEffect } from 'react';

export function EnvRuntimeLog() {
  useEffect(() => {
    console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  }, []);

  return null;
}
