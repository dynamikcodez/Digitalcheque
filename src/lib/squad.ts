const SQUAD_SECRET_KEY = process.env.SQUAD_SECRET_KEY || '';

const isSandbox = SQUAD_SECRET_KEY.startsWith('sandbox_') || SQUAD_SECRET_KEY.startsWith('test_') || !SQUAD_SECRET_KEY.startsWith('sk_');
const BASE_URL = isSandbox ? 'https://sandbox-api-d.squadco.com' : 'https://api-d.squadco.com';

async function squadRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, any>
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${SQUAD_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || `Squad request failed: ${response.statusText}`);
  }
  return data.data;
}

export interface SquadInitResponse {
  checkout_url: string;
}

export interface SquadBank {
  name: string;
  code: string;
}

export interface SquadResolveResponse {
  account_name: string;
  account_number: string;
}

export interface SquadTransferResponse {
  transfer_reference: string;
  transfer_code?: string;
  status?: string;
}

const STATIC_BANKS: SquadBank[] = [
  { name: 'Sterling Bank', code: '000001' },
  { name: 'Keystone Bank', code: '000002' },
  { name: 'FCMB', code: '000003' },
  { name: 'United Bank for Africa', code: '000004' },
  { name: 'Diamond Bank', code: '000005' },
  { name: 'JAIZ Bank', code: '000006' },
  { name: 'Fidelity Bank', code: '000007' },
  { name: 'Polaris Bank', code: '000008' },
  { name: 'Citi Bank', code: '000009' },
  { name: 'Ecobank Bank', code: '000010' },
  { name: 'Unity Bank', code: '000011' },
  { name: 'StanbicIBTC Bank', code: '000012' },
  { name: 'GTBank Plc', code: '000013' },
  { name: 'Access Bank', code: '000014' },
  { name: 'Zenith Bank Plc', code: '000015' },
  { name: 'First Bank of Nigeria', code: '000016' },
  { name: 'Wema Bank', code: '000017' },
  { name: 'Union Bank', code: '000018' },
  { name: 'Enterprise Bank', code: '000019' },
  { name: 'Heritage Bank', code: '000020' },
  { name: 'Standard Chartered', code: '000021' },
  { name: 'Suntrust Bank', code: '000022' },
  { name: 'Providus Bank', code: '000023' },
  { name: 'Rand Merchant Bank', code: '000024' },
  { name: 'Titan Trust Bank', code: '000025' },
  { name: 'Taj Bank', code: '000026' },
  { name: 'Globus Bank', code: '000027' },
  { name: 'Central Bank of Nigeria', code: '000028' },
  { name: 'Lotus Bank', code: '000029' },
  { name: 'Premium Trust Bank', code: '000031' },
  { name: 'Signature Bank', code: '000034' },
  { name: 'Optimus Bank', code: '000036' },
];

export const squad = {
  /**
   * Initializes a transaction to charge the sender
   */
  async initializeTransaction(
    email: string,
    amountInNgn: number,
    reference: string,
    callbackUrl: string
  ): Promise<SquadInitResponse> {
    return squadRequest<SquadInitResponse>('/transaction/initiate', 'POST', {
      email,
      amount: Math.round(amountInNgn * 100), // convert to kobo
      transaction_ref: reference,
      callback_url: callbackUrl,
      initiate_type: 'inline',
    });
  },

  /**
   * Lists all supported banks
   */
  async getBanks(): Promise<SquadBank[]> {
    return STATIC_BANKS;
  },

  /**
   * Resolves a NUBAN bank account number using Squad's lookup
   */
  async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<SquadResolveResponse> {
    return squadRequest<SquadResolveResponse>('/payout/account/lookup', 'POST', {
      bank_code: bankCode,
      account_number: accountNumber,
    });
  },

  /**
   * Dummy method to maintain database compatibility without changing schema
   */
  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string
  ) {
    return {
      recipient_code: 'squad_payout',
    };
  },

  /**
   * Initiates a bank transfer payout via Squad's payout endpoint
   */
  async initiateTransfer(
    accountNumber: string,
    bankCode: string,
    accountName: string,
    amountInNgn: number,
    reference: string
  ): Promise<SquadTransferResponse> {
    const merchantId = process.env.SQUAD_MERCHANT_ID || 'MOCK';
    const formattedRef = `${merchantId}_${reference}`;

    return squadRequest<SquadTransferResponse>('/payout', 'POST', {
      transaction_reference: formattedRef,
      amount: String(Math.round(amountInNgn * 100)), // kobo as a string
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
    });
  },
};
