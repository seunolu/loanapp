import { ForbiddenException, Injectable } from '@nestjs/common';
import { HoldStatus, TenantAdminRole } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class HoldEnforcementService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveBorrowerHold(tenantId: string, borrowerId: string) {
    return this.prisma.borrowerHold.findFirst({
      where: {
        tenantId,
        borrowerId,
        status: HoldStatus.ACTIVE
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async assertBorrowerNotRestricted(input: {
    tenantId: string;
    borrowerId: string;
    role?: TenantAdminRole;
  }): Promise<void> {
    const hold = await this.getActiveBorrowerHold(input.tenantId, input.borrowerId);
    if (!hold) {
      return;
    }
    if (input.role === 'SUPER_ADMIN') {
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Account is temporarily restricted. Contact support.',
      details: {
        holdId: hold.id,
        createdAt: hold.createdAt.toISOString()
      }
    });
  }
}

