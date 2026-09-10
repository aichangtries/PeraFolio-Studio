export type TransactionType = 'income' | 'expense';

export type OnlineAppId = 'gotyme' | 'maribank' | 'maya' | 'wise' | 'gcash';

export type PaymentMethod =
  | 'GoTyme (Allowance)'
  | 'MariBank (Extras)'
  | 'Maya - Emergency Fund'
  | 'Maya - First Milly'
  | 'Maya - Travel'
  | 'Wise (Freelance Company 1)'
  | 'Wise (Freelance Company 2)'
  | 'GCash (Family & Random)'
  | 'Bank Account'
  | 'Credit Card'
  | 'Debit Card'
  | 'Cash'
  | 'Digital Wallet'
  | 'Crypto'
  | 'Other'
  | string;

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // e.g., 1 USD = rateToUSD currency units
  flag: string;
}

export interface MayaPockets {
  emergencyFund: number;
  firstMilly: number;
  travel: number;
  [key: string]: number;
}

export interface WiseClientSource {
  id: string;
  companyName: string;
  currency: string;
  balance: number;
  expectedMonthly?: number;
  payoutSchedule?: string;
}

export interface GoTymeAllowanceConfig {
  monthlyBudget: number;
  targetDailyAllowance?: number;
}

export interface OnlineAccount {
  id: OnlineAppId;
  name: string;
  purpose: string;
  description: string;
  balance: number; // Stored in account currency
  currency: string; // e.g. PHP for GoTyme/MariBank/Maya/GCash, USD/EUR for Wise
  color: string;
  bgColor: string;
  borderColor: string;
  badge: string;
  icon: string;
  notes?: string;
  lastUpdated: number;
  mayaPockets?: MayaPockets;
  wiseClients?: WiseClientSource[];
  allowanceConfig?: GoTymeAllowanceConfig;
}

export interface AccountTransferRecord {
  id: string;
  fromAccountId: OnlineAppId;
  fromWalletLabel: string;
  toAccountId: OnlineAppId;
  toWalletLabel: string;
  amount: number;
  currency: string;
  date: string;
  note?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // in original currency
  currency: string; // e.g. 'USD', 'EUR', 'PHP'
  amountInBase: number; // normalized to base currency
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  paymentMethod: PaymentMethod;
  tags?: string[];
  recurringId?: string;
  createdAt: number;
}

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'yearly';

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  frequency: RecurrenceFrequency;
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  endDate?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  isActive: boolean;
  autoLog: boolean;
  createdAt: number;
}

export interface SavingsGoalHistoryItem {
  id: string;
  date: string;
  amount: number;
  note?: string;
  type: 'deposit' | 'withdraw';
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number; // in base currency
  currentAmount: number; // in base currency
  targetDate: string; // YYYY-MM-DD
  category: string;
  color: string;
  icon: string;
  notes?: string;
  history: SavingsGoalHistoryItem[];
  isCompleted: boolean;
  createdAt: number;
  isSyncedWithMaya?: boolean;
  linkedMayaPocket?: string;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string; // hex
  bgColor: string; // pastel tailwind or hex
}

export interface AppState {
  accounts: OnlineAccount[];
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  savingsGoals: SavingsGoal[];
  baseCurrency: string;
  customExchangeRates: Record<string, number>;
  lastExchangeRateUpdate?: string;
}

export type ActiveTab =
  | 'overview'
  | 'wallets'
  | 'transactions'
  | 'recurring'
  | 'goals'
  | 'analytics'
  | 'export'
  | 'settings';
