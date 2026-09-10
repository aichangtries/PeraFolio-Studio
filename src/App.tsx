import React, { useState, useEffect } from 'react';
import {
  AppState,
  ActiveTab,
  Transaction,
  SavingsGoal,
  RecurringTransaction,
  OnlineAccount,
  OnlineAppId,
  MayaPockets,
} from './types';
import { loadAppState, saveAppState } from './utils/storage';
import { convertCurrency, SUPPORTED_CURRENCIES, getCurrencyConfig } from './utils/currency';
import {
  applyTransactionToAccounts,
  syncSavingsGoalsWithMayaPockets,
  syncAccountWhenGoalUpdated,
  syncMayaWhenGoalCreated,
  syncMayaWhenGoalDeleted,
  reconcileMayaAndSavingsGoals,
} from './utils/walletSync';
import { OverviewDashboard } from './components/OverviewDashboard';
import { TransactionsManager } from './components/TransactionsManager';
import { WalletsManager } from './components/WalletsManager';
import { SavingsGoalsTracker } from './components/SavingsGoalsTracker';
import { RecurringManager } from './components/RecurringManager';
import { VisualCharts } from './components/VisualCharts';
import { ExportCenter } from './components/ExportCenter';
import { CurrencySettings } from './components/CurrencySettings';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Repeat,
  BarChart3,
  FileSpreadsheet,
  Globe,
  Plus,
  ShieldCheck,
  ChevronDown,
  Layers,
  Wallet,
} from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Sync to local storage on any state change
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Recalculate all transactions' amountInBase when base currency or exchange rates change
  const handleSelectBaseCurrency = (newBase: string) => {
    setAppState((prev) => {
      const updatedTransactions = prev.transactions.map((t) => ({
        ...t,
        amountInBase: convertCurrency(
          t.amount,
          t.currency,
          newBase,
          prev.customExchangeRates
        ),
      }));

      return {
        ...prev,
        baseCurrency: newBase,
        transactions: updatedTransactions,
      };
    });
    setShowCurrencyDropdown(false);
  };

  const handleUpdateRates = (rates: Record<string, number>) => {
    setAppState((prev) => {
      const updatedTransactions = prev.transactions.map((t) => ({
        ...t,
        amountInBase: convertCurrency(
          t.amount,
          t.currency,
          prev.baseCurrency,
          rates
        ),
      }));

      return {
        ...prev,
        customExchangeRates: rates,
        lastExchangeRateUpdate: new Date().toISOString(),
        transactions: updatedTransactions,
      };
    });
  };

  // Transaction Handlers - fully synchronized with online accounts and Maya savings pockets
  const handleAddTransaction = (t: Transaction) => {
    setAppState((prev) => {
      const { updatedAccounts, updatedMayaPockets } = applyTransactionToAccounts(
        prev.accounts || [],
        t,
        'apply',
        prev.customExchangeRates
      );

      let updatedGoals = prev.savingsGoals;
      if (updatedMayaPockets) {
        updatedGoals = syncSavingsGoalsWithMayaPockets(prev.savingsGoals, updatedMayaPockets);
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: updatedGoals,
        transactions: [t, ...prev.transactions],
      };
    });
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setAppState((prev) => {
      const oldTx = prev.transactions.find((t) => t.id === updated.id);
      let currentAccounts = prev.accounts || [];

      if (oldTx) {
        const reverted = applyTransactionToAccounts(
          currentAccounts,
          oldTx,
          'revert',
          prev.customExchangeRates
        );
        currentAccounts = reverted.updatedAccounts;
      }

      const applied = applyTransactionToAccounts(
        currentAccounts,
        updated,
        'apply',
        prev.customExchangeRates
      );

      let updatedGoals = prev.savingsGoals;
      if (applied.updatedMayaPockets) {
        updatedGoals = syncSavingsGoalsWithMayaPockets(prev.savingsGoals, applied.updatedMayaPockets);
      }

      return {
        ...prev,
        accounts: applied.updatedAccounts,
        savingsGoals: updatedGoals,
        transactions: prev.transactions.map((t) => (t.id === updated.id ? updated : t)),
      };
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setAppState((prev) => {
      const oldTx = prev.transactions.find((t) => t.id === id);
      let currentAccounts = prev.accounts || [];
      let updatedGoals = prev.savingsGoals;

      if (oldTx) {
        const reverted = applyTransactionToAccounts(
          currentAccounts,
          oldTx,
          'revert',
          prev.customExchangeRates
        );
        currentAccounts = reverted.updatedAccounts;
        if (reverted.updatedMayaPockets) {
          updatedGoals = syncSavingsGoalsWithMayaPockets(prev.savingsGoals, reverted.updatedMayaPockets);
        }
      }

      return {
        ...prev,
        accounts: currentAccounts,
        savingsGoals: updatedGoals,
        transactions: prev.transactions.filter((t) => t.id !== id),
      };
    });
  };

  // Online Accounts & Wallets Synchronization Handlers
  const handleUpdateAccount = (updatedAccount: OnlineAccount) => {
    setAppState((prev) => {
      const updatedAccounts = (prev.accounts || []).map((a) =>
        a.id === updatedAccount.id ? updatedAccount : a
      );

      if (updatedAccount.id === 'maya') {
        const { updatedAccounts: syncedAccounts, updatedSavingsGoals } = reconcileMayaAndSavingsGoals(
          updatedAccounts,
          prev.savingsGoals
        );
        return {
          ...prev,
          accounts: syncedAccounts,
          savingsGoals: updatedSavingsGoals,
        };
      }

      return {
        ...prev,
        accounts: updatedAccounts,
      };
    });
  };

  const handleTransferFunds = (
    fromId: OnlineAppId,
    fromSub: string | undefined,
    toId: OnlineAppId,
    toSub: string | undefined,
    amount: number,
    note?: string
  ) => {
    setAppState((prev) => {
      const fromAcc = (prev.accounts || []).find((a) => a.id === fromId);
      const toAcc = (prev.accounts || []).find((a) => a.id === toId);
      if (!fromAcc || !toAcc || amount <= 0) return prev;

      const convertedAmount = convertCurrency(
        amount,
        fromAcc.currency,
        toAcc.currency,
        prev.customExchangeRates
      );

      let updatedMayaPockets: MayaPockets | undefined = undefined;

      const updatedAccounts = (prev.accounts || []).map((acc) => {
        // Debit source
        if (acc.id === fromId) {
          const cloned = { ...acc, lastUpdated: Date.now() };
          if (acc.id === 'wise' && cloned.wiseClients) {
            const clients = cloned.wiseClients.map((c) => ({ ...c }));
            const idx = fromSub === 'comp2' ? 1 : 0;
            if (clients[idx]) {
              clients[idx].balance = Math.max(0, (clients[idx].balance || 0) - amount);
            }
            cloned.wiseClients = clients;
            cloned.balance = clients.reduce((sum, c) => sum + c.balance, 0);
            return cloned;
          }
          if (acc.id === 'maya' && cloned.mayaPockets) {
            const pockets = { ...cloned.mayaPockets };
            const pKey: keyof MayaPockets = (fromSub as keyof MayaPockets) || 'emergencyFund';
            pockets[pKey] = Math.max(0, (pockets[pKey] || 0) - amount);
            cloned.mayaPockets = pockets;
            cloned.balance = pockets.emergencyFund + pockets.firstMilly + pockets.travel;
            updatedMayaPockets = pockets;
            return cloned;
          }
          cloned.balance = Math.max(0, cloned.balance - amount);
          return cloned;
        }

        // Credit destination
        if (acc.id === toId) {
          const cloned = { ...acc, lastUpdated: Date.now() };
          if (acc.id === 'maya' && cloned.mayaPockets) {
            const pockets = { ...cloned.mayaPockets };
            const pKey: keyof MayaPockets = (toSub as keyof MayaPockets) || 'emergencyFund';
            pockets[pKey] = (pockets[pKey] || 0) + convertedAmount;
            cloned.mayaPockets = pockets;
            cloned.balance = pockets.emergencyFund + pockets.firstMilly + pockets.travel;
            updatedMayaPockets = pockets;
            return cloned;
          }
          if (acc.id === 'wise' && cloned.wiseClients) {
            const clients = cloned.wiseClients.map((c) => ({ ...c }));
            const idx = toSub === 'comp2' ? 1 : 0;
            if (clients[idx]) {
              clients[idx].balance = (clients[idx].balance || 0) + convertedAmount;
            }
            cloned.wiseClients = clients;
            cloned.balance = clients.reduce((sum, c) => sum + c.balance, 0);
            return cloned;
          }
          cloned.balance = cloned.balance + convertedAmount;
          return cloned;
        }

        return acc;
      });

      let updatedGoals = prev.savingsGoals;
      if (updatedMayaPockets) {
        updatedGoals = syncSavingsGoalsWithMayaPockets(prev.savingsGoals, updatedMayaPockets);
      }

      const fromLabel = fromSub ? `${fromAcc.name} (${fromSub})` : fromAcc.name;
      const toLabel = toSub ? `${toAcc.name} (${toSub})` : toAcc.name;
      const transferTx: Transaction = {
        id: 'tx-transfer-' + Date.now(),
        type: 'expense',
        amount,
        currency: fromAcc.currency,
        amountInBase: convertCurrency(
          amount,
          fromAcc.currency,
          prev.baseCurrency,
          prev.customExchangeRates
        ),
        category: 'Inter-Account Transfer',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: `${fromAcc.name} ➔ ${toAcc.name}`,
        notes: `Transfer from ${fromLabel} to ${toLabel}${note ? `: ${note}` : ''}`,
        tags: ['transfer', fromAcc.id, toAcc.id],
        createdAt: Date.now(),
      };

      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: updatedGoals,
        transactions: [transferTx, ...prev.transactions],
      };
    });
  };

  // Savings Goal Handlers & Cross-Account Synchronization
  const handleAddGoal = (goal: SavingsGoal) => {
    setAppState((prev) => {
      const { updatedAccounts, updatedGoal } = syncMayaWhenGoalCreated(prev.accounts || [], goal);
      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: [updatedGoal, ...prev.savingsGoals],
      };
    });
  };

  const handleUpdateGoal = (updated: SavingsGoal) => {
    setAppState((prev) => {
      const updatedGoals = prev.savingsGoals.map((g) => (g.id === updated.id ? updated : g));
      const { updatedAccounts, updatedSavingsGoals } = reconcileMayaAndSavingsGoals(
        prev.accounts || [],
        updatedGoals
      );
      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: updatedSavingsGoals,
      };
    });
  };

  const handleGoalFundAdjusted = (
    goal: SavingsGoal,
    actionType: 'deposit' | 'withdraw',
    amount: number,
    sourceWalletId: string,
    note: string
  ) => {
    setAppState((prev) => {
      const updatedGoals = prev.savingsGoals.map((g) => (g.id === goal.id ? goal : g));

      const walletIdToUse =
        sourceWalletId === 'auto' || !sourceWalletId || sourceWalletId === 'none'
          ? undefined
          : (sourceWalletId as OnlineAppId);

      const { updatedAccounts, updatedPockets } = syncAccountWhenGoalUpdated(
        prev.accounts || [],
        goal,
        actionType,
        amount,
        walletIdToUse
      );

      const isMaya =
        goal.isSyncedWithMaya ||
        goal.name.toLowerCase().includes('emergency') ||
        goal.name.toLowerCase().includes('milly') ||
        goal.name.toLowerCase().includes('travel') ||
        goal.name.toLowerCase().includes('maya');

      let paymentMethodName = 'Maya Savings Pocket';
      if (walletIdToUse) {
        const matched = (prev.accounts || []).find((a) => a.id === walletIdToUse);
        paymentMethodName = matched ? matched.name : walletIdToUse.toUpperCase();
      } else if (isMaya) {
        paymentMethodName = `Maya - ${goal.name}`;
      }

      const txType = actionType === 'deposit' ? 'expense' : 'income';
      const goalTx: Transaction = {
        id: 'tx-goal-' + Date.now(),
        type: txType,
        amount,
        currency: prev.baseCurrency,
        amountInBase: amount,
        category: 'Savings & Investments',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethodName,
        notes: `${actionType === 'deposit' ? 'Deposit into' : 'Withdrawal from'} goal "${goal.name}"${
          note ? `: ${note}` : ''
        }`,
        tags: ['goal-savings', goal.id, ...(walletIdToUse ? [walletIdToUse] : ['maya'])],
        createdAt: Date.now(),
      };

      let finalGoals = updatedGoals;
      if (updatedPockets) {
        finalGoals = syncSavingsGoalsWithMayaPockets(updatedGoals, updatedPockets);
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: finalGoals,
        transactions: [goalTx, ...prev.transactions],
      };
    });
  };

  const handleDeleteGoal = (id: string) => {
    setAppState((prev) => {
      const goalToDelete = prev.savingsGoals.find((g) => g.id === id);
      const remainingGoals = prev.savingsGoals.filter((g) => g.id !== id);
      const updatedAccounts = goalToDelete
        ? syncMayaWhenGoalDeleted(prev.accounts || [], goalToDelete)
        : prev.accounts || [];

      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: remainingGoals,
      };
    });
  };

  const handleSyncMayaWithSavings = () => {
    setAppState((prev) => {
      const { updatedAccounts, updatedSavingsGoals } = reconcileMayaAndSavingsGoals(
        prev.accounts || [],
        prev.savingsGoals
      );
      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: updatedSavingsGoals,
      };
    });
  };

  // Recurring Handlers
  const handleAddRecurring = (rec: RecurringTransaction) => {
    setAppState((prev) => ({
      ...prev,
      recurring: [rec, ...prev.recurring],
    }));
  };

  const handleUpdateRecurring = (updated: RecurringTransaction) => {
    setAppState((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) => (r.id === updated.id ? updated : r)),
    }));
  };

  const handleDeleteRecurring = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      recurring: prev.recurring.filter((r) => r.id !== id),
    }));
  };

  const handleTriggerRecurring = (rec: RecurringTransaction) => {
    const amountInBase = convertCurrency(
      rec.amount,
      rec.currency,
      appState.baseCurrency,
      appState.customExchangeRates
    );

    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      type: rec.type,
      amount: rec.amount,
      currency: rec.currency,
      amountInBase,
      category: rec.category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: rec.paymentMethod,
      notes: `Recurring scheduled: ${rec.title}`,
      tags: ['recurring', rec.frequency],
      recurringId: rec.id,
      createdAt: Date.now(),
    };

    // Calculate next due date
    const curDate = new Date(rec.nextDueDate);
    if (rec.frequency === 'daily') curDate.setDate(curDate.getDate() + 1);
    else if (rec.frequency === 'weekly') curDate.setDate(curDate.getDate() + 7);
    else if (rec.frequency === 'bi-weekly') curDate.setDate(curDate.getDate() + 14);
    else if (rec.frequency === 'monthly') curDate.setMonth(curDate.getMonth() + 1);
    else if (rec.frequency === 'yearly') curDate.setFullYear(curDate.getFullYear() + 1);

    const updatedRec: RecurringTransaction = {
      ...rec,
      nextDueDate: curDate.toISOString().split('T')[0],
    };

    setAppState((prev) => {
      const { updatedAccounts, updatedMayaPockets } = applyTransactionToAccounts(
        prev.accounts || [],
        newTx,
        'apply',
        prev.customExchangeRates
      );

      let updatedGoals = prev.savingsGoals;
      if (updatedMayaPockets) {
        updatedGoals = syncSavingsGoalsWithMayaPockets(prev.savingsGoals, updatedMayaPockets);
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        savingsGoals: updatedGoals,
        transactions: [newTx, ...prev.transactions],
        recurring: prev.recurring.map((r) => (r.id === rec.id ? updatedRec : r)),
      };
    });
  };

  const handleRestoreState = (newState: AppState) => {
    setAppState(newState);
  };

  const currentCurrencyConfig = getCurrencyConfig(appState.baseCurrency);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-violet-100/70 via-slate-50 to-purple-100/60 py-4 sm:py-8 px-3 sm:px-6 selection:bg-violet-200 selection:text-violet-900">
      {/* Frosted Glass Outer Shell container with subtle royal violet ambient border */}
      <div className="max-w-6xl mx-auto bg-white/85 backdrop-blur-2xl rounded-[36px] border border-violet-100/90 shadow-2xl shadow-violet-950/10 p-5 sm:p-8 space-y-6 relative">
        {/* Top Header & Navigation Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-violet-100/80">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 text-white flex items-center justify-center shadow-md shadow-violet-700/25">
              <Wallet className="w-5 h-5 text-violet-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center">
                  Pera<span className="text-violet-700">Folio</span>
                </h1>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200/60">
                  E-Wallets & Wealth
                </span>
              </div>
              <p className="text-[11px] text-violet-950/60 font-medium">
                Personal Finance & Multi-Wallet Portfolio
              </p>
            </div>
          </div>

          {/* Center Pill Nav Bar */}
          <nav className="flex items-center gap-1 bg-violet-50/80 p-1.5 rounded-full overflow-x-auto max-w-full text-xs font-semibold scrollbar-none border border-violet-100/80">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('wallets')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'wallets'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Wallets & Apps</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'goals'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Savings</span>
            </button>

            <button
              onClick={() => setActiveTab('recurring')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'recurring'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Recurring</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Charts</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'export'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-violet-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-violet-900 hover:bg-violet-100/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Currency</span>
            </button>
          </nav>

          {/* Right Top Status Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Base Currency Dropdown Selector */}
            <div className="relative">
              <button
                id="base-currency-pill-btn"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90 rounded-full shadow-2xs transition"
                title="Change Base Currency"
              >
                <span>{currentCurrencyConfig.flag}</span>
                <span>{appState.baseCurrency}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showCurrencyDropdown && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">
                    Select Base Currency
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => handleSelectBaseCurrency(c.code)}
                        className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition ${
                          c.code === appState.baseCurrency ? 'bg-violet-50 text-violet-700 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.code}</span>
                        </span>
                        <span className="text-slate-400 text-[11px]">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Offline/Online Status Pill */}
            <OfflineIndicator />

            {/* PWA In-App Install Button */}
            <PWAInstallButton />
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main>
          {activeTab === 'overview' && (
            <OverviewDashboard
              appState={appState}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onQuickAddTransaction={(type) => {
                setActiveTab('transactions');
              }}
            />
          )}

          {activeTab === 'wallets' && (
            <WalletsManager
              appState={appState}
              onUpdateAccount={handleUpdateAccount}
              onTransferFunds={handleTransferFunds}
              onAddTransaction={(txData) => {
                const amountInBase = convertCurrency(
                  txData.amount,
                  txData.currency,
                  appState.baseCurrency,
                  appState.customExchangeRates
                );
                handleAddTransaction({
                  ...txData,
                  id: 'tx-' + Date.now(),
                  amountInBase,
                  createdAt: Date.now(),
                });
              }}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsManager
              transactions={appState.transactions}
              baseCurrency={appState.baseCurrency}
              customRates={appState.customExchangeRates}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'goals' && (
            <SavingsGoalsTracker
              goals={appState.savingsGoals}
              baseCurrency={appState.baseCurrency}
              accounts={appState.accounts}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
              onGoalFundAdjusted={handleGoalFundAdjusted}
              onSyncMayaWithSavings={handleSyncMayaWithSavings}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringManager
              recurringList={appState.recurring}
              baseCurrency={appState.baseCurrency}
              onAddRecurring={handleAddRecurring}
              onUpdateRecurring={handleUpdateRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              onTriggerRecurring={handleTriggerRecurring}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Analytics & Expense Visuals</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deep-dive interactive breakdown of cashflows, category allocation, and spending rhythms
                </p>
              </div>
              <VisualCharts
                transactions={appState.transactions}
                baseCurrency={appState.baseCurrency}
              />
            </div>
          )}

          {activeTab === 'export' && (
            <ExportCenter
              appState={appState}
              onRestoreState={handleRestoreState}
            />
          )}

          {activeTab === 'settings' && (
            <CurrencySettings
              baseCurrency={appState.baseCurrency}
              customRates={appState.customExchangeRates}
              onSelectBaseCurrency={handleSelectBaseCurrency}
              onUpdateRates={handleUpdateRates}
            />
          )}
        </main>

        {/* Bottom subtle status bar matching the image footer */}
        <footer className="pt-6 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Local Vault Active • 100% Client-Side Storage</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('export')}
              className="hover:text-slate-600 transition"
            >
              CSV / PDF Export
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-600 transition"
            >
              Currency Engine
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className="hover:text-slate-600 transition"
            >
              Recurring Schedules
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
