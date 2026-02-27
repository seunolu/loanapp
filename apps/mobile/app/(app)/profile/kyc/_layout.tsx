import { Slot } from 'expo-router';
import { useSensitiveScreenCaptureGuard } from '../../../../src/security/screen-capture';

export default function KycLayout() {
  useSensitiveScreenCaptureGuard('kyc');
  return <Slot />;
}

