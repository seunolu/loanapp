import { ConflictException, ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RbacService } from '../../common/rbac/rbac.service';
import type { CreatePlatformLenderDto } from './dto/create-platform-lender.dto';
import type { PlatformLenderDetailsResponseDto } from './dto/platform-lender-details-response.dto';
import type { PlatformOnboardLenderResponseDto } from './dto/platform-onboard-lender-response.dto';

@Injectable({ scope: Scope.REQUEST })
export class PlatformOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<Env, true>,
    private readonly rbacService: RbacService
  ) {}

  async onboardLender(
    principal: AdminPrincipal,
    input: CreatePlatformLenderDto
  ): Promise<PlatformOnboardLenderResponseDto> {
    await this.assertPlatformSuperAdmin(principal);

    const inviteToken = randomBytes(24).toString('hex');
    const tokenHash = createHmac('sha256', this.configService.get('ADMIN_INVITE_TOKEN_HASH_SECRET', { infer: true }))
      .update(inviteToken)
      .digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const lender = await tx.lender.create({
          data: {
            name: input.name.trim(),
            slug: input.slug.trim(),
            status: 'ACTIVE',
            onboardingStatus: 'COMPLETED',
            onboardedAt: new Date(),
            settings: input.settings ? (input.settings as Prisma.InputJsonValue) : Prisma.JsonNull
          }
        });

        const owner = await tx.adminUser.create({
          data: {
            lenderId: lender.id,
            email: input.ownerEmail.trim().toLowerCase(),
            passwordHash: null,
            role: input.ownerRole ?? 'OWNER',
            status: 'ACTIVE'
          }
        });

        await tx.adminInviteToken.create({
          data: {
            adminUserId: owner.id,
            tokenHash,
            expiresAt: inviteExpiresAt
          }
        });

        return { lender, owner };
      });

      await this.rbacService.ensureDefaultRolesForLender(result.lender.id);
      const ownerRole = await this.prisma.role.findUnique({
        where: {
          lenderId_name: {
            lenderId: result.lender.id,
            name: result.owner.role === 'SUPER_ADMIN' ? 'OWNER' : result.owner.role
          }
        },
        select: { id: true }
      });
      if (ownerRole) {
        await this.prisma.adminRoleAssignment.upsert({
          where: { adminUserId: result.owner.id },
          update: {
            lenderId: result.lender.id,
            roleId: ownerRole.id,
            assignedById: principal.adminId
          },
          create: {
            lenderId: result.lender.id,
            adminUserId: result.owner.id,
            roleId: ownerRole.id,
            assignedById: principal.adminId
          }
        });
      }

      await this.auditService.write({
        event: 'LENDER_ONBOARDED',
        action: 'LENDER_ONBOARDED',
        actorType: 'ADMIN',
        actorId: principal.adminId,
        lenderId: result.lender.id,
        entityType: 'LENDER',
        entityId: result.lender.id,
        metadata: {
          lenderId: result.lender.id,
          slug: result.lender.slug
        }
      });

      await this.auditService.write({
        event: 'LENDER_OWNER_CREATED',
        action: 'LENDER_OWNER_CREATED',
        actorType: 'ADMIN',
        actorId: principal.adminId,
        lenderId: result.lender.id,
        entityType: 'ADMIN_USER',
        entityId: result.owner.id,
        metadata: {
          lenderId: result.lender.id,
          ownerAdminId: result.owner.id
        }
      });

      return {
        lenderId: result.lender.id,
        slug: result.lender.slug,
        onboardingStatus: 'COMPLETED',
        ownerAdmin: {
          id: result.owner.id,
          email: result.owner.email,
          role: result.owner.role as 'OWNER' | 'SUPER_ADMIN'
        },
        inviteToken,
        inviteLink: `/invite/accept?token=${inviteToken}`,
        inviteExpiresAt: inviteExpiresAt.toISOString()
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Lender slug or owner email already exists.',
          details: null
        });
      }
      throw error;
    }
  }

  async getLender(principal: AdminPrincipal, lenderId: string): Promise<PlatformLenderDetailsResponseDto> {
    await this.assertPlatformSuperAdmin(principal);

    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      include: {
        admins: {
          where: { role: { in: ['OWNER', 'SUPER_ADMIN'] } },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    });

    if (!lender) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Lender not found.',
        details: null
      });
    }

    const owner = lender.admins[0] ?? null;
    return {
      id: lender.id,
      name: lender.name,
      slug: lender.slug,
      onboardingStatus: lender.onboardingStatus,
      onboardedAt: lender.onboardedAt ? lender.onboardedAt.toISOString() : null,
      ownerAdmin: owner
        ? {
            id: owner.id,
            email: owner.email,
            role: owner.role as 'OWNER' | 'SUPER_ADMIN'
          }
        : null
    };
  }

  private async assertPlatformSuperAdmin(principal: AdminPrincipal): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: principal.adminId },
      select: { role: true, lenderId: true }
    });

    if (!admin || admin.role !== 'PLATFORM_SUPER_ADMIN' || admin.lenderId !== null) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Platform super admin access required.',
        details: null
      });
    }
  }
}
