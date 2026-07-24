const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

async function paystackRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, any>
): Promise<T> {
  const url = `https://api.paystack.co${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(data.message || `Paystack request failed: ${response.statusText}`);
  }
  return data.data;
}

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackBank {
  name: string;
  code: string;
}

export interface PaystackResolveResponse {
  account_number: string;
  account_name: string;
}

export interface PaystackRecipientResponse {
  recipient_code: string;
  type: string;
  name: string;
  details: {
    account_number: string;
    bank_code: string;
    bank_name: string;
  };
}

export interface PaystackTransferResponse {
  reference: string;
  integration: number;
  domain: string;
  amount: number;
  currency: string;
  source: string;
  reason: string;
  recipient: number;
  status: string; // otp, success, pending, failed
  transfer_code: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export const paystack = {
  /**
   * Initializes a transaction to charge the sender
   */
  async initializeTransaction(
    email: string,
    amountInNgn: number,
    reference: string,
    callbackUrl: string
  ): Promise<PaystackInitResponse> {
    return paystackRequest<PaystackInitResponse>('/transaction/initialize', 'POST', {
      email,
      amount: Math.round(amountInNgn * 100), // convert to kobo
      reference,
      callback_url: callbackUrl,
    });
  },

  /**
   * Lists all banks in Nigeria
   */
  async getBanks(): Promise<PaystackBank[]> {
    return paystackRequest<PaystackBank[]>('/bank?country=nigeria', 'GET');
  },

  /**
   * Resolves a NUBAN bank account number to get the account holder's name
   */
  async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<PaystackResolveResponse> {
    return paystackRequest<PaystackResolveResponse>(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      'GET'
    );
  },

  /**
   * Creates a transfer recipient for bank transfer payouts
   */
  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string
  ): Promise<PaystackRecipientResponse> {
    return paystackRequest<PaystackRecipientResponse>('/transferrecipient', 'POST', {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    });
  },

  /**
   * Initiates a bank transfer payout to the recipient
   */
  async initiateTransfer(
    recipientCode: string,
    amountInNgn: number,
    reference: string,
    reason: string
  ): Promise<PaystackTransferResponse> {
    return paystackRequest<PaystackTransferResponse>('/transfer', 'POST', {
      source: 'balance',
      amount: Math.round(amountInNgn * 100), // convert to kobo
      recipient: recipientCode,
      reason,
      reference,
    });
  },
};
