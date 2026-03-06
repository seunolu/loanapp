import {
  addBorrowerCaseMessage,
  createBorrowerCase,
  getBorrowerCase,
  listBorrowerCases,
  type BorrowerCaseDetail,
  type BorrowerCaseListItem
} from '../../lib/api';
import { formatStatusLabel } from '../../lib/format';
import { supportCategoryOptions, type SupportFaqItem, type SupportMessage, type SupportTicketDetail, type SupportTicketItem } from './support.types';

const FAQ_ITEMS: SupportFaqItem[] = [
  {
    id: 'faq_loan_disbursement',
    question: 'How long does loan disbursement take?',
    answer: 'Approved loans are usually disbursed shortly after final verification. If you see a delay, create a ticket and include your loan ID.'
  },
  {
    id: 'faq_repayment_failed',
    question: 'What should I do if my repayment fails?',
    answer: 'Retry from the repay flow, confirm your payment method is active, and contact support if the reference still shows pending.'
  },
  {
    id: 'faq_update_profile',
    question: 'Can I update my profile or bank details?',
    answer: 'Yes. Use your profile settings and KYC screens for account data updates. If you are blocked, open a support request.'
  }
];

function mapStatusTone(status: SupportTicketItem['status']): SupportTicketItem['statusTone'] {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'success';
  }
  if (status === 'REJECTED') {
    return 'danger';
  }
  if (status === 'ESCALATED' || status === 'IN_REVIEW') {
    return 'warning';
  }
  return 'info';
}

function mapCategoryLabel(value: SupportTicketItem['category']): string {
  return supportCategoryOptions.find((option) => option.value === value)?.label ?? formatStatusLabel(value);
}

function mapTicket(item: BorrowerCaseListItem): SupportTicketItem {
  return {
    id: item.id,
    category: item.type,
    categoryLabel: mapCategoryLabel(item.type),
    status: item.status,
    statusLabel: formatStatusLabel(item.status),
    statusTone: mapStatusTone(item.status),
    priority: item.priority,
    subject: item.subject,
    preview: item.description,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function mapMessage(item: BorrowerCaseDetail['messages'][number]): SupportMessage {
  return {
    id: item.id,
    body: item.message,
    createdAt: item.createdAt,
    sender: item.createdByBorrowerId ? 'borrower' : 'support'
  };
}

function mapTicketDetail(item: BorrowerCaseDetail): SupportTicketDetail {
  return {
    ...mapTicket(item),
    messages: item.messages.map(mapMessage),
    history: item.history.map((entry) => ({
      id: entry.id,
      label: `${formatStatusLabel(entry.fromStatus ?? 'OPEN')} to ${formatStatusLabel(entry.toStatus)}`,
      createdAt: entry.createdAt
    }))
  };
}

export async function listSupportTickets(): Promise<SupportTicketItem[]> {
  const response = await listBorrowerCases({ page: 1, limit: 20 });
  return response.items.map(mapTicket);
}

export async function getSupportTicket(id: string): Promise<SupportTicketDetail> {
  const response = await getBorrowerCase(id);
  return mapTicketDetail(response);
}

export async function createSupportTicket(input: {
  category: SupportTicketItem['category'];
  subject: string;
  message: string;
  loanApplicationId?: string;
}): Promise<SupportTicketDetail> {
  const response = await createBorrowerCase({
    type: input.category,
    subject: input.subject,
    description: input.message,
    loanApplicationId: input.loanApplicationId
  });
  return mapTicketDetail(response);
}

export async function replyToSupportTicket(id: string, message: string): Promise<void> {
  await addBorrowerCaseMessage(id, { message });
}

export function listSupportFaq(): SupportFaqItem[] {
  return FAQ_ITEMS;
}
