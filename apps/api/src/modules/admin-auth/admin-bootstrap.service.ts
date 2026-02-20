import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole, AdminStatus } from '@prisma/client';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RbacService } from '../../common/rbac/rbac.service';
import { DEFAULT_LENDER_ID, DEFAULT_LENDER_NAME, DEFAULT_LENDER_SLUG } from '../../common/tenant/tenant.constants';
import { hashPassword } from './password.util';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(ConfigService) private readonly configService: ConfigService<Env, true> | undefined,
    private readonly rbacService: RbacService
  ) {}

  async onModuleInit(): Promise<void> {
    const email = (this.configService?.get('ADMIN_BOOTSTRAP_EMAIL', { infer: true }) ?? process.env.ADMIN_BOOTSTRAP_EMAIL)
      ?.trim()
      .toLowerCase();
    const password =
      this.configService?.get('ADMIN_BOOTSTRAP_PASSWORD', { infer: true }) ?? process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const role = this.configService?.get('ADMIN_BOOTSTRAP_ROLE', { infer: true }) ?? process.env.ADMIN_BOOTSTRAP_ROLE;
    const nodeEnv = this.configService?.get('NODE_ENV', { infer: true }) ?? process.env.NODE_ENV;

    if (!email || !password) {
      return;
    }

    if (nodeEnv === 'production') {
      this.logger.warn('ADMIN_BOOTSTRAP_* is ignored in production.');
      return;
    }

    await this.prisma.lender.upsert({
      where: { id: DEFAULT_LENDER_ID },
      update: {
        name: DEFAULT_LENDER_NAME,
        slug: DEFAULT_LENDER_SLUG
      },
      create: {
        id: DEFAULT_LENDER_ID,
        name: DEFAULT_LENDER_NAME,
        slug: DEFAULT_LENDER_SLUG,
        status: 'ACTIVE'
      }
    });

    const existing = await this.prisma.adminUser.findUnique({
      where: {
        lenderId_email: {
          lenderId: DEFAULT_LENDER_ID,
          email
        }
      }
    });
    if (existing) {
      await this.rbacService.ensureDefaultRolesForLender(DEFAULT_LENDER_ID);
      return;
    }

    const adminUser = await this.prisma.adminUser.create({
      data: {
        lenderId: DEFAULT_LENDER_ID,
        email,
        passwordHash: hashPassword(password),
        role: role as AdminRole,
        status: AdminStatus.ACTIVE
      }
    });

    await this.rbacService.ensureDefaultRolesForLender(DEFAULT_LENDER_ID);
    const mappedRoleName = role === 'OPS' || role === 'FINANCE' || role === 'VIEWER' ? role : 'OWNER';
    const assignedRole = await this.prisma.role.findUnique({
      where: {
        lenderId_name: {
          lenderId: DEFAULT_LENDER_ID,
          name: mappedRoleName
        }
      },
      select: { id: true }
    });
    if (assignedRole) {
      await this.prisma.adminRoleAssignment.upsert({
        where: { adminUserId: adminUser.id },
        update: {
          lenderId: DEFAULT_LENDER_ID,
          roleId: assignedRole.id
        },
        create: {
          lenderId: DEFAULT_LENDER_ID,
          adminUserId: adminUser.id,
          roleId: assignedRole.id
        }
      });
    }
  }
}
