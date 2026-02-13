import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { Prisma, UnderwritingCaseStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../../common/pagination/cursor-pagination';
import type { ListUnderwritingCasesQueryDto } from './dto/list-underwriting-cases-query.dto';
import type { UnderwritingCaseListResponseDto, UnderwritingCaseResponseDto } from './dto/underwriting-case-response.dto';
import type { UpdateUnderwritingCaseDto } from './dto/update-underwriting-case.dto';
import type { UpsertUnderwritingChecklistDto } from './dto/upsert-underwriting-checklist.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminUnderwritingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listCases(
    admin: AdminPrincipal,
    query: ListUnderwritingCasesQueryDto
  ): Promise<UnderwritingCaseListResponseDto> {
    const take = query.limit ?? 50;
    const cursor = decodeCursor(query.cursor);
    const search = query.query?.trim();
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;
    const whereAnd: Prisma.UnderwritingCaseWhereInput[] = [
      {
        lenderId: admin.lenderId,
        ...(query.status ? { status: query.status } : {})
      }
    ];
    if (search) {
      whereAnd.push({
        OR: [
          { loanApplicationId: { contains: search, mode: 'insensitive' } },
          { borrowerId: { contains: search, mode: 'insensitive' } }
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
    const rows = await this.prisma.underwritingCase.findMany({
      where: { AND: whereAnd },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: {
        id: true,
        loanApplicationId: true,
        borrowerId: true,
        status: true,
        createdAt: true
      }
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;
    return {
      items: items.map((item) => ({
        applicationId: item.loanApplicationId,
        borrowerId: item.borrowerId,
        status: item.status,
        createdAt: item.createdAt.toISOString()
      })),
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null
    };
  }

  async getCase(admin: AdminPrincipal, applicationId: string): Promise<UnderwritingCaseResponseDto> {
    const row = await this.prisma.underwritingCase.findFirst({
      where: {
        lenderId: admin.lenderId,
        loanApplicationId: applicationId
      },
      include: {
        checklistItems: {
          orderBy: [{ isRequired: 'desc' }, { code: 'asc' }]
        }
      }
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Underwriting case not found.',
        details: null
      });
    }
    return this.toCaseResponse(row);
  }

  async updateCase(
    admin: AdminPrincipal,
    applicationId: string,
    input: UpdateUnderwritingCaseDto
  ): Promise<UnderwritingCaseResponseDto> {
    const existing = await this.prisma.underwritingCase.findFirst({
      where: { lenderId: admin.lenderId, loanApplicationId: applicationId }
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Underwriting case not found.',
        details: null
      });
    }

    const status = input.status as UnderwritingCaseStatus | undefined;
    const updated = await this.prisma.underwritingCase.update({
      where: { id: existing.id },
      data: {
        ...(status ? { status } : {}),
        ...(input.monthlyIncomeKobo !== undefined ? { monthlyIncomeKobo: input.monthlyIncomeKobo } : {}),
        ...(input.existingDebtKobo !== undefined ? { existingDebtKobo: input.existingDebtKobo } : {}),
        ...(input.riskLevel !== undefined ? { riskLevel: input.riskLevel?.trim() || null } : {}),
        ...(input.decisionNotes !== undefined ? { decisionNotes: input.decisionNotes?.trim() || null } : {}),
        ...(status ? { decidedByAdminId: admin.adminId } : {}),
        ...(status === UnderwritingCaseStatus.COMPLETED ? { completedAt: new Date() } : {})
      },
      include: {
        checklistItems: {
          orderBy: [{ isRequired: 'desc' }, { code: 'asc' }]
        }
      }
    });

    await this.auditService.write({
      event: 'UNDERWRITING_CASE_UPDATED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        lenderId: admin.lenderId,
        applicationId,
        caseId: updated.id,
        status: updated.status
      }
    });

    return this.toCaseResponse(updated);
  }

  async upsertChecklist(
    admin: AdminPrincipal,
    applicationId: string,
    input: UpsertUnderwritingChecklistDto
  ): Promise<UnderwritingCaseResponseDto> {
    const caseRow = await this.prisma.underwritingCase.findFirst({
      where: {
        lenderId: admin.lenderId,
        loanApplicationId: applicationId
      },
      select: { id: true }
    });
    if (!caseRow) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Underwriting case not found.',
        details: null
      });
    }

    await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.underwritingChecklistItem.upsert({
          where: {
            underwritingCaseId_code: {
              underwritingCaseId: caseRow.id,
              code: item.code.trim()
            }
          },
          update: {
            label: item.label.trim(),
            status: item.status,
            isRequired: item.isRequired,
            notes: item.notes?.trim() || null
          },
          create: {
            underwritingCaseId: caseRow.id,
            code: item.code.trim(),
            label: item.label.trim(),
            status: item.status,
            isRequired: item.isRequired,
            notes: item.notes?.trim() || null
          }
        })
      )
    );

    await this.auditService.write({
      event: 'UNDERWRITING_CHECKLIST_UPDATED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        lenderId: admin.lenderId,
        applicationId,
        caseId: caseRow.id,
        itemCount: input.items.length
      }
    });

    return this.getCase(admin, applicationId);
  }

  private toCaseResponse(row: {
    loanApplicationId: string;
    borrowerId: string;
    status: UnderwritingCaseStatus;
    monthlyIncomeKobo: number | null;
    existingDebtKobo: number | null;
    riskLevel: string | null;
    decisionNotes: string | null;
    decidedByAdminId: string | null;
    completedAt: Date | null;
    checklistItems: Array<{
      id: string;
      code: string;
      label: string;
      status: 'PENDING' | 'PASSED' | 'FAILED';
      isRequired: boolean;
      notes: string | null;
    }>;
  }): UnderwritingCaseResponseDto {
    return {
      applicationId: row.loanApplicationId,
      borrowerId: row.borrowerId,
      status: row.status,
      monthlyIncomeKobo: row.monthlyIncomeKobo,
      existingDebtKobo: row.existingDebtKobo,
      riskLevel: row.riskLevel,
      decisionNotes: row.decisionNotes,
      decidedByAdminId: row.decidedByAdminId,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      checklist: row.checklistItems.map((item) => ({
        id: item.id,
        code: item.code,
        label: item.label,
        status: item.status,
        isRequired: item.isRequired,
        notes: item.notes
      }))
    };
  }
}
