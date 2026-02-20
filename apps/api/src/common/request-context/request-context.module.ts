import { Global, Module } from '@nestjs/common';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';
import { RequestContextStore } from './request-context.store';

@Global()
@Module({
  providers: [RequestContextService, RequestContextStore, RequestContextMiddleware],
  exports: [RequestContextService, RequestContextStore, RequestContextMiddleware]
})
export class RequestContextModule {}
