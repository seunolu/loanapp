import { z } from 'zod';

const tenantAdminRoleSchema = z.enum([
  'CREDIT_OFFICER',
  'RISK_MANAGER',
  'OPS',
  'COLLECTIONS',
  'SYSTEM',
  'SUPER_ADMIN',
  'TENANT_ADMIN'
]);

export const listTenantAdminUsersQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  role: tenantAdminRoleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
});

export const createTenantAdminUserSchema = z.object({
  email: z.string().trim().email(),
  role: tenantAdminRoleSchema,
  password: z.string().min(12).max(128).optional()
});

export const updateTenantAdminUserSchema = z
  .object({
    role: tenantAdminRoleSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: 'Provide at least one update field (role or isActive).'
  });

export type ListTenantAdminUsersQueryDto = z.infer<typeof listTenantAdminUsersQuerySchema>;
export type CreateTenantAdminUserDto = z.infer<typeof createTenantAdminUserSchema>;
export type UpdateTenantAdminUserDto = z.infer<typeof updateTenantAdminUserSchema>;
