import React, { useState } from 'react';
import {
  AppState,
  OnlineAccount,
  OnlineAppId,
  MayaPockets,
  WiseClientSource,
  Transaction,
} from '../types';
import { convertCurrency, formatCurrency } from '../utils/currency';
import {
  Wallet,
  Landmark,
  PiggyBank,
  Briefcase,
  Send,
  Edit3,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  Check,
  X,
  TrendingUp,
  Calendar,
  DollarSign,
  Building2,
  ExternalLink,
  ShieldCheck,
  Trophy,
  Plane,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface WalletsManagerProps {
  appState: AppState;
  onUpdateAccount: (updatedAccount: OnlineAccount) => void;
  onTransferFunds: (
    fromId: OnlineAppId,
    fromSub: string | undefined,
    toId: OnlineAppId,
    toSub: string | undefined,
    amount: number,
    note?: string
  ) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'amountInBase'>) => void;
}

export const WalletsManager: React.FC<WalletsManagerProps> = ({
  appState,
  onUpdateAccount,
  onTransferFunds,
  onAddTransaction,
}) => {
  const { accounts, baseCurrency, customExchangeRates, transactions } = appState;

  // Modals state
  const [editingAccount, setEditingAccount] = useState<OnlineAccount | null>(null);
  const [editMode, setEditMode] = useState<'balance' | 'mayaPockets' | 'wiseClients' | 'allowance'>('balance');
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [logAdjustmentTx, setLogAdjustmentTx] = useState<boolean>(true);

  // Maya pockets edit state
  const [mayaPocketValues, setMayaPocketValues] = useState<MayaPockets>({
    emergencyFund: 0,
    firstMilly: 0,
    travel: 0,
  });

  // Wise clients edit state
  const [wiseClientValues, setWiseClientValues] = useState<WiseClientSource[]>([]);

  // GoTyme allowance edit state
  const [gotymeMonthlyBudget, setGotymeMonthlyBudget] = useState<string>('25000');

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferFrom, setTransferFrom] = useState<{ id: OnlineAppId; sub?: string }>({ id: 'wise', sub: 'comp1' });
  const [transferTo, setTransferTo] = useState<{ id: OnlineAppId; sub?: string }>({ id: 'gotyme' });
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNote, setTransferNote] = useState<string>('');

  // Quick action state (quick top up / expense)
  const [quickActionModal, setQuickActionModal] = useState<{
    account: OnlineAccount;
    type: 'income' | 'expense';
    title: string;
    pocket?: string;
  } | null>(null);
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>('');

  // Days left in current month calculation for GoTyme daily allowance
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - currentDay + 1);

  // Calculate total net worth across all 5 accounts in base currency
  const totalNetWorthInBase = accounts.reduce((acc, account) => {
    let accountTotalInNative = account.balance;
    if (account.id === 'maya' && account.mayaPockets) {
      accountTotalInNative =
        account.mayaPockets.emergencyFund +
        account.mayaPockets.firstMilly +
        account.mayaPockets.travel;
    } else if (account.id === 'wise' && account.wiseClients) {
      accountTotalInNative = account.wiseClients.reduce((sum, c) => sum + c.balance, 0);
    }
    const inBase = convertCurrency(accountTotalInNative, account.currency, baseCurrency, customExchangeRates);
    return acc + inBase;
  }, 0);

  // Helper to open edit modal for a specific account
  const handleOpenEdit = (account: OnlineAccount, mode: 'balance' | 'mayaPockets' | 'wiseClients' | 'allowance' = 'balance') => {
    setEditingAccount(account);
    setEditMode(mode);
    setNewBalanceInput(account.balance.toString());
    setEditNote('');
    setLogAdjustmentTx(true);

    if (account.mayaPockets) {
      setMayaPocketValues({ ...account.mayaPockets });
    }
    if (account.wiseClients) {
      setWiseClientValues(account.wiseClients.map((c) => ({ ...c })));
    }
    if (account.allowanceConfig) {
      setGotymeMonthlyBudget(account.allowanceConfig.monthlyBudget.toString());
    }
  };

  // Save changes from Edit Modal
  const handleSaveEdit = () => {
    if (!editingAccount) return;

    let updated = { ...editingAccount, lastUpdated: Date.now() };

    if (editMode === 'balance') {
      const numVal = parseFloat(newBalanceInput);
      if (isNaN(numVal) || numVal < 0) return;

      const diff = numVal - editingAccount.balance;
      updated.balance = numVal;

      if (logAdjustmentTx && Math.abs(diff) > 0.01) {
        onAddTransaction({
          type: diff > 0 ? 'income' : 'expense',
          amount: Math.abs(diff),
          currency: editingAccount.currency,
          category: diff > 0 ? 'Balance Adjustment (Up)' : 'Balance Adjustment (Down)',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: `${editingAccount.name} (${editingAccount.badge})`,
          notes: editNote || `Manual balance adjustment for ${editingAccount.name}`,
          tags: ['balance-adjustment', editingAccount.id],
        });
      }
    } else if (editMode === 'mayaPockets') {
      const newTotal =
        mayaPocketValues.emergencyFund +
        mayaPocketValues.firstMilly +
        mayaPocketValues.travel;
      updated.mayaPockets = { ...mayaPocketValues };
      updated.balance = newTotal;

      if (logAdjustmentTx) {
        onAddTransaction({
          type: 'income',
          amount: 0,
          currency: editingAccount.currency,
          category: 'Savings Pocket Update',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Maya (Savings)',
          notes: editNote || 'Updated Maya savings pockets (Emergency, First Milly, Travel)',
          tags: ['maya', 'pockets'],
        });
      }
    } else if (editMode === 'wiseClients') {
      const newTotal = wiseClientValues.reduce((sum, c) => sum + c.balance, 0);
      updated.wiseClients = [...wiseClientValues];
      updated.balance = newTotal;
    } else if (editMode === 'allowance') {
      const budget = parseFloat(gotymeMonthlyBudget) || 25000;
      updated.allowanceConfig = {
        monthlyBudget: budget,
        targetDailyAllowance: Math.round(budget / daysInMonth),
      };
    }

    onUpdateAccount(updated);
    setEditingAccount(null);
  };

  // Execute transfer between accounts
  const handleExecuteTransfer = () => {
    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    onTransferFunds(
      transferFrom.id,
      transferFrom.sub,
      transferTo.id,
      transferTo.sub,
      amountNum,
      transferNote
    );

    setShowTransferModal(false);
    setTransferAmount('');
    setTransferNote('');
  };

  // Execute quick action (deposit or expense)
  const handleExecuteQuickAction = () => {
    if (!quickActionModal) return;
    const amountNum = parseFloat(quickAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const { account, type, pocket } = quickActionModal;

    let pocketTag = '';
    if (pocket) {
      if (pocket.toLowerCase().includes('emergency')) pocketTag = 'emergencyFund';
      else if (pocket.toLowerCase().includes('milly')) pocketTag = 'firstMilly';
      else if (pocket.toLowerCase().includes('travel')) pocketTag = 'travel';
      else if (pocket.toLowerCase().includes('1')) pocketTag = 'comp1';
      else if (pocket.toLowerCase().includes('2')) pocketTag = 'comp2';
    }

    // Log the transaction which automatically updates accounts & syncs with savings goals via applyTransactionToAccounts
    onAddTransaction({
      type,
      amount: amountNum,
      currency: account.currency,
      category: quickCategory || (type === 'income' ? 'Deposit / Top-Up' : 'Everyday Expense'),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: pocket ? `${account.name} - ${pocket}` : `${account.name} (${account.badge})`,
      notes: quickNote || `${type === 'income' ? 'Top-up into' : 'Payment from'} ${account.name}${pocket ? ` (${pocket})` : ''}`,
      tags: [account.id, type, ...(pocketTag ? [pocketTag] : []), ...(pocket ? [pocket.toLowerCase().replace(/\s+/g, '-')] : [])],
    });

    setQuickActionModal(null);
    setQuickAmount('');
    setQuickCategory('');
    setQuickNote('');
  };

  // Helper to render account icon
  const renderAccountIcon = (id: OnlineAppId) => {
    switch (id) {
      case 'gotyme':
        return <Wallet className="w-5 h-5 text-sky-600" />;
      case 'maribank':
        return <PiggyBank className="w-5 h-5 text-orange-600" />;
      case 'maya':
        return <Landmark className="w-5 h-5 text-emerald-600" />;
      case 'wise':
        return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'gcash':
        return <Send className="w-5 h-5 text-indigo-600" />;
    }
  };

  // Recent transactions for an account
  const getAccountTransactions = (accId: OnlineAppId) => {
    return transactions.filter(
      (t) =>
        t.paymentMethod?.toLowerCase().includes(accId) ||
        (t.tags && t.tags.includes(accId))
    );
  };

  return (
    <div id="wallets-manager-container" className="space-y-6">
      {/* Top Header Card with Net Worth & Actions */}
      <div
        id="wallets-header-banner"
        className="bg-white rounded-2xl border border-violet-100/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center p-1.5 bg-gradient-to-br from-violet-700 to-purple-900 text-white rounded-xl shadow-xs">
              <Layers className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              PeraFolio Wallets & E-Banks
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Real-time tracking and synchronization across your 5 online accounts: GoTyme (allowance),
            MariBank (extras), Maya (3 savings pockets), Wise (freelance), and GCash (family & random).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-violet-50/80 border border-violet-200/70 rounded-xl px-4 py-2 text-right shadow-2xs">
            <div className="text-[10px] font-bold text-violet-800 uppercase tracking-wider">
              Total Combined Portfolio
            </div>
            <div className="text-lg font-black text-violet-950">
              {formatCurrency(totalNetWorthInBase, baseCurrency)}
            </div>
          </div>

          <button
            id="btn-open-transfer-modal"
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-violet-700/20"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer Between Apps
          </button>
        </div>
      </div>

      {/* Grid of 5 Online Accounts */}
      <div id="wallets-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. GOTYME BANK */}
        {(() => {
          const gotyme = accounts.find((a) => a.id === 'gotyme') || accounts[0];
          const monthlyBudget = gotyme.allowanceConfig?.monthlyBudget || 25000;
          const dailyRemaining = Math.max(0, gotyme.balance / daysRemainingInMonth);
          const percentUsed = Math.min(
            100,
            Math.max(0, ((monthlyBudget - gotyme.balance) / monthlyBudget) * 100)
          );

          // Today's expenses from GoTyme
          const todayStr = new Date().toISOString().split('T')[0];
          const todayExpenses = transactions
            .filter(
              (t) =>
                t.date === todayStr &&
                t.type === 'expense' &&
                (t.paymentMethod?.toLowerCase().includes('gotyme') || t.tags?.includes('gotyme'))
            )
            .reduce((sum, t) => sum + t.amount, 0);

          return (
            <div
              id="card-wallet-gotyme"
              className="bg-white rounded-xl border border-sky-100 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="bg-sky-50/70 border-b border-sky-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-200 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">GoTyme Bank</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700">
                          Monthly & Daily Allowance
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Everyday pocket & spending allowance</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-edit-gotyme-balance"
                      onClick={() => handleOpenEdit(gotyme, 'balance')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-100/70 hover:bg-sky-200/70 rounded-md transition-colors"
                      title="Edit current GoTyme balance"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Balance
                    </button>
                  </div>
                </div>

                {/* Big Balance */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Available Allowance Balance</span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(gotyme.balance, gotyme.currency)}
                    </div>
                  </div>
                  {gotyme.currency !== baseCurrency && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Converted</span>
                      <div className="text-xs font-medium text-slate-600">
                        ≈ {formatCurrency(convertCurrency(gotyme.balance, gotyme.currency, baseCurrency, customExchangeRates), baseCurrency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Allowance Pacing Section */}
              <div className="p-4 space-y-3.5 flex-1">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-600" />
                      Daily Allowance Pacing
                    </span>
                    <button
                      onClick={() => handleOpenEdit(gotyme, 'allowance')}
                      className="text-[11px] text-sky-600 hover:text-sky-700 underline"
                    >
                      Target: {formatCurrency(monthlyBudget, gotyme.currency)}/mo
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center py-1">
                    <div className="bg-white rounded p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-500">Safe to Spend Daily</div>
                      <div className="text-sm font-bold text-sky-700">
                        {formatCurrency(dailyRemaining, gotyme.currency)}
                        <span className="text-[10px] font-normal text-slate-500">/day</span>
                      </div>
                      <div className="text-[9px] text-slate-400">{daysRemainingInMonth} days left this month</div>
                    </div>

                    <div className="bg-white rounded p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-500">Spent Today</div>
                      <div className="text-sm font-bold text-slate-800">
                        {formatCurrency(todayExpenses, gotyme.currency)}
                      </div>
                      <div className="text-[9px] text-emerald-600">
                        {todayExpenses <= dailyRemaining ? '✓ Within daily limit' : '⚠️ Over daily pace'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Note: Allowance envelope for food, commute, & daily purchases.</span>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 flex items-center gap-2">
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: gotyme,
                      type: 'expense',
                      title: 'Log GoTyme Daily Expense',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                  Log Expense
                </button>
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: gotyme,
                      type: 'income',
                      title: 'Top-up GoTyme Allowance',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Top-up
                </button>
                <button
                  onClick={() => {
                    setTransferTo({ id: 'gotyme' });
                    setShowTransferModal(true);
                  }}
                  className="py-1.5 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Transfer into GoTyme"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Transfer In
                </button>
              </div>
            </div>
          );
        })()}

        {/* 2. MARIBANK */}
        {(() => {
          const maribank = accounts.find((a) => a.id === 'maribank') || accounts[1];

          return (
            <div
              id="card-wallet-maribank"
              className="bg-white rounded-xl border border-orange-100 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="bg-orange-50/70 border-b border-orange-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-200 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">MariBank</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                          Extras & Buffer
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Buffer cushion & spontaneous extras</p>
                    </div>
                  </div>

                  <button
                    id="btn-edit-maribank-balance"
                    onClick={() => handleOpenEdit(maribank, 'balance')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-100/70 hover:bg-orange-200/70 rounded-md transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Balance
                  </button>
                </div>

                {/* Big Balance */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Current Extra Reserve</span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(maribank.balance, maribank.currency)}
                    </div>
                  </div>
                  {maribank.currency !== baseCurrency && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Converted</span>
                      <div className="text-xs font-medium text-slate-600">
                        ≈ {formatCurrency(convertCurrency(maribank.balance, maribank.currency, baseCurrency, customExchangeRates), baseCurrency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buffer Health & Status */}
              <div className="p-4 space-y-3 flex-1">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">Surplus Reserve Status</span>
                    <span className="text-orange-600 font-medium text-[11px]">Protected Cushion</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    MariBank serves as your liquid buffer for extras. When daily allowance in GoTyme runs low or unexpected
                    discretionary expenses occur, transfer from here without breaking your Maya savings.
                  </p>
                </div>

                <div className="p-2.5 bg-orange-50/50 rounded-lg border border-orange-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Quick transfer to GoTyme allowance:</span>
                  <button
                    onClick={() => {
                      setTransferFrom({ id: 'maribank' });
                      setTransferTo({ id: 'gotyme' });
                      setShowTransferModal(true);
                    }}
                    className="text-orange-700 font-medium hover:underline flex items-center gap-1"
                  >
                    Send to GoTyme <ArrowRightLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 flex items-center gap-2">
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: maribank,
                      type: 'income',
                      title: 'Add Surplus to MariBank',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-orange-600" />
                  Add Extras
                </button>
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: maribank,
                      type: 'expense',
                      title: 'Withdraw from MariBank',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                  Withdraw
                </button>
                <button
                  onClick={() => {
                    setTransferFrom({ id: 'maribank' });
                    setShowTransferModal(true);
                  }}
                  className="py-1.5 px-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Transfer Out
                </button>
              </div>
            </div>
          );
        })()}

        {/* 3. MAYA (SAVINGS - 3 WALLETS) */}
        {(() => {
          const maya = accounts.find((a) => a.id === 'maya') || accounts[2];
          const pockets = maya.mayaPockets || {
            emergencyFund: 75000,
            firstMilly: 65000,
            travel: 25000,
          };
          const totalMayaBalance = pockets.emergencyFund + pockets.firstMilly + pockets.travel;

          // Target goals reference
          const emergencyTarget = 300000;
          const firstMillyTarget = 1000000;
          const travelTarget = 150000;

          return (
            <div
              id="card-wallet-maya"
              className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden flex flex-col justify-between lg:col-span-2"
            >
              {/* Header */}
              <div className="bg-emerald-50/70 border-b border-emerald-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-200 flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">Maya Savings</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          3 Dedicated Savings Wallets
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                          ⚡ Synced with Savings Goals
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Primary savings hub strictly partitioned into Emergency Fund, First Milly, and Travel
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-edit-maya-pockets"
                      onClick={() => handleOpenEdit(maya, 'mayaPockets')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit 3 Wallets
                    </button>
                  </div>
                </div>

                {/* Total Maya Balance */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Total Maya Savings (Sum of 3 Wallets)</span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(totalMayaBalance, maya.currency)}
                    </div>
                  </div>
                  {maya.currency !== baseCurrency && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Converted</span>
                      <div className="text-xs font-medium text-slate-600">
                        ≈ {formatCurrency(convertCurrency(totalMayaBalance, maya.currency, baseCurrency, customExchangeRates), baseCurrency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* The 3 Sub-Wallets Display */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Pocket 1: Emergency Fund */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Emergency Fund
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">6-Mo Safety</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 mb-1">
                        {formatCurrency(pockets.emergencyFund, maya.currency)}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-2">
                        Target: {formatCurrency(emergencyTarget, maya.currency)} (
                        {Math.round((pockets.emergencyFund / emergencyTarget) * 100)}%)
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (pockets.emergencyFund / emergencyTarget) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() =>
                          setQuickActionModal({
                            account: maya,
                            type: 'income',
                            title: 'Deposit into Emergency Fund',
                            pocket: 'Emergency Fund',
                          })
                        }
                        className="text-emerald-700 font-medium hover:underline text-[11px]"
                      >
                        + Deposit
                      </button>
                      <button
                        onClick={() => {
                          setTransferFrom({ id: 'maya', sub: 'emergencyFund' });
                          setShowTransferModal(true);
                        }}
                        className="text-slate-500 hover:text-slate-800 text-[11px]"
                      >
                        Move out
                      </button>
                    </div>
                  </div>

                  {/* Pocket 2: First Milly */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Trophy className="w-4 h-4 text-purple-600" />
                          First Milly
                        </span>
                        <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          ₱1,000,000
                        </span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 mb-1">
                        {formatCurrency(pockets.firstMilly, maya.currency)}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-2">
                        Target: ₱1,000,000 (
                        {((pockets.firstMilly / firstMillyTarget) * 100).toFixed(1)}%)
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (pockets.firstMilly / firstMillyTarget) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() =>
                          setQuickActionModal({
                            account: maya,
                            type: 'income',
                            title: 'Deposit into First Milly',
                            pocket: 'First Milly',
                          })
                        }
                        className="text-purple-700 font-medium hover:underline text-[11px]"
                      >
                        + Deposit
                      </button>
                      <button
                        onClick={() => {
                          setTransferFrom({ id: 'maya', sub: 'firstMilly' });
                          setShowTransferModal(true);
                        }}
                        className="text-slate-500 hover:text-slate-800 text-[11px]"
                      >
                        Move out
                      </button>
                    </div>
                  </div>

                  {/* Pocket 3: Travel */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Plane className="w-4 h-4 text-blue-600" />
                          Travel
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">Adventures</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 mb-1">
                        {formatCurrency(pockets.travel, maya.currency)}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-2">
                        Target: {formatCurrency(travelTarget, maya.currency)} (
                        {Math.round((pockets.travel / travelTarget) * 100)}%)
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (pockets.travel / travelTarget) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() =>
                          setQuickActionModal({
                            account: maya,
                            type: 'income',
                            title: 'Deposit into Travel Pocket',
                            pocket: 'Travel',
                          })
                        }
                        className="text-blue-700 font-medium hover:underline text-[11px]"
                      >
                        + Deposit
                      </button>
                      <button
                        onClick={() => {
                          setTransferFrom({ id: 'maya', sub: 'travel' });
                          setShowTransferModal(true);
                        }}
                        className="text-slate-500 hover:text-slate-800 text-[11px]"
                      >
                        Move out
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  Tip: Maya pockets stay ring-fenced so you never accidentally spend your savings on daily living.
                </span>
                <button
                  onClick={() => handleOpenEdit(maya, 'mayaPockets')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Quick Edit Pocket Balances
                </button>
              </div>
            </div>
          );
        })()}

        {/* 4. WISE (FREELANCE - 2 CLIENT COMPANIES) */}
        {(() => {
          const wise = accounts.find((a) => a.id === 'wise') || accounts[3];
          const clients = wise.wiseClients || [
            {
              id: 'wise-comp-1',
              companyName: 'TechVanguard Inc (Company 1)',
              currency: 'USD',
              balance: 1450,
              expectedMonthly: 2200,
              payoutSchedule: 'Bi-monthly',
            },
            {
              id: 'wise-comp-2',
              companyName: 'Studio Nexa Creative (Company 2)',
              currency: 'USD',
              balance: 1000,
              expectedMonthly: 1500,
              payoutSchedule: 'Monthly on 1st',
            },
          ];
          const totalWiseUSD = clients.reduce((sum, c) => sum + c.balance, 0);
          const totalWiseBase = convertCurrency(totalWiseUSD, wise.currency, baseCurrency, customExchangeRates);

          return (
            <div
              id="card-wallet-wise"
              className="bg-white rounded-xl border border-blue-100 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="bg-blue-50/70 border-b border-blue-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-200 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">Wise</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                          Freelance Salaries (2 Companies)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Multi-currency salary receiver</p>
                    </div>
                  </div>

                  <button
                    id="btn-edit-wise-clients"
                    onClick={() => handleOpenEdit(wise, 'wiseClients')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100/70 hover:bg-blue-200/70 rounded-md transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Companies
                  </button>
                </div>

                {/* Big Balance */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Total Wise Holding</span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(totalWiseUSD, wise.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">In Base ({baseCurrency})</span>
                    <div className="text-sm font-bold text-blue-700">
                      ≈ {formatCurrency(totalWiseBase, baseCurrency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* The 2 Freelance Companies Breakdown */}
              <div className="p-4 space-y-3 flex-1">
                <div className="text-xs font-semibold text-slate-700 mb-1">
                  Salary Breakdown by Client Company
                </div>

                <div className="space-y-2.5">
                  {clients.map((client, idx) => (
                    <div
                      key={client.id}
                      className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-800">{client.companyName}</div>
                        <div className="text-[10px] text-slate-500">
                          Schedule: {client.payoutSchedule || 'Monthly'} • Expected: {formatCurrency(client.expectedMonthly || 0, client.currency)}/mo
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {formatCurrency(client.balance, client.currency)}
                        </div>
                        <button
                          onClick={() => {
                            setTransferFrom({ id: 'wise', sub: client.id });
                            setTransferTo({ id: 'gotyme' });
                            setShowTransferModal(true);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 justify-end"
                        >
                          Withdraw <ArrowRightLeft className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 flex items-center gap-2">
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: wise,
                      type: 'income',
                      title: 'Record Freelance Payout (Company 1)',
                      pocket: 'Company 1',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                  Add Co. 1 Payout
                </button>
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: wise,
                      type: 'income',
                      title: 'Record Freelance Payout (Company 2)',
                      pocket: 'Company 2',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                  Add Co. 2 Payout
                </button>
                <button
                  onClick={() => {
                    setTransferFrom({ id: 'wise' });
                    setTransferTo({ id: 'gotyme' });
                    setShowTransferModal(true);
                  }}
                  className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Withdraw to Bank
                </button>
              </div>
            </div>
          );
        })()}

        {/* 5. GCASH (FAMILY & RANDOM MONEY) */}
        {(() => {
          const gcash = accounts.find((a) => a.id === 'gcash') || accounts[4];

          return (
            <div
              id="card-wallet-gcash"
              className="bg-white rounded-xl border border-indigo-100 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="bg-indigo-50/70 border-b border-indigo-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-200 flex items-center justify-center">
                      <Send className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">GCash</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                          Family & Random Funds
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Peer transfers, family pot & random remittances</p>
                    </div>
                  </div>

                  <button
                    id="btn-edit-gcash-balance"
                    onClick={() => handleOpenEdit(gcash, 'balance')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-100/70 hover:bg-indigo-200/70 rounded-md transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Balance
                  </button>
                </div>

                {/* Big Balance */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Available GCash Balance</span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(gcash.balance, gcash.currency)}
                    </div>
                  </div>
                  {gcash.currency !== baseCurrency && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Converted</span>
                      <div className="text-xs font-medium text-slate-600">
                        ≈ {formatCurrency(convertCurrency(gcash.balance, gcash.currency, baseCurrency, customExchangeRates), baseCurrency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Family & Random money context */}
              <div className="p-4 space-y-3 flex-1">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">Family & Random Cashflow</span>
                    <span className="text-indigo-600 font-medium text-[11px]">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Where your family sends money, stores pooled funds, or sends random peer-to-peer transfers.
                    Keep this balance tracked to prevent mixing personal allowance with family money.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() =>
                      setQuickActionModal({
                        account: gcash,
                        type: 'income',
                        title: 'Received from Family (GCash)',
                      })
                    }
                    className="p-2 bg-indigo-50/50 hover:bg-indigo-100/60 rounded-lg border border-indigo-100 text-indigo-800 text-left transition-colors"
                  >
                    <div className="font-semibold text-[11px]">+ Received from Family</div>
                    <div className="text-[9px] text-slate-500">Log incoming remittance</div>
                  </button>
                  <button
                    onClick={() =>
                      setQuickActionModal({
                        account: gcash,
                        type: 'expense',
                        title: 'Send Money to Family (GCash)',
                      })
                    }
                    className="p-2 bg-rose-50/50 hover:bg-rose-100/60 rounded-lg border border-rose-100 text-rose-800 text-left transition-colors"
                  >
                    <div className="font-semibold text-[11px]">- Send to Family</div>
                    <div className="text-[9px] text-slate-500">Log family support/bill</div>
                  </button>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 flex items-center gap-2">
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: gcash,
                      type: 'income',
                      title: 'Top-up / Received into GCash',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  Received
                </button>
                <button
                  onClick={() =>
                    setQuickActionModal({
                      account: gcash,
                      type: 'expense',
                      title: 'Random Expense from GCash',
                    })
                  }
                  className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                  Spend / Send
                </button>
                <button
                  onClick={() => {
                    setTransferFrom({ id: 'gcash' });
                    setShowTransferModal(true);
                  }}
                  className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Transfer
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* EDIT MODAL */}
      {editingAccount && (
        <div
          id="modal-edit-account"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderAccountIcon(editingAccount.id)}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editMode === 'mayaPockets'
                      ? 'Edit Maya Savings Wallets'
                      : editMode === 'wiseClients'
                      ? 'Edit Wise Freelance Companies'
                      : editMode === 'allowance'
                      ? 'Adjust Monthly Allowance Target'
                      : `Edit ${editingAccount.name} Balance`}
                  </h3>
                  <p className="text-[11px] text-slate-500">{editingAccount.purpose}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Mode: Single Balance Edit */}
              {editMode === 'balance' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Current Live Balance ({editingAccount.currency})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">
                        {editingAccount.currency}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={newBalanceInput}
                        onChange={(e) => setNewBalanceInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-12 pr-3 py-2 text-base font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Adjustment Reason / Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="e.g., ATM cash withdrawal or reconciled with app balance"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="chk-log-tx"
                      checked={logAdjustmentTx}
                      onChange={(e) => setLogAdjustmentTx(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="chk-log-tx" className="text-xs text-slate-600 cursor-pointer">
                      Log a transaction record in the ledger for this balance change
                    </label>
                  </div>
                </div>
              )}

              {/* Mode: Maya 3 Pockets */}
              {editMode === 'mayaPockets' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Update the money stored across your 3 Maya pockets. Total Maya savings will update automatically.
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" /> Emergency Fund
                      </span>
                      <span className="text-[10px] text-slate-400">Target: ₱300,000</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={mayaPocketValues.emergencyFund}
                      onChange={(e) =>
                        setMayaPocketValues({
                          ...mayaPocketValues,
                          emergencyFund: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-purple-700">
                        <Trophy className="w-3.5 h-3.5" /> First Milly
                      </span>
                      <span className="text-[10px] text-slate-400">Target: ₱1,000,000</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={mayaPocketValues.firstMilly}
                      onChange={(e) =>
                        setMayaPocketValues({
                          ...mayaPocketValues,
                          firstMilly: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-blue-700">
                        <Plane className="w-3.5 h-3.5" /> Travel
                      </span>
                      <span className="text-[10px] text-slate-400">Target: ₱150,000</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={mayaPocketValues.travel}
                      onChange={(e) =>
                        setMayaPocketValues({
                          ...mayaPocketValues,
                          travel: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-2.5 flex items-center justify-between text-xs font-medium text-emerald-900">
                    <span>Computed Maya Total:</span>
                    <span className="font-bold text-sm">
                      {formatCurrency(
                        mayaPocketValues.emergencyFund +
                          mayaPocketValues.firstMilly +
                          mayaPocketValues.travel,
                        editingAccount.currency
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Mode: Wise Clients */}
              {editMode === 'wiseClients' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Update current balances received from your 2 freelance companies.
                  </p>

                  {wiseClientValues.map((client, idx) => (
                    <div key={client.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="text-xs font-semibold text-slate-800">{client.companyName}</div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Current Balance ({client.currency})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={client.balance}
                          onChange={(e) => {
                            const updated = [...wiseClientValues];
                            updated[idx].balance = parseFloat(e.target.value) || 0;
                            setWiseClientValues(updated);
                          }}
                          className="w-full px-3 py-1.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="bg-blue-50 rounded-lg p-2.5 flex items-center justify-between text-xs font-medium text-blue-900">
                    <span>Total Wise Balance:</span>
                    <span className="font-bold text-sm">
                      {formatCurrency(
                        wiseClientValues.reduce((sum, c) => sum + c.balance, 0),
                        editingAccount.currency
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Mode: GoTyme Allowance */}
              {editMode === 'allowance' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Configure your monthly allowance envelope to calculate accurate daily spending limits.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Monthly Budget Envelope ({editingAccount.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={gotymeMonthlyBudget}
                      onChange={(e) => setGotymeMonthlyBudget(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="bg-sky-50 rounded-lg p-2.5 text-xs text-sky-900 space-y-1">
                    <div className="flex justify-between">
                      <span>Days in current month:</span>
                      <span className="font-semibold">{daysInMonth} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Days remaining:</span>
                      <span className="font-semibold">{daysRemainingInMonth} days</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div
          id="modal-transfer-funds"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-900 text-white rounded-lg">
                  <ArrowRightLeft className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Transfer Between Online Apps</h3>
                  <p className="text-[11px] text-slate-500">
                    Move money smoothly between Wise, GoTyme, MariBank, Maya, or GCash
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* FROM */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transfer From</label>
                <select
                  value={`${transferFrom.id}${transferFrom.sub ? `:${transferFrom.sub}` : ''}`}
                  onChange={(e) => {
                    const [id, sub] = e.target.value.split(':');
                    setTransferFrom({ id: id as OnlineAppId, sub });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="wise:comp1">Wise - Company 1 Freelance ($)</option>
                  <option value="wise:comp2">Wise - Company 2 Freelance ($)</option>
                  <option value="gotyme">GoTyme Bank (Allowance)</option>
                  <option value="maribank">MariBank (Extras)</option>
                  <option value="maya:emergencyFund">Maya - Emergency Fund</option>
                  <option value="maya:firstMilly">Maya - First Milly</option>
                  <option value="maya:travel">Maya - Travel Pocket</option>
                  <option value="gcash">GCash (Family & Random)</option>
                </select>
              </div>

              {/* TO */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transfer To</label>
                <select
                  value={`${transferTo.id}${transferTo.sub ? `:${transferTo.sub}` : ''}`}
                  onChange={(e) => {
                    const [id, sub] = e.target.value.split(':');
                    setTransferTo({ id: id as OnlineAppId, sub });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="gotyme">GoTyme Bank (Monthly Allowance)</option>
                  <option value="maya:emergencyFund">Maya - Emergency Fund</option>
                  <option value="maya:firstMilly">Maya - First Milly</option>
                  <option value="maya:travel">Maya - Travel Pocket</option>
                  <option value="maribank">MariBank (Extras Cushion)</option>
                  <option value="gcash">GCash (Family & Random)</option>
                  <option value="wise:comp1">Wise - Company 1 ($)</option>
                  <option value="wise:comp2">Wise - Company 2 ($)</option>
                </select>
              </div>

              {/* AMOUNT */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount in Source Currency
                </label>
                <input
                  type="number"
                  step="any"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-base font-bold text-slate-900 border border-slate-300 rounded-lg"
                />
              </div>

              {/* CURRENCY CONVERSION PREVIEW IF APPLICABLE */}
              {(() => {
                const fromAccount = accounts.find((a) => a.id === transferFrom.id);
                const toAccount = accounts.find((a) => a.id === transferTo.id);
                const num = parseFloat(transferAmount);

                if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency && !isNaN(num) && num > 0) {
                  const converted = convertCurrency(
                    num,
                    fromAccount.currency,
                    toAccount.currency,
                    customExchangeRates
                  );
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between text-slate-600 mb-1">
                        <span>Currency Conversion:</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(num, fromAccount.currency)} = {formatCurrency(converted, toAccount.currency)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Converted at current exchange rates. Both accounts will be credited/debited in their native currency.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* NOTE */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transfer Note (Optional)</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g., Weekly allowance allocation from freelance salary"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransfer}
                disabled={!transferAmount || parseFloat(transferAmount) <= 0}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL (DEPOSIT / EXPENSE) */}
      {quickActionModal && (
        <div
          id="modal-quick-action"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderAccountIcon(quickActionModal.account.id)}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{quickActionModal.title}</h3>
                  <p className="text-[10px] text-slate-500">
                    {quickActionModal.account.name} {quickActionModal.pocket ? `(${quickActionModal.pocket})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickActionModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount ({quickActionModal.account.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-base font-bold text-slate-900 border border-slate-300 rounded-lg"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  placeholder={
                    quickActionModal.type === 'income'
                      ? 'e.g., Allowance Top-Up, Freelance Payout, Remittance'
                      : 'e.g., Dining Out, Groceries, Grab, Bills'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="What was this for?"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setQuickActionModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteQuickAction}
                disabled={!quickAmount || parseFloat(quickAmount) <= 0}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
