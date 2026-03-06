import * as React from 'react';
import { Badge } from '../../../ui';
import type { TransactionItem } from '../transactions.types';

type TransactionStatusPillProps = {
  statusLabel: string;
  tone: TransactionItem['statusTone'];
};

export function TransactionStatusPill({ statusLabel, tone }: TransactionStatusPillProps): React.JSX.Element {
  return <Badge tone={tone} label={statusLabel} />;
}
