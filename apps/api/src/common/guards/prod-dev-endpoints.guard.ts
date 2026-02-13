import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

@Injectable()
export class ProdDevEndpointsGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ originalUrl?: string }>();
    const env = this.configService.get('NODE_ENV', { infer: true });
    if (env !== 'production') {
      return true;
    }

    const prefix = this.configService.get('API_PREFIX', { infer: true });
    const devPrefix = `/${prefix}/dev`;
    const url = req.originalUrl ?? '';
    if (url === devPrefix || url.startsWith(`${devPrefix}/`)) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Not Found',
        details: null
      });
    }

    return true;
  }
}
