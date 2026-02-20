import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import type { TenantAdminRole, TenantAdminUser } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuditService } from '../../common/audit/audit.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import type {
  CreateTenantAdminUserDto,
  ListTenantAdminUsersQueryDto,
  UpdateTenantAdminUserDto
} from './dto/tenant-admin-users.dto';

type TenantAdminUserItem = {
  id: string;
  tenantId: string;
  email: string;
  role: TenantAdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable({ scope: Scope.REQUEST })
export class TenantAdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(principal: TenantAdminPrincipal, query: ListTenantAdminUsersQueryDto): Promise<TenantAdminUserItem[]> {
    this.assertCanView(principal.role);

    const rows = await this.prisma.tenantAdminUser.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.query
          ? {
              email: {
                contains: query.query,
                mode: 'insensitive'
              }
            }
          : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {})
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    return rows.map((row) => this.toItem(row));
  }

  async create(principal: TenantAdminPrincipal, input: CreateTenantAdminUserDto): Promise<{
    user: TenantAdminUserItem;
    temporaryPassword: string | null;
  }> {
    this.assertCanManage(principal.role);

    const email = input.email.trim().toLowerCase();
    const password = input.password?.trim() || this.generateTemporaryPassword();
    const passwordHash = await hash(password, 10);

    const existing = await this.prisma.tenantAdminUser.findUnique({
      where: {
        tenantId_email: {
          tenantId: principal.tenantId,
          email
        }
      },
      select: { id: true }
    });

    if (existing) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'An admin user with this email already exists for this tenant.',
        details: { field: 'email' }
      });
    }

    const created = await this.prisma.tenantAdminUser.create({
      data: {
        tenantId: principal.tenantId,
        email,
        role: input.role,
        passwordHash,
        isActive: true
      }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'TENANT_ADMIN_USER_CREATED',
      entity: 'TENANT_ADMIN_USER',
      entityId: created.id,
      metadata: {
        email: created.email,
        role: created.role,
        generatedPassword: !input.password
      }
    });

    return {
      user: this.toItem(created),
      temporaryPassword: input.password ? null : password
    };
  }

  async update(
    principal: TenantAdminPrincipal,
    id: string,
    input: UpdateTenantAdminUserDto
  ): Promise<TenantAdminUserItem> {
    this.assertCanManage(principal.role);

    const existing = await this.prisma.tenantAdminUser.findFirst({
      where: {
        id,
        tenantId: principal.tenantId
      }
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Tenant admin user not found.',
        details: null
      });
    }

    if (!input.isActive && existing.id === principal.adminId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'You cannot suspend your own account.',
        details: null
      });
    }

    const updated = await this.prisma.tenantAdminUser.update({
      where: { id: existing.id },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'TENANT_ADMIN_USER_UPDATED',
      entity: 'TENANT_ADMIN_USER',
      entityId: updated.id,
      metadata: {
        before: {
          role: existing.role,
          isActive: existing.isActive
        },
        after: {
          role: updated.role,
          isActive: updated.isActive
        }
      }
    });

    return this.toItem(updated);
  }

  async resetPassword(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<{ user: TenantAdminUserItem; temporaryPassword: string }> {
    this.assertCanManage(principal.role);

    const existing = await this.prisma.tenantAdminUser.findFirst({
      where: {
        id,
        tenantId: principal.tenantId
      }
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Tenant admin user not found.',
        details: null
      });
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 10);
    const updated = await this.prisma.tenantAdminUser.update({
      where: { id: existing.id },
      data: { passwordHash }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'TENANT_ADMIN_USER_PASSWORD_RESET',
      entity: 'TENANT_ADMIN_USER',
      entityId: updated.id,
      metadata: { email: updated.email }
    });

    return {
      user: this.toItem(updated),
      temporaryPassword
    };
  }

  private assertCanView(role: TenantAdminPrincipal['role']): void {
    if (role === 'SUPER_ADMIN' || role === 'SYSTEM' || role === 'TENANT_ADMIN' || role === 'OPS') {
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Role ${role} cannot view tenant admin users.`,
      details: null
    });
  }

  private assertCanManage(role: TenantAdminPrincipal['role']): void {
    if (role === 'SUPER_ADMIN' || role === 'SYSTEM' || role === 'TENANT_ADMIN') {
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Role ${role} cannot manage tenant admin users.`,
      details: null
    });
  }

  private toItem(row: TenantAdminUser): TenantAdminUserItem {
    return {
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private generateTemporaryPassword(): string {
    return `Tmp!${randomBytes(8).toString('base64url')}A1`;
  }
}
