import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Scope
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../../common/pagination/cursor-pagination';
import { RiskService } from '../../common/risk/risk.service';
import type { AddBorrowerNoteDto } from './dto/add-borrower-note.dto';
import type {
  AdminBorrowerListResponseDto,
  AdminBorrowerResponseDto
} from './dto/admin-borrower-response.dto';
import type { BorrowerNoteResponseDto } from './dto/borrower-note-response.dto';
import type { BorrowerOverrideResponseDto } from './dto/borrower-override-response.dto';
import type { CreateAdminBorrowerDto } from './dto/create-admin-borrower.dto';
import type { ListAdminBorrowersQueryDto } from './dto/list-admin-borrowers-query.dto';
import type { SetBorrowerOverrideDto } from './dto/set-borrower-override.dto';
import type { BorrowerRiskResponseDto } from './dto/borrower-risk-response.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminBorrowersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly riskService: RiskService
  ) {}

  async createBorrower(
    admin: AdminPrincipal,
    input: CreateAdminBorrowerDto
  ): Promise<AdminBorrowerResponseDto> {
    const dateOfBirth = new Date(input.dateOfBirth);
    if (!this.isAdult(dateOfBirth)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Borrower must be at least 18 years old.',
        details: { field: 'dateOfBirth' }
      });
    }

    try {
      const borrower = await this.prisma.borrower.create({
        data: {
          lenderId: admin.lenderId,
          phone: input.phone.trim(),
          profile: {
            create: {
              firstName: input.firstName.trim(),
              lastName: input.lastName.trim(),
              dateOfBirth,
              gender: input.gender?.trim() || null,
              addressLine1: input.addressLine1?.trim() || null,
              city: input.city?.trim() || null,
              state: input.state?.trim() || null
            }
          }
        },
        include: {
          profile: true
        }
      });

      await this.auditService.write({
        event: 'ADMIN_BORROWER_CREATED',
        actorType: 'ADMIN',
        actorId: admin.adminId,
        metadata: {
          lenderId: admin.lenderId,
          borrowerId: borrower.id,
          phone: borrower.phone
        }
      });

      return {
        id: borrower.id,
        lenderId: borrower.lenderId,
        phone: borrower.phone,
        createdAt: borrower.createdAt.toISOString(),
        profile: borrower.profile
          ? {
              firstName: borrower.profile.firstName,
              lastName: borrower.profile.lastName,
              dateOfBirth: borrower.profile.dateOfBirth.toISOString().slice(0, 10),
              gender: borrower.profile.gender,
              addressLine1: borrower.profile.addressLine1,
              city: borrower.profile.city,
              state: borrower.profile.state
            }
          : null,
        override: null,
        notes: []
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Borrower phone already exists for this lender.',
          details: { field: 'phone' }
        });
      }
      throw error;
    }
  }

  async listBorrowers(
    admin: AdminPrincipal,
    query: ListAdminBorrowersQueryDto
  ): Promise<AdminBorrowerListResponseDto> {
    const take = query.limit ?? 50;
    const search = query.query?.trim();
    const cursor = decodeCursor(query.cursor);
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;
    const whereAnd: Prisma.BorrowerWhereInput[] = [{ lenderId: admin.lenderId }];

    if (search) {
      whereAnd.push({
        OR: [
          { phone: { contains: search, mode: 'insensitive' } },
          { profile: { firstName: { contains: search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: search, mode: 'insensitive' } } }
        ]
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

    const rows = await this.prisma.borrower.findMany({
      where: { AND: whereAnd },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;

    return {
      items: items.map((item) => ({
        id: item.id,
        phone: item.phone,
        firstName: item.profile?.firstName ?? null,
        lastName: item.profile?.lastName ?? null,
        createdAt: item.createdAt.toISOString()
      })),
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null
    };
  }

  async getBorrower(admin: AdminPrincipal, borrowerId: string): Promise<AdminBorrowerResponseDto> {
    const borrower = await this.prisma.borrower.findFirst({
      where: {
        id: borrowerId,
        lenderId: admin.lenderId
      },
      include: {
        profile: true,
        override: true,
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!borrower) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Borrower not found.',
        details: null
      });
    }

    await this.auditService.log({
      tenantId: admin.lenderId,
      actorType: 'ADMIN',
      actorId: admin.adminId,
      actorRole: admin.role,
      action: 'DATA_ACCESS.READ',
      entity: 'Borrower',
      entityId: borrower.id,
      metadata: {
        endpoint: 'admin/borrowers/:id',
        resourceType: 'Borrower',
        resourceId: borrower.id
      }
    });

    return {
      id: borrower.id,
      lenderId: borrower.lenderId,
      phone: borrower.phone,
      createdAt: borrower.createdAt.toISOString(),
      profile: borrower.profile
        ? {
            firstName: borrower.profile.firstName,
            lastName: borrower.profile.lastName,
            dateOfBirth: borrower.profile.dateOfBirth.toISOString().slice(0, 10),
            gender: borrower.profile.gender,
            addressLine1: borrower.profile.addressLine1,
            city: borrower.profile.city,
            state: borrower.profile.state
          }
        : null,
      override: borrower.override
        ? {
            maxLoanKobo: borrower.override.maxLoanKobo,
            maxTenorDays: borrower.override.maxTenorDays,
            updatedAt: borrower.override.updatedAt.toISOString()
          }
        : null,
      notes: borrower.notes.map((note) => ({
        id: note.id,
        note: note.note,
        createdById: note.createdById,
        createdAt: note.createdAt.toISOString()
      }))
    };
  }

  async getBorrowerRisk(admin: AdminPrincipal, borrowerId: string): Promise<BorrowerRiskResponseDto> {
    await this.ensureBorrower(admin, borrowerId);
    const risk = await this.riskService.getBorrowerRisk(admin.lenderId, borrowerId);

    return {
      borrowerId,
      profile: risk.profile
        ? {
            score: risk.profile.score,
            level: risk.profile.level,
            lastEvaluatedAt: risk.profile.lastEvaluatedAt ? risk.profile.lastEvaluatedAt.toISOString() : null
          }
        : null,
      events: risk.recentEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        scoreDelta: event.scoreDelta,
        totalScore: event.totalScore,
        level: event.level,
        blocked: event.blocked,
        reason: event.reason,
        createdAt: event.createdAt.toISOString()
      })),
      devices: risk.devices.map((device) => ({
        id: device.id,
        deviceId: device.deviceId,
        ip: device.ip,
        userAgent: device.userAgent,
        lastSeenAt: device.lastSeenAt.toISOString()
      }))
    };
  }

  async addNote(
    admin: AdminPrincipal,
    borrowerId: string,
    input: AddBorrowerNoteDto
  ): Promise<BorrowerNoteResponseDto> {
    await this.ensureBorrower(admin, borrowerId);
    const note = await this.prisma.borrowerNote.create({
      data: {
        lenderId: admin.lenderId,
        borrowerId,
        note: input.note.trim(),
        createdById: admin.adminId
      }
    });

    await this.auditService.write({
      event: 'BORROWER_NOTE_ADDED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        lenderId: admin.lenderId,
        borrowerId,
        noteId: note.id
      }
    });

    return {
      id: note.id,
      borrowerId: note.borrowerId,
      note: note.note,
      createdById: note.createdById,
      createdAt: note.createdAt.toISOString()
    };
  }

  async setOverride(
    admin: AdminPrincipal,
    borrowerId: string,
    input: SetBorrowerOverrideDto
  ): Promise<BorrowerOverrideResponseDto> {
    await this.ensureBorrower(admin, borrowerId);

    if (input.maxLoanKobo == null && input.maxTenorDays == null) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least one override field must be provided.',
        details: null
      });
    }

    const override = await this.prisma.borrowerOverride.upsert({
      where: { borrowerId },
      update: {
        lenderId: admin.lenderId,
        maxLoanKobo: input.maxLoanKobo ?? null,
        maxTenorDays: input.maxTenorDays ?? null,
        updatedById: admin.adminId
      },
      create: {
        lenderId: admin.lenderId,
        borrowerId,
        maxLoanKobo: input.maxLoanKobo ?? null,
        maxTenorDays: input.maxTenorDays ?? null,
        updatedById: admin.adminId
      }
    });

    await this.auditService.write({
      event: 'BORROWER_OVERRIDE_SET',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        lenderId: admin.lenderId,
        borrowerId,
        overrideId: override.id,
        maxLoanKobo: override.maxLoanKobo,
        maxTenorDays: override.maxTenorDays
      }
    });

    return {
      id: override.id,
      borrowerId: override.borrowerId,
      maxLoanKobo: override.maxLoanKobo,
      maxTenorDays: override.maxTenorDays,
      updatedById: override.updatedById,
      updatedAt: override.updatedAt.toISOString()
    };
  }

  private async ensureBorrower(admin: AdminPrincipal, borrowerId: string): Promise<void> {
    const borrower = await this.prisma.borrower.findFirst({
      where: {
        id: borrowerId,
        lenderId: admin.lenderId
      },
      select: { id: true }
    });

    if (!borrower) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Borrower not found.',
        details: null
      });
    }
  }

  private isAdult(dateOfBirth: Date): boolean {
    const threshold = new Date(dateOfBirth);
    threshold.setFullYear(threshold.getFullYear() + 18);
    return threshold <= new Date();
  }
}
