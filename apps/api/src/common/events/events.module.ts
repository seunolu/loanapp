import { Global, Module } from '@nestjs/common';
import { OutboxDispatcherModule } from './outbox-dispatcher.module';
import { LoanApplicationReadModelConsumer } from './loan-application-readmodel.consumer';
import { OutboxService } from './outbox.service';

@Global()
@Module({
  imports: [OutboxDispatcherModule],
  providers: [OutboxService, LoanApplicationReadModelConsumer],
  exports: [OutboxService]
})
export class EventsModule {}

