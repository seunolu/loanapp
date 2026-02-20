import { Injectable } from '@nestjs/common';

@Injectable()
export class CollectionsJobHandler {
  async handle(_payload: Record<string, unknown>): Promise<void> {
    // Business logic remains in existing domain services; this handler is a safe adapter point.
  }
}

