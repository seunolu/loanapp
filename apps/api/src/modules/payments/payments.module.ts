import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { JobQueueModule } from '../../common/jobs/job-queue.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { LoansModule } from '../loans/loans.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentIntentsService } from './payment-intents.service';
import { PAYMENT_GATEWAY } from '../../payments/gateway/payment-gateway.interface';
import { PaystackGateway } from '../../payments/gateway/paystack.gateway';
import { PaystackProvider } from './paystack.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentIntentsReconciliationJob } from './payment-intents-reconciliation.job';
import { RepaymentsController } from './repayments.controller';
import { PaymentsService } from './payments.service';
import { PaystackStubProvider } from './providers/paystack-stub.provider';
import { RepaymentProcessorService } from './repayment-processor.service';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { MandatesController } from './mandates.controller';
import { MandatesService } from './mandates.service';
import { MandateDebitsJob } from './mandate-debits.job';
import { WebhookVerifyService } from '../../integrations/webhook-verify.service';

@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    AuditModule,
    IdempotencyModule,
    JobQueueModule,
    LedgerModule,
    LoansModule,
    LoanApplicationsModule
  ],
  controllers: [PaymentsController, RepaymentsController, AdminPaymentsController, PaymentsWebhookController, MandatesController],
  providers: [
    PaymentsService,
    PaymentIntentsService,
    MandatesService,
    PaystackProvider,
    PaystackStubProvider,
    WebhookVerifyService,
    PaystackGateway,
    PaymentIntentsReconciliationJob,
    MandateDebitsJob,
    FinancialInvariantsService,
    RepaymentProcessorService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, PaystackGateway],
      useFactory: (configService: ConfigService, paystackGateway: PaystackGateway) => {
        const provider = (configService.get('PAYMENTS_PROVIDER') ?? 'paystack').toString().toLowerCase();
        if (provider !== 'paystack') {
          throw new Error(`Unsupported PAYMENTS_PROVIDER: ${provider}`);
        }
        return paystackGateway;
      }
    }
  ],
  exports: [RepaymentProcessorService, PaymentIntentsService, MandatesService, PAYMENT_GATEWAY, WebhookVerifyService]
})
export class PaymentsModule {}
