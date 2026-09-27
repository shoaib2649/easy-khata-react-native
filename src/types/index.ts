export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin?: boolean;
  accounts?: Account[];
  created_at?: string;
  updated_at?: string;
}

export interface StatementEntry {
  direction: 'in' | 'out';
  amount: number;
  from_account: string | null;
  to_account: string | null;
  note: string | null;
  status: string;
  balance_before: number | null;
  balance_after: number | null;
  created_at: string;
}

export interface StatementResponse {
  account: {
    id: number;
    name: string;
    current_balance: number;
  };
  statement: StatementEntry[];
}

export interface Account {
  id: number;
  user_id?: number;
  name: string;
  phone?: string;
  bank_name?: string;
  account_number?: string;
  current_balance: number;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'incoming' | 'outgoing' | 'direct_transfer';

export interface Transaction {
  id: number;
  account_id?: number;
  amount: number;
  type: TransactionType;
  description?: string;
  reference_number?: string;
  performed_by_id?: number;
  created_at: string;
  account?: Account;
  recipient_account?: Account;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}
