import { ApiRequestError, verifyMyBankAccount } from '../../lib/api';

type VerifyBankAccountInput = {
  bankCode: string;
  accountNumber: string;
};

type VerifyBankAccountResult = {
  resolvedName: string;
  source: 'api' | 'mock';
};

function isMockEnabled(): boolean {
  return process.env.EXPO_PUBLIC_KYC_BANK_VERIFY_MOCK === 'true';
}

function assertMockVerification(input: VerifyBankAccountInput): VerifyBankAccountResult {
  if (input.accountNumber === '0000000000') {
    throw new Error('Account not found');
  }
  if (!/^\d{10}$/.test(input.accountNumber) || !input.bankCode.trim()) {
    throw new Error('Enter a valid 10-digit account number and bank.');
  }
  return {
    resolvedName: 'Test User',
    source: 'mock'
  };
}

export function shouldUseBankVerificationMock(): boolean {
  return isMockEnabled();
}

export async function verifyBankAccount(input: VerifyBankAccountInput): Promise<VerifyBankAccountResult> {
  if (isMockEnabled()) {
    return assertMockVerification(input);
  }

  try {
    const response = await verifyMyBankAccount(input);
    const resolvedName = response.accountName?.trim() || response.resolvedName?.trim();
    if (!resolvedName) {
      throw new Error('Unable to resolve account name. Please try again.');
    }
    return {
      resolvedName,
      source: 'api'
    };
  } catch (error: unknown) {
    if (error instanceof ApiRequestError && error.status === 404) {
      throw new Error('Account verification is currently unavailable. Contact support.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unable to verify this account right now.');
  }
}

