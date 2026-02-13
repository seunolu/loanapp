import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { BORROWER_JWT_AUDIENCE, BORROWER_JWT_ISSUER } from '../../../common/auth/jwt.constants';
import type { BorrowerPrincipal } from '../../../common/auth/borrower-principal';
import type { Env } from '../../../common/config/env.schema';
import { PrismaService } from '../../../common/database/prisma.service';

type BorrowerAccessPayload = {
  sub?: string;
  sid?: string;
  typ?: string;
  lid?: string;
  phone?: string;
};

@Injectable()
export class BorrowerJwtStrategy extends PassportStrategy(Strategy, 'borrower-jwt') {
  constructor(
    configService: ConfigService<Env, true>,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
      issuer: BORROWER_JWT_ISSUER,
      audience: BORROWER_JWT_AUDIENCE,
      ignoreExpiration: false
    });
  }

  async validate(payload: BorrowerAccessPayload): Promise<BorrowerPrincipal> {
    if (
      payload.typ !== 'borrower' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.sid !== 'string' ||
      !payload.sid ||
      typeof payload.lid !== 'string' ||
      !payload.lid
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid access token.',
        details: null
      });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { borrower: true }
    });

    if (
      !session ||
      session.borrowerId !== payload.sub ||
      session.borrower.lenderId !== payload.lid ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Session is invalid or revoked.',
        details: null
      });
    }

    const borrowerStatus = (session.borrower as unknown as { status?: string }).status ?? 'ACTIVE';
    if (borrowerStatus !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Borrower is not active.',
        details: null
      });
    }

    return {
      borrowerId: session.borrower.id,
      lenderId: session.borrower.lenderId,
      phone: session.borrower.phone,
      sessionId: session.id
    };
  }
}
