export type PaystackApiEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackTransferInit = {
  transfer_code?: string;
  reference: string;
  status: string;
};

