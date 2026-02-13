import { createHmac, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Scope
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../../common/pagination/cursor-pagination';
import { RbacService } from '../../common/rbac/rbac.service';
import type { CreateAdminUserDto } from './dto/create-admin-user.dto';
import type {
  AdminUserItemDto,
  AdminUserListResponseDto,
  CreateAdminUserResponseDto
} from './dto/admin-user-response.dto';
import type { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import type { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService
  ) {}

  async createAdminUser(admin: AdminPrincipal, input: CreateAdminUserDto): Promise<CreateAdminUserResponseDto> {
    const email = input.email.trim().toLowerCase();
    const role = await this.prisma.role.findFirst({
      where: {
        id: input.roleId,
        lenderId: admin.lenderId
      }
    });

    if (!role) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid roleId for current lender.',
        details: { field: 'roleId' }
      });
    }

    const inviteToken = randomBytes(24).toString('hex');
    const tokenHash = createHmac('sha256', this.configService.get('ADMIN_INVITE_TOKEN_HASH_SECRET', { infer: true }))
      .update(inviteToken)
      .digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const adminUser = await tx.adminUser.create({
          data: {
            lenderId: admin.lenderId,
            email,
            passwordHash: null,
            role: this.mapRoleName(role.name),
            status: 'ACTIVE'
          },
          include: {
            roleAssignment: {
              include: {
                role: true
              }
            }
          }
        });

        await tx.adminRoleAssignment.upsert({
          where: { adminUserId: adminUser.id },
          update: {
            lenderId: admin.lenderId,
            roleId: role.id,
            assignedById: admin.adminId
          },
          create: {
            lenderId: admin.lenderId,
            adminUserId: adminUser.id,
            roleId: role.id,
            assignedById: admin.adminId
          }
        });

        await tx.adminInviteToken.create({
          data: {
            adminUserId: adminUser.id,
            tokenHash,
            expiresAt: inviteExpiresAt
          }
        });

        return adminUser;
      });

      await this.rbacService.invalidatePermissions(created.id, admin.lenderId);

      await this.auditService.write({
        event: 'ADMIN_USER_CREATED',
        action: 'ADMIN_USER_CREATED',
        actorType: 'ADMIN',
        actorId: admin.adminId,
        lenderId: admin.lenderId,
        entityType: 'ADMIN_USER',
        entityId: created.id,
        metadata: { email, roleId: role.id }
      });

      const details = await this.getAdminUser(admin, created.id);

      return {
        admin: details,
        inviteToken,
        inviteLink: `/invite/accept?token=${inviteToken}`,
        inviteExpiresAt: inviteExpiresAt.toISOString()
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Admin user already exists for this lender.',
          details: { field: 'email' }
        });
      }
      throw error;
    }
  }

  async listAdminUsers(admin: AdminPrincipal, query: ListAdminUsersQueryDto): Promise<AdminUserListResponseDto> {
    const take = query.limit ?? 50;
    const search = query.query?.trim();
    const cursor = decodeCursor(query.cursor);
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;
    const whereAnd: Prisma.AdminUserWhereInput[] = [{ lenderId: admin.lenderId }];

    if (search) {
      whereAnd.push({
        OR: [{ email: { contains: search, mode: 'insensitive' } }]
      });
    }
    if (fromDate || toDate) {
      whereAnd.push({
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {})
        }
      });
    }
    const cursorWhere = buildDescCreatedAtCursorWhere(cursor);
    if (cursorWhere) {
      whereAnd.push(cursorWhere);
    }

    const rows = await this.prisma.adminUser.findMany({
      where: { AND: whereAnd },
      include: {
        roleAssignment: {
          include: {
            role: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;

    return {
      items: items.map((item) => this.toItem(item)),
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null
    };
  }

  async getAdminUser(admin: AdminPrincipal, adminUserId: string): Promise<AdminUserItemDto> {
    const adminUser = await this.prisma.adminUser.findFirst({
      where: {
        id: adminUserId,
        lenderId: admin.lenderId
      },
      include: {
        roleAssignment: {
          include: {
            role: true
          }
        }
      }
    });

    if (!adminUser) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Admin user not found.',
        details: null
      });
    }

    return this.toItem(adminUser);
  }

  async updateStatus(
    admin: AdminPrincipal,
    adminUserId: string,
    input: UpdateAdminUserStatusDto
  ): Promise<AdminUserItemDto> {
    if (admin.adminId === adminUserId && input.status === 'SUSPENDED') {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'You cannot suspend your own account.',
        details: null
      });
    }

    const adminUser = await this.prisma.adminUser.findFirst({
      where: {
        id: adminUserId,
        lenderId: admin.lenderId
      }
    });

    if (!adminUser) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Admin user not found.',
        details: null
      });
    }

    const updated = await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { status: input.status },
      include: {
        roleAssignment: {
          include: {
            role: true
          }
        }
      }
    });

    await this.auditService.write({
      event: 'ADMIN_USER_STATUS_CHANGED',
      action: 'ADMIN_USER_STATUS_CHANGED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      lenderId: admin.lenderId,
      entityType: 'ADMIN_USER',
      entityId: adminUser.id,
      metadata: {
        previousStatus: adminUser.status,
        status: updated.status
      }
    });

    return this.toItem(updated);
  }

  async resetInvite(admin: AdminPrincipal, adminUserId: string): Promise<{ inviteToken: string; inviteExpiresAt: string }> {
    const adminUser = await this.prisma.adminUser.findFirst({
      where: {
        id: adminUserId,
        lenderId: admin.lenderId
      }
    });

    if (!adminUser) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Admin user not found.',
        details: null
      });
    }

    const inviteToken = randomBytes(24).toString('hex');
    const tokenHash = createHmac('sha256', this.configService.get('ADMIN_INVITE_TOKEN_HASH_SECRET', { infer: true }))
      .update(inviteToken)
      .digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.adminInviteToken.create({
      data: {
        adminUserId: adminUser.id,
        tokenHash,
        expiresAt: inviteExpiresAt
      }
    });

    await this.auditService.write({
      event: 'ADMIN_USER_RESET_ISSUED',
      action: 'ADMIN_USER_RESET_ISSUED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      lenderId: admin.lenderId,
      entityType: 'ADMIN_USER',
      entityId: adminUser.id,
      metadata: {
        inviteExpiresAt: inviteExpiresAt.toISOString()
      }
    });

    return {
      inviteToken,
      inviteExpiresAt: inviteExpiresAt.toISOString()
    };
  }

  private mapRoleName(name: string): 'OWNER' | 'SUPER_ADMIN' | 'OPS' | 'FINANCE' | 'VIEWER' {
    if (name === 'OWNER' || name === 'OPS' || name === 'FINANCE' || name === 'VIEWER') {
      return name;
    }
    return 'SUPER_ADMIN';
  }

  private toItem(item: {
    id: string;
    lenderId: string | null;
    email: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    lastUserAgent: string | null;
    roleAssignment?: { roleId: string; role?: { name: string } | null } | null;
  }): AdminUserItemDto {
    return {
      id: item.id,
      lenderId: item.lenderId,
      email: item.email,
      role: item.role,
      assignedRoleId: item.roleAssignment?.roleId ?? null,
      assignedRoleName: item.roleAssignment?.role?.name ?? null,
      status: item.status,
      lastLoginAt: item.lastLoginAt ? item.lastLoginAt.toISOString() : null,
      lastLoginIp: item.lastLoginIp,
      lastUserAgent: item.lastUserAgent,
      createdAt: item.createdAt.toISOString()
    };
  }
}
