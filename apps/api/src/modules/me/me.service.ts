import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import type { AcceptConsentDto } from './dto/accept-consent.dto';
import type { ConsentResponseDto } from './dto/consent-response.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly requestContextService: RequestContextService
  ) {}

  async getMe(principal: BorrowerPrincipal): Promise<MeResponseDto> {
    const borrower = await this.prisma.borrower.findUnique({
      where: { id: principal.borrowerId },
      include: { profile: true, kycCase: true }
    });

    await this.auditService.write({
      event: 'AUTH_ME_ACCESS',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        sessionId: principal.sessionId
      }
    });

    const status = ((borrower as unknown as { status?: 'ACTIVE' | 'SUSPENDED' } | null)?.status ?? 'ACTIVE') as
      | 'ACTIVE'
      | 'SUSPENDED';

    return {
      id: principal.borrowerId,
      phone: principal.phone,
      status,
      profile: borrower?.profile
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
      kycStatus: borrower?.kycCase?.status ?? 'NOT_SUBMITTED',
      activeLoan: null
    };
  }

  async updateProfile(principal: BorrowerPrincipal, input: UpdateProfileDto): Promise<MeResponseDto> {
    const dateOfBirth = new Date(input.dateOfBirth);
    if (!this.isAdult(dateOfBirth)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Borrower must be at least 18 years old.',
        details: {
          field: 'dateOfBirth'
        }
      });
    }

    const before = await this.prisma.borrowerProfile.findUnique({
      where: { borrowerId: principal.borrowerId }
    });

    await this.prisma.borrowerProfile.upsert({
      where: { borrowerId: principal.borrowerId },
      update: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        dateOfBirth,
        gender: input.gender?.trim() || null,
        addressLine1: input.addressLine1?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null
      },
      create: {
        borrowerId: principal.borrowerId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        dateOfBirth,
        gender: input.gender?.trim() || null,
        addressLine1: input.addressLine1?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null
      }
    });

    const after = await this.prisma.borrowerProfile.findUnique({
      where: { borrowerId: principal.borrowerId }
    });

    await this.auditService.write({
      event: 'BORROWER_PROFILE_UPDATED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        before: this.snapshotProfile(before),
        after: this.snapshotProfile(after)
      }
    });

    return this.getMe(principal);
  }

  async acceptConsent(principal: BorrowerPrincipal, input: AcceptConsentDto): Promise<ConsentResponseDto> {
    const context = this.requestContextService.get();

    const data: Prisma.ConsentRecordCreateInput = {
      borrower: { connect: { id: principal.borrowerId } },
      type: input.type.trim(),
      version: input.version.trim(),
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
    };

    const consent = await this.prisma.consentRecord.upsert({
      where: {
        borrowerId_type_version: {
          borrowerId: principal.borrowerId,
          type: input.type.trim(),
          version: input.version.trim()
        }
      },
      update: {},
      create: data
    });

    await this.auditService.write({
      event: 'CONSENT_ACCEPTED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        type: consent.type,
        version: consent.version,
        consentId: consent.id
      }
    });

    return {
      id: consent.id,
      type: consent.type,
      version: consent.version,
      acceptedAt: consent.acceptedAt.toISOString()
    };
  }

  async getHolds(principal: BorrowerPrincipal): Promise<{
    active: boolean;
    hold: null | { id: string; status: 'ACTIVE'; reason: string; createdAt: string };
  }> {
    const hold = await this.prisma.borrowerHold.findFirst({
      where: {
        tenantId: principal.tenantId,
        status: 'ACTIVE',
        OR: [{ borrowerId: principal.borrowerId }, { borrowerId: principal.phone }]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!hold) {
      return { active: false, hold: null };
    }

    return {
      active: true,
      hold: {
        id: hold.id,
        status: 'ACTIVE',
        reason: hold.reason,
        createdAt: hold.createdAt.toISOString()
      }
    };
  }

  private isAdult(dateOfBirth: Date): boolean {
    const now = new Date();
    const adultDate = new Date(dateOfBirth);
    adultDate.setFullYear(adultDate.getFullYear() + 18);
    return adultDate <= now;
  }

  private snapshotProfile(profile: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string | null;
    city: string | null;
    state: string | null;
  } | null) {
    if (!profile) {
      return null;
    }

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
      gender: profile.gender,
      city: profile.city,
      state: profile.state
    };
  }
}
