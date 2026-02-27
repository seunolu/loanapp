import * as React from 'react';
import { showToast } from '../ui/feedback/toast-store';

type ScreenCaptureModule = {
  addScreenshotListener: (listener: () => void) => { remove: () => void };
  preventScreenCaptureAsync?: (key?: string) => Promise<void>;
  allowScreenCaptureAsync?: (key?: string) => Promise<void>;
};

function getScreenCaptureModule(): ScreenCaptureModule | null {
  try {
    return require('expo-screen-capture') as ScreenCaptureModule;
  } catch {
    return null;
  }
}

export async function enableScreenCaptureProtection(key: string): Promise<void> {
  const module = getScreenCaptureModule();
  if (!module?.preventScreenCaptureAsync) {
    return;
  }
  await module.preventScreenCaptureAsync(key);
}

export async function disableScreenCaptureProtection(key: string): Promise<void> {
  const module = getScreenCaptureModule();
  if (!module?.allowScreenCaptureAsync) {
    return;
  }
  await module.allowScreenCaptureAsync(key);
}

export function useSensitiveScreenCaptureGuard(screenName: string): void {
  React.useEffect(() => {
    const module = getScreenCaptureModule();
    if (!module) {
      return;
    }

    const token = `loanapp-sensitive-${screenName}`;
    void enableScreenCaptureProtection(token);
    const subscription = module.addScreenshotListener(() => {
      showToast({
        type: 'error',
        title: 'Screen capture detected',
        message: 'For your security, avoid sharing sensitive account information.'
      });
    });

    return () => {
      subscription.remove();
      void disableScreenCaptureProtection(token);
    };
  }, [screenName]);
}

