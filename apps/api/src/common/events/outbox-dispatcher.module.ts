import { Module } from '@nestjs/common';
import { OutboxDispatcherWorker } from './outbox-dispatcher.worker';

@Module({
  providers: [OutboxDispatcherWorker]
})
export class OutboxDispatcherModule {}

