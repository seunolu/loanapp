import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { RbacService } from '../../common/rbac/rbac.service';
import type { CreateLenderDto } from './dto/create-lender.dto';
import type { LenderResponseDto } from './dto/lender-response.dto';
import type { UpdateLenderSettingsDto } from './dto/update-lender-settings.dto';

@Injectable()
export class AdminLendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService
  ) {}

  async createLender(input: CreateLenderDto): Promise<LenderResponseDto> {
    const payload: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
      input.settings === undefined ? Prisma.JsonNull : (input.settings as Prisma.InputJsonValue);

    try {
      const lender = await this.prisma.lender.create({
        data: {
          name: input.name.trim(),
          slug: input.slug.trim(),
          settings: payload
        }
      });

      await this.rbacService.ensureDefaultRolesForLender(lender.id);

      return this.toResponse(lender);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Lender slug already exists.',
          details: { field: 'slug' }
        });
      }
      throw error;
    }
  }

  async getMyLender(admin: AdminPrincipal): Promise<LenderResponseDto> {
    const lender = await this.prisma.lender.findUnique({
      where: { id: admin.lenderId }
    });
    if (!lender) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Lender not found.',
        details: null
      });
    }
    return this.toResponse(lender);
  }

  async updateMyLenderSettings(
    admin: AdminPrincipal,
    input: UpdateLenderSettingsDto
  ): Promise<LenderResponseDto> {
    const lender = await this.prisma.lender.update({
      where: { id: admin.lenderId },
      data: {
        settings: input.settings as Prisma.InputJsonValue
      }
    });

    return this.toResponse(lender);
  }

  private toResponse(lender: {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'INACTIVE';
    settings: Prisma.JsonValue | null;
  }): LenderResponseDto {
    return {
      id: lender.id,
      name: lender.name,
      slug: lender.slug,
      status: lender.status,
      settings: (lender.settings as Record<string, unknown> | null) ?? null
    };
  }
}
