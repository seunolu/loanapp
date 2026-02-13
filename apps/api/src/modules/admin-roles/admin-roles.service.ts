import { ForbiddenException, Injectable, Scope } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { RbacService } from '../../common/rbac/rbac.service';
import type { AdminRoleResponseDto } from './dto/admin-role-response.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminRolesService {
  constructor(
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService
  ) {}

  async listRoles(admin: AdminPrincipal): Promise<AdminRoleResponseDto[]> {
    const roles = await this.rbacService.listRolesForLender(admin.lenderId);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((permission) => ({
        code: permission.permission.code,
        name: permission.permission.name
      }))
    }));
  }

  async assignRole(admin: AdminPrincipal, targetAdminUserId: string, roleId: string): Promise<{ ok: true }> {
    const isOwner = admin.role === 'OWNER';
    const canEditSettings = await this.rbacService.hasPermission(admin.adminId, admin.lenderId, 'LENDER_SETTINGS_EDIT');

    if (!isOwner && !canEditSettings) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Owner role or LENDER_SETTINGS_EDIT permission is required.',
        details: null
      });
    }

    const assignment = await this.rbacService.assignRole(admin, targetAdminUserId, roleId);

    await this.auditService.write({
      event: 'ADMIN_ROLE_ASSIGNED',
      action: 'ADMIN_ROLE_ASSIGNED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      lenderId: admin.lenderId,
      entityType: 'ADMIN_USER',
      entityId: assignment.targetAdminUserId,
      metadata: {
        roleName: assignment.roleName,
        roleAssignmentId: assignment.assignmentId
      }
    });

    return { ok: true };
  }
}
