import type { BadgeTone, SelectOption } from '../../ui';
import type { BorrowerCasePriority, BorrowerCaseStatus, BorrowerCaseType } from '../../lib/api';

export type SupportCategory = BorrowerCaseType;
export type SupportTicketStatus = BorrowerCaseStatus;
export type SupportTicketPriority = BorrowerCasePriority;

export type SupportTicketItem = {
  id: string;
  category: SupportCategory;
  categoryLabel: string;
  status: SupportTicketStatus;
  statusLabel: string;
  statusTone: BadgeTone;
  priority: SupportTicketPriority;
  subject: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: 'borrower' | 'support';
};

export type SupportTicketDetail = SupportTicketItem & {
  history: { id: string; label: string; createdAt: string }[];
  messages: SupportMessage[];
};

export type SupportFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const supportCategoryOptions: SelectOption<SupportCategory>[] = [
  {
    label: 'Complaint',
    value: 'COMPLAINT',
    description: 'Use this for a service problem, failed repayment, or poor experience.'
  },
  {
    label: 'Dispute',
    value: 'DISPUTE',
    description: 'Use this when you want to challenge a charge, fee, or account action.'
  },
  {
    label: 'Request',
    value: 'REQUEST',
    description: 'Use this for help, account changes, or general assistance.'
  }
];
