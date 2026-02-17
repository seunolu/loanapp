import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TenantAdminAuthGuard extends AuthGuard('tenant-admin-jwt') {}

