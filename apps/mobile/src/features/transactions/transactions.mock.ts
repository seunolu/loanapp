import type { TransactionDetail } from './transactions.types';
import { mapTransactionStatusTone } from './transactions.mapper';

const MOCK_TRANSACTIONS: TransactionDetail[] = [
  {
    id: 'txn_mock_loan_001',
    source: 'MOCK',
    kind: 'LOAN',
    kindLabel: 'Loan',
    title: 'Instant loan disbursed',
    amountKobo: 1250000,
    status: 'SUCCESS',
    statusLabel: 'Success',
    statusTone: mapTransactionStatusTone('SUCCESS'),
    reference: 'LN-482910',
    createdAt: '2026-03-04T11:45:00.000Z',
    narration: 'Loan proceeds settled into your linked bank account.',
    metadata: [
      { label: 'Type', value: 'Loan' },
      { label: 'Status', value: 'Success' },
      { label: 'Reference', value: 'LN-482910' },
      { label: 'Created', value: '2026-03-04T11:45:00.000Z' },
      { label: 'Narration', value: 'Loan proceeds settled into your linked bank account.' }
    ]
  },
  {
    id: 'txn_mock_repayment_001',
    source: 'MOCK',
    kind: 'REPAYMENT',
    kindLabel: 'Repayment',
    title: 'Repayment received',
    amountKobo: 275000,
    status: 'SUCCESS',
    statusLabel: 'Success',
    statusTone: mapTransactionStatusTone('SUCCESS'),
    reference: 'RP-193840',
    createdAt: '2026-03-03T08:15:00.000Z',
    narration: 'Monthly repayment completed successfully.',
    metadata: [
      { label: 'Type', value: 'Repayment' },
      { label: 'Status', value: 'Success' },
      { label: 'Reference', value: 'RP-193840' },
      { label: 'Created', value: '2026-03-03T08:15:00.000Z' },
      { label: 'Narration', value: 'Monthly repayment completed successfully.' }
    ]
  },
  {
    id: 'txn_mock_fee_001',
    source: 'MOCK',
    kind: 'FEE',
    kindLabel: 'Fee',
    title: 'Late fee posted',
    amountKobo: 15000,
    status: 'PENDING',
    statusLabel: 'Pending',
    statusTone: mapTransactionStatusTone('PENDING'),
    reference: 'FE-773120',
    createdAt: '2026-03-02T15:20:00.000Z',
    narration: 'A late repayment fee is awaiting settlement.',
    metadata: [
      { label: 'Type', value: 'Fee' },
      { label: 'Status', value: 'Pending' },
      { label: 'Reference', value: 'FE-773120' },
      { label: 'Created', value: '2026-03-02T15:20:00.000Z' },
      { label: 'Narration', value: 'A late repayment fee is awaiting settlement.' }
    ]
  }
];

export function listMockTransactions(): TransactionDetail[] {
  return MOCK_TRANSACTIONS;
}

export function getMockTransaction(id: string): TransactionDetail | null {
  return MOCK_TRANSACTIONS.find((item) => item.id === id) ?? null;
}
