import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { RbacService } from '../../common/rbac/rbac.service';
import type { AdminMeResponseDto } from './dto/admin-me-response.dto';

@Injectable()
export class AdminMeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService
  ) {}

  async getMe(principal: AdminPrincipal): Promise<AdminMeResponseDto> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: principal.adminId },
      include: {
        lender: true,
        roleAssignment: {
          select: {
            roleId: true
          }
        }
      }
    });

    if (!admin) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Admin user not found.',
        details: null
      });
    }

    const permissions =
      principal.lenderId && principal.lenderId.trim().length > 0
        ? await this.rbacService.getAdminPermissions(principal.adminId, principal.lenderId)
        : [];

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: null,
        status: admin.status,
        role: admin.role,
        roleId: admin.roleAssignment?.roleId ?? null
      },
      lender: admin.lender
        ? {
            id: admin.lender.id,
            name: admin.lender.name,
            slug: admin.lender.slug,
            status: admin.lender.status
          }
        : null,
      permissions
    };
  }
}
