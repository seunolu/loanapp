import * as React from 'react';
import { router } from 'expo-router';
import { Button, ModalSheet, Text } from '../../ui';

type KycActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
};

export function KycActionSheet({
  visible,
  onClose,
  title = 'Complete KYC to continue',
  message = 'You can view this screen, but this action needs a completed KYC profile before it can continue.'
}: KycActionSheetProps): React.JSX.Element {
  return (
    <ModalSheet visible={visible} onClose={onClose} title={title}>
      <Text variant="bodyMuted">{message}</Text>
      <Button
        label="Go to KYC"
        onPress={() => {
          onClose();
          router.push('/profile/kyc' as never);
        }}
      />
      <Button label="Maybe later" variant="secondary" onPress={onClose} />
    </ModalSheet>
  );
}
