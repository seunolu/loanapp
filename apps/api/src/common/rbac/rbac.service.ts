import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AdminPrincipal } from '../auth/admin-principal';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_ROLE_PERMISSION_MAP, PERMISSIONS, type PermissionCode } from './permissions.constants';

const PERMISSION_CACHE_TTL_SEC = 300;

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  async listRolesForLender(lenderId: string) {
    return this.prisma.role.findMany({
      where: { lenderId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getAdminPermissions(adminId: string, lenderId: string): Promise<PermissionCode[]> {
    const cacheKey = this.getPermissionCacheKey(adminId, lenderId);
    const cached = await this.redisService.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PermissionCode[];
    }

    const admin = await this.prisma.adminUser.findFirst({
      where: { id: adminId, lenderId },
      select: { id: true, role: true }
    });

    if (!admin) {
      return [];
    }

    const assignment = await this.prisma.adminRoleAssignment.findUnique({
      where: { adminUserId: adminId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    let permissions: PermissionCode[];
    if (assignment?.role.lenderId === lenderId) {
      permissions = assignment.role.permissions
        .map((item) => item.permission.code)
        .filter((code): code is PermissionCode => Boolean(code));
    } else {
      permissions = this.getLegacyRolePermissions(admin.role);
    }

    await this.redisService.getClient().set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSION_CACHE_TTL_SEC);
    return permissions;
  }

  async hasPermission(adminId: string, lenderId: string, permission: PermissionCode): Promise<boolean> {
    const permissions = await this.getAdminPermissions(adminId, lenderId);
    return permissions.includes(permission);
  }

  async assignRole(
    actingAdmin: AdminPrincipal,
    targetAdminUserId: string,
    roleId: string
  ): Promise<{ assignmentId: string; roleName: string; targetAdminUserId: string }> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, lenderId: actingAdmin.lenderId },
      select: { id: true, name: true, lenderId: true }
    });

    if (!role) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role not found for this lender.',
        details: null
      });
    }

    const targetAdmin = await this.prisma.adminUser.findFirst({
      where: { id: targetAdminUserId, lenderId: actingAdmin.lenderId },
      select: { id: true }
    });

    if (!targetAdmin) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Target admin user is outside current tenant.',
        details: null
      });
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.adminRoleAssignment.upsert({
        where: { adminUserId: targetAdmin.id },
        update: {
          lenderId: actingAdmin.lenderId,
          roleId: role.id,
          assignedById: actingAdmin.adminId
        },
        create: {
          lenderId: actingAdmin.lenderId,
          adminUserId: targetAdmin.id,
          roleId: role.id,
          assignedById: actingAdmin.adminId
        }
      });

      if (role.name === 'OWNER' || role.name === 'OPS' || role.name === 'FINANCE' || role.name === 'VIEWER') {
        await tx.adminUser.update({
          where: { id: targetAdmin.id },
          data: {
            role: role.name
          }
        });
      }

      return saved;
    });

    await this.invalidatePermissions(targetAdmin.id, actingAdmin.lenderId);

    return {
      assignmentId: assignment.id,
      roleName: role.name,
      targetAdminUserId: targetAdmin.id
    };
  }

  async ensureDefaultRolesForLender(lenderId: string): Promise<void> {
    await this.ensurePermissionsExist();

    const permissions = await this.prisma.permission.findMany({
      select: { id: true, code: true }
    });
    const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission.id]));

    for (const roleName of ['OWNER', 'OPS', 'FINANCE', 'VIEWER'] as const) {
      const role = await this.prisma.role.upsert({
        where: {
          lenderId_name: {
            lenderId,
            name: roleName
          }
        },
        update: {
          isSystem: true
        },
        create: {
          lenderId,
          name: roleName,
          isSystem: true,
          description: `${roleName} default role`
        }
      });

      for (const permissionCode of DEFAULT_ROLE_PERMISSION_MAP[roleName]) {
        const permissionId = permissionByCode.get(permissionCode);
        if (!permissionId) {
          continue;
        }
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId
          }
        });
      }
    }
  }

  async ensurePermissionsExist(): Promise<void> {
    for (const code of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: code,
          description: code
        }
      });
    }
  }

  async invalidatePermissions(adminId: string, lenderId: string): Promise<void> {
    await this.redisService.delete(this.getPermissionCacheKey(adminId, lenderId));
  }

  private getPermissionCacheKey(adminId: string, lenderId: string): string {
    return `rbac:admin-permissions:${lenderId}:${adminId}`;
  }

  private getLegacyRolePermissions(role: string): PermissionCode[] {
    if (role === 'OWNER' || role === 'SUPER_ADMIN') {
      return [...DEFAULT_ROLE_PERMISSION_MAP.OWNER];
    }
    if (role === 'OPS') {
      return [...DEFAULT_ROLE_PERMISSION_MAP.OPS];
    }
    if (role === 'FINANCE') {
      return [...DEFAULT_ROLE_PERMISSION_MAP.FINANCE];
    }
    return [...DEFAULT_ROLE_PERMISSION_MAP.VIEWER];
  }
}
