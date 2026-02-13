import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { LenderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { RequestWithId } from '../../common/types/request-with-id';
import type { PublicConfigResponseDto } from './dto/public-config-response.dto';

type PublicConfigResult = {
  config: PublicConfigResponseDto;
  etag: string;
};

@Injectable({ scope: Scope.REQUEST })
export class PublicService {
  private static readonly DEFAULTS = {
    branding: {
      displayName: 'LoanApp',
      logoUrl: null as string | null,
      primaryColor: '#0f766e'
    },
    policy: {
      minLoanAmountKobo: 500_000,
      maxLoanAmountKobo: 10_000_000,
      minTenorDays: 7,
      maxTenorDays: 60
    },
    support: {
      phone: null as string | null,
      email: null as string | null,
      whatsapp: null as string | null
    },
    features: {
      maintenanceMode: false,
      enableOtpSms: true
    }
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: RequestWithId
  ) {}

  async getPublicConfig(): Promise<PublicConfigResult> {
    const lenderIdHeader = this.request.header('x-lender-id');
    const lenderId = lenderIdHeader?.trim() ?? '';

    if (!lenderId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'X-Lender-Id header is required.',
        details: { header: 'X-Lender-Id' }
      });
    }

    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      select: {
        id: true,
        slug: true,
        status: true,
        settings: true,
        updatedAt: true
      }
    });

    if (!lender || lender.status !== LenderStatus.ACTIVE) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Lender not found.',
        details: null
      });
    }

    const settings = this.asObject(lender.settings);
    const branding = this.asObject(settings.branding);
    const policy = this.asObject(settings.policy);
    const support = this.asObject(settings.support);
    const features = this.asObject(settings.features);

    const minLoanAmountKobo = this.asPositiveInt(
      policy.minLoanAmountKobo,
      PublicService.DEFAULTS.policy.minLoanAmountKobo
    );
    const maxLoanAmountKoboRaw = this.asPositiveInt(
      policy.maxLoanAmountKobo,
      PublicService.DEFAULTS.policy.maxLoanAmountKobo
    );
    const maxLoanAmountKobo = Math.max(maxLoanAmountKoboRaw, minLoanAmountKobo);

    const minTenorDays = this.asPositiveInt(policy.minTenorDays, PublicService.DEFAULTS.policy.minTenorDays);
    const maxTenorDaysRaw = this.asPositiveInt(policy.maxTenorDays, PublicService.DEFAULTS.policy.maxTenorDays);
    const maxTenorDays = Math.max(maxTenorDaysRaw, minTenorDays);

    return {
      config: {
        lenderId: lender.id,
        lenderSlug: lender.slug,
        branding: {
          displayName: this.asString(branding.displayName, PublicService.DEFAULTS.branding.displayName),
          logoUrl: this.asNullableString(branding.logoUrl, PublicService.DEFAULTS.branding.logoUrl),
          primaryColor: this.asString(branding.primaryColor, PublicService.DEFAULTS.branding.primaryColor)
        },
        policy: {
          minLoanAmountKobo,
          maxLoanAmountKobo,
          minTenorDays,
          maxTenorDays
        },
        support: {
          phone: this.asNullableString(support.phone, PublicService.DEFAULTS.support.phone),
          email: this.asNullableString(support.email, PublicService.DEFAULTS.support.email),
          whatsapp: this.asNullableString(support.whatsapp, PublicService.DEFAULTS.support.whatsapp)
        },
        features: {
          maintenanceMode: this.asBoolean(features.maintenanceMode, PublicService.DEFAULTS.features.maintenanceMode),
          enableOtpSms: this.asBoolean(features.enableOtpSms, PublicService.DEFAULTS.features.enableOtpSms)
        }
      },
      etag: `W/"${lender.id}:${lender.updatedAt.getTime()}"`
    };
  }

  private asObject(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, Prisma.JsonValue>;
  }

  private asString(value: Prisma.JsonValue | undefined, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  private asNullableString(value: Prisma.JsonValue | undefined, fallback: string | null): string | null {
    if (value === null) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0 ? value : fallback;
    }
    return fallback;
  }

  private asPositiveInt(value: Prisma.JsonValue | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private asBoolean(value: Prisma.JsonValue | undefined, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }
}
