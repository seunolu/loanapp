import { SetMetadata } from '@nestjs/common';

export const ADMIN_CONFIRMATION_META = 'admin_confirmation_meta';

export type AdminConfirmationMeta = {
  purpose: string;
  resourceParam?: string;
};

export const RequireAdminConfirmation = (meta: AdminConfirmationMeta) =>
  SetMetadata(ADMIN_CONFIRMATION_META, meta);

