import React from 'react';
import { AppState, Transaction, SavingsGoal, RecurringTransaction, OnlineAccount } from '../types';
import { formatCurrency, getCurrencyConfig, convertCurrency } from '../utils/currency';
import { calculateTotalWalletsNetWorth } from '../utils/walletSync';
import { VisualCharts } from './VisualCharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Repeat,
  Globe,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Sparkles,
  Landmark,
  PiggyBank,
  Briefcase,
  Send,
  Layers,
  ShieldCheck,
  Trophy,
  Plane,
  Edit3,
} from 'lucide-react';

interface OverviewDashboardProps {
  appState: AppState;
  onNavigateTab: (tab: any) => void;
  onQuickAddTransaction: (type: 'income' | 'expense') => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  appState,
  onNavigateTab,
  onQuickAddTransaction,
}) => {
  const { transactions, savingsGoals, recurring, baseCurrency, accounts = [] } = appState;

  // Calculate Consolidated E-Wallets and E-Banks Net Worth
  const totalWalletsNetWorth = calculateTotalWalletsNetWorth(
    accounts,
    baseCurrency,
    appState.customExchangeRates
  );

  // Individual account balances in their native and converted values
  const gotymeAcc = accounts.find((a) => a.id === 'gotyme');
  const maribankAcc = accounts.find((a) => a.id === 'maribank');
  const mayaAcc = accounts.find((a) => a.id === 'maya');
  const wiseAcc = accounts.find((a) => a.id === 'wise');
  const gcashAcc = accounts.find((a) => a.id === 'gcash');

  const gotymeBalance = gotymeAcc?.balance || 0;
  const maribankBalance = maribankAcc?.balance || 0;
  const mayaPockets = mayaAcc?.mayaPockets || { emergencyFund: 0, firstMilly: 0, travel: 0 };
  const mayaTotal = mayaPockets.emergencyFund + mayaPockets.firstMilly + mayaPockets.travel;
  const wiseClients = wiseAcc?.wiseClients || [];
  const wiseTotalUSD = wiseClients.reduce((sum, c) => sum + (c.balance || 0), 0);
  const wiseConvertedBase = convertCurrency(
    wiseTotalUSD,
    'USD',
    baseCurrency,
    appState.customExchangeRates
  );
  const gcashBalance = gcashAcc?.balance || 0;

  // Calculate high-level financial stats in base currency
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amountInBase, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amountInBase, 0);

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100).toFixed(0) : '0';

  // Savings targets calculations - directly reflects Maya savings total
  const mayaTotalInBase = convertCurrency(
    mayaTotal,
    mayaAcc?.currency || 'PHP',
    baseCurrency,
    appState.customExchangeRates
  );
  const totalSavingsAccumulated = mayaTotalInBase;
  const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const goalsProgress = totalSavingsTarget > 0 ? Math.round((totalSavingsAccumulated / totalSavingsTarget) * 100) : 0;

  // Recurring calculations
  const activeRecurringCount = recurring.filter((r) => r.isActive).length;
  const upcomingNextDue = recurring
    .filter((r) => r.isActive)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];

  // Distinct currencies tracked
  const uniqueCurrencies = Array.from(new Set(transactions.map((t) => t.currency)));

  return (
    <div className="space-y-6">
      {/* PeraFolio Royal Violet Executive Portfolio Banner: Real-Time E-Wallets & Banks Net Worth */}
      <div
        id="overview-portfolio-banner"
        className="bg-gradient-to-br from-violet-950 via-purple-900 to-violet-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-violet-950/20 border border-violet-700/50 relative overflow-hidden"
      >
        {/* Ambient royal glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-violet-800/90 text-violet-200 border border-violet-500/40 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-300" />
                PeraFolio Total Liquid Portfolio
              </span>
              <span className="text-xs text-violet-300/90 font-medium">
                Consolidated Across 5 Online Accounts
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                {formatCurrency(totalWalletsNetWorth, baseCurrency)}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-violet-200 border border-white/15 backdrop-blur-xs">
                  {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, baseCurrency)} cashflow
                </span>
                <span className="text-xs text-violet-300 font-medium">
                  ({savingsRate}% savings rate)
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-violet-200/90 max-w-2xl leading-relaxed">
              Consolidated real-time balance across your e-wallets and banks: GoTyme allowance, MariBank buffer, Maya savings pockets, Wise freelance salary, and GCash.
            </p>

            {/* Micro-account balance chips with real-time figures */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              {/* GoTyme */}
              <button
                onClick={() => onNavigateTab('wallets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs transition backdrop-blur-xs group"
                title="GoTyme Allowance"
              >
                <Wallet className="w-3.5 h-3.5 text-sky-300" />
                <span className="font-semibold text-white group-hover:underline">GoTyme:</span>
                <span className="text-sky-200 font-bold">{formatCurrency(gotymeBalance, gotymeAcc?.currency || 'PHP', false)}</span>
              </button>

              {/* MariBank */}
              <button
                onClick={() => onNavigateTab('wallets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs transition backdrop-blur-xs group"
                title="MariBank Extra Buffer"
              >
                <PiggyBank className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-semibold text-white group-hover:underline">MariBank:</span>
                <span className="text-amber-200 font-bold">{formatCurrency(maribankBalance, maribankAcc?.currency || 'PHP', false)}</span>
              </button>

              {/* Maya (3 Pockets) */}
              <button
                onClick={() => onNavigateTab('wallets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs transition backdrop-blur-xs group"
                title="Maya: Emergency Fund, First Milly, Travel (Synced with Savings)"
              >
                <Landmark className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-semibold text-white group-hover:underline">Maya (Savings Synced):</span>
                <span className="text-emerald-200 font-bold">{formatCurrency(mayaTotal, mayaAcc?.currency || 'PHP', false)}</span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                  Synced
                </span>
              </button>

              {/* Wise (USD Freelance) */}
              <button
                onClick={() => onNavigateTab('wallets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs transition backdrop-blur-xs group"
                title="Wise: 2 Freelance Clients in USD"
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-300" />
                <span className="font-semibold text-white group-hover:underline">Wise:</span>
                <span className="text-cyan-200 font-bold">${wiseTotalUSD.toLocaleString()} (~{formatCurrency(wiseConvertedBase, baseCurrency, false)})</span>
              </button>

              {/* GCash */}
              <button
                onClick={() => onNavigateTab('wallets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs transition backdrop-blur-xs group"
                title="GCash: Family & Random Transfers"
              >
                <Send className="w-3.5 h-3.5 text-indigo-300" />
                <span className="font-semibold text-white group-hover:underline">GCash:</span>
                <span className="text-indigo-200 font-bold">{formatCurrency(gcashBalance, gcashAcc?.currency || 'PHP', false)}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-stretch gap-2.5 shrink-0">
            <button
              id="btn-overview-manage-wallets"
              onClick={() => onNavigateTab('wallets')}
              className="px-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-950/40 transition flex items-center justify-center gap-2 border border-violet-400/40"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Wallets & Transfers</span>
            </button>
            <button
              id="btn-overview-quick-tx"
              onClick={() => onQuickAddTransaction('expense')}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition flex items-center justify-center gap-2 backdrop-blur-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>
      </div>
      {/* 6 Hero Cards inspired directly by the uploaded image design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Incoming Flow (Mint/Pistachio card from image) */}
        <div
          onClick={() => onNavigateTab('transactions')}
          className="group relative bg-[#ebf8ee] border border-emerald-200/70 hover:border-emerald-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/60 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <span className="w-4 h-4 rounded-full border-2 border-emerald-400/60 flex items-center justify-center" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-800 transition">
              Incoming Flow
            </h3>
            <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed font-medium">
              Total recorded incoming revenue and earnings converted into your base asset pool.
            </p>

            <div className="mt-4">
              <span className="text-2xl font-black text-emerald-950 tracking-tight">
                {formatCurrency(totalIncome, baseCurrency)}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-emerald-200/50 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-emerald-800 shadow-2xs">
              {transactions.filter((t) => t.type === 'income').length} Inflows
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddTransaction('income');
              }}
              className="text-xs font-bold text-emerald-900 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>+ Add Income</span>
            </button>
          </div>
        </div>

        {/* Card 2: Outgoing Expenses (Ice-Blue/Cyan card from image) */}
        <div
          onClick={() => onNavigateTab('transactions')}
          className="group relative bg-[#e7f3fb] border border-sky-200/70 hover:border-sky-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-sky-600 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/60 text-sky-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <span className="w-4 h-4 rounded-full border-2 border-sky-400/60 flex items-center justify-center" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-sky-800 transition">
              Outgoing Expenses
            </h3>
            <p className="text-xs text-sky-800/80 mt-1 leading-relaxed font-medium">
              Categorized expenditures, utilities, groceries, and shopping spending across accounts.
            </p>

            <div className="mt-4">
              <span className="text-2xl font-black text-sky-950 tracking-tight">
                {formatCurrency(totalExpense, baseCurrency)}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-sky-200/50 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-sky-800 shadow-2xs">
              {transactions.filter((t) => t.type === 'expense').length} Expenses
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddTransaction('expense');
              }}
              className="text-xs font-bold text-sky-900 hover:text-sky-700 flex items-center gap-1"
            >
              <span>+ Add Expense</span>
            </button>
          </div>
        </div>

        {/* Card 3: E-Wallets Liquid Capital & Cashflow (Royal Violet Card) */}
        <div
          onClick={() => onNavigateTab('wallets')}
          className="group relative bg-[#f5f0fd] border border-violet-200/80 hover:border-violet-400 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-violet-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/70 text-violet-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <span className="w-4 h-4 rounded-full border-2 border-violet-400/70 flex items-center justify-center" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-violet-800 transition">
              E-Wallets Wealth
            </h3>
            <p className="text-xs text-violet-900/80 mt-1 leading-relaxed font-medium">
              Total liquid funds held in GoTyme, MariBank, Maya pockets, Wise USD, & GCash.
            </p>

            <div className="mt-4">
              <span className="text-2xl font-black text-violet-950 tracking-tight">
                {formatCurrency(totalWalletsNetWorth, baseCurrency)}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-violet-200/60 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/90 text-violet-900 shadow-2xs">
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, baseCurrency)} Net
            </span>
            <span className="text-xs font-semibold text-violet-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Manage Wallets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Savings Goals (Warm Peach/Apricot card from image) */}
        <div
          onClick={() => onNavigateTab('goals')}
          className="group relative bg-[#fff1e5] border border-amber-200/70 hover:border-amber-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-amber-600 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/60 text-amber-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                <Landmark className="w-3 h-3 text-emerald-600" />
                <span>Maya Synced</span>
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-amber-800 transition">
              Savings Targets (Maya)
            </h3>
            <p className="text-xs text-amber-900/80 mt-1 leading-relaxed font-medium">
              Real-time synchronized with your Maya High-Yield pockets: Emergency Fund, First Milly, and Travel Fund.
            </p>

            <div className="mt-4 flex items-baseline justify-between flex-wrap gap-1">
              <div>
                <span className="text-2xl font-black text-amber-950 tracking-tight">
                  {formatCurrency(totalSavingsAccumulated, baseCurrency)}
                </span>
                <span className="text-xs text-amber-800/80 ml-2 font-medium">
                  / {formatCurrency(totalSavingsTarget, baseCurrency)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                Maya Total
              </span>
            </div>

            {/* Maya 3 Pockets Live Breakdown */}
            <div className="mt-3 pt-2.5 border-t border-amber-200/60 grid grid-cols-3 gap-1.5 text-[10px]">
              <div className="bg-white/75 rounded-xl p-2 border border-amber-200/50 text-center">
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Emergency</span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {formatCurrency(mayaPockets.emergencyFund, mayaAcc?.currency || 'PHP', false)}
                </span>
              </div>
              <div className="bg-white/75 rounded-xl p-2 border border-amber-200/50 text-center">
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">1st Milly</span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {formatCurrency(mayaPockets.firstMilly, mayaAcc?.currency || 'PHP', false)}
                </span>
              </div>
              <div className="bg-white/75 rounded-xl p-2 border border-amber-200/50 text-center">
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Travel</span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {formatCurrency(mayaPockets.travel, mayaAcc?.currency || 'PHP', false)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-amber-200/50 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-amber-900 shadow-2xs">
              {goalsProgress}% Saved (Maya Total)
            </span>
            <span className="text-xs font-semibold text-amber-900 flex items-center gap-1">
              <span>{savingsGoals.length} Active Goals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 5: Recurring Scheduling (Soft Periwinkle card from image) */}
        <div
          onClick={() => onNavigateTab('recurring')}
          className="group relative bg-[#edf0fa] border border-indigo-200/70 hover:border-indigo-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-indigo-600 flex items-center justify-center">
                  <Repeat className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/60 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <span className="w-4 h-4 rounded-full border-2 border-indigo-400/60 flex items-center justify-center" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-800 transition">
              Recurring Schedules
            </h3>
            <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed font-medium">
              Automated projections for paychecks, rent, subscriptions, and regular utilities.
            </p>

            <div className="mt-4">
              <span className="text-2xl font-black text-indigo-950 tracking-tight">
                {activeRecurringCount} Active Rules
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-indigo-200/50 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-indigo-800 shadow-2xs">
              Next: {upcomingNextDue ? upcomingNextDue.nextDueDate : 'None due'}
            </span>
            <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1">
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 6: Multi-Currency & Global Tracking (Soft Mint-Aqua card from image) */}
        <div
          onClick={() => onNavigateTab('settings')}
          className="group relative bg-[#e4f7f4] border border-teal-200/70 hover:border-teal-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-teal-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/60 text-teal-700 flex items-center justify-center">
                  <span className="text-xs font-bold">{getCurrencyConfig(baseCurrency).flag}</span>
                </div>
              </div>
              <span className="w-4 h-4 rounded-full border-2 border-teal-400/60 flex items-center justify-center" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-teal-800 transition">
              Global Multi-Currency
            </h3>
            <p className="text-xs text-teal-800/80 mt-1 leading-relaxed font-medium">
              Seamlessly record foreign currencies with real-time conversion into {baseCurrency}.
            </p>

            <div className="mt-4">
              <span className="text-2xl font-black text-teal-950 tracking-tight">
                {baseCurrency} ({getCurrencyConfig(baseCurrency).symbol})
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-teal-200/50 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-teal-800 shadow-2xs">
              {uniqueCurrencies.length} Currencies In Use
            </span>
            <span className="text-xs font-semibold text-teal-900 flex items-center gap-1">
              <span>Change Currency</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Online Apps & Wallets Ecosystem Hub */}
      {accounts.length > 0 && (
        <div id="overview-wallets-hub" className="bg-white rounded-3xl p-6 border border-violet-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-violet-900 text-violet-200 rounded-xl">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Online Apps & Wallets Breakdown</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                  {formatCurrency(totalWalletsNetWorth, baseCurrency)} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                GoTyme (allowance), MariBank (extras), Maya (3 savings pockets), Wise (2 freelance salaries), and GCash
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('wallets')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <span>Manage & Edit Balances</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* GoTyme */}
            {(() => {
              const gotyme = accounts.find((a) => a.id === 'gotyme');
              if (!gotyme) return null;
              const today = new Date();
              const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              const daysRemaining = Math.max(1, daysInMonth - today.getDate() + 1);
              const dailyPace = gotyme.balance / daysRemaining;

              return (
                <div
                  onClick={() => onNavigateTab('wallets')}
                  className="bg-sky-50/60 hover:bg-sky-50 border border-sky-100 hover:border-sky-200 rounded-2xl p-3.5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-900">
                        <Wallet className="w-3.5 h-3.5 text-sky-600" />
                        GoTyme
                      </span>
                      <span className="text-[9px] font-semibold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                        Allowance
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      {formatCurrency(gotyme.balance, gotyme.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Safe: <span className="font-bold text-sky-700">{formatCurrency(dailyPace, gotyme.currency)}</span>/day
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-sky-100/80 flex items-center justify-between text-[10px] text-sky-700 font-medium">
                    <span>{daysRemaining} days left</span>
                    <span>Edit →</span>
                  </div>
                </div>
              );
            })()}

            {/* MariBank */}
            {(() => {
              const maribank = accounts.find((a) => a.id === 'maribank');
              if (!maribank) return null;

              return (
                <div
                  onClick={() => onNavigateTab('wallets')}
                  className="bg-orange-50/60 hover:bg-orange-50 border border-orange-100 hover:border-orange-200 rounded-2xl p-3.5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-900">
                        <PiggyBank className="w-3.5 h-3.5 text-orange-600" />
                        MariBank
                      </span>
                      <span className="text-[9px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                        Extras
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      {formatCurrency(maribank.balance, maribank.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Buffer for extra expenses
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-orange-100/80 flex items-center justify-between text-[10px] text-orange-700 font-medium">
                    <span>Protected cushion</span>
                    <span>Edit →</span>
                  </div>
                </div>
              );
            })()}

            {/* Maya */}
            {(() => {
              const maya = accounts.find((a) => a.id === 'maya');
              if (!maya) return null;
              const pockets = maya.mayaPockets || { emergencyFund: 0, firstMilly: 0, travel: 0 };
              const total = pockets.emergencyFund + pockets.firstMilly + pockets.travel;

              return (
                <div
                  onClick={() => onNavigateTab('wallets')}
                  className="bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200 rounded-2xl p-3.5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                        <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                        Maya
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        3 Wallets
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      {formatCurrency(total, maya.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Emergency:</span>
                        <span className="font-semibold">{formatCurrency(pockets.emergencyFund, maya.currency, false)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1st Milly:</span>
                        <span className="font-semibold">{formatCurrency(pockets.firstMilly, maya.currency, false)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Travel:</span>
                        <span className="font-semibold">{formatCurrency(pockets.travel, maya.currency, false)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-emerald-100/80 flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                    <span>3 Pockets</span>
                    <span>Edit →</span>
                  </div>
                </div>
              );
            })()}

            {/* Wise */}
            {(() => {
              const wise = accounts.find((a) => a.id === 'wise');
              if (!wise) return null;
              const clients = wise.wiseClients || [];
              const totalUSD = clients.reduce((sum, c) => sum + c.balance, 0);

              return (
                <div
                  onClick={() => onNavigateTab('wallets')}
                  className="bg-blue-50/60 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded-2xl p-3.5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        Wise
                      </span>
                      <span className="text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Freelance
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      {formatCurrency(totalUSD, wise.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                      <div className="truncate">Co 1: <span className="font-semibold">{formatCurrency(clients[0]?.balance || 0, wise.currency)}</span></div>
                      <div className="truncate">Co 2: <span className="font-semibold">{formatCurrency(clients[1]?.balance || 0, wise.currency)}</span></div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-blue-100/80 flex items-center justify-between text-[10px] text-blue-700 font-medium">
                    <span>2 Clients</span>
                    <span>Edit →</span>
                  </div>
                </div>
              );
            })()}

            {/* GCash */}
            {(() => {
              const gcash = accounts.find((a) => a.id === 'gcash');
              if (!gcash) return null;

              return (
                <div
                  onClick={() => onNavigateTab('wallets')}
                  className="bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-2xl p-3.5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-900">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        GCash
                      </span>
                      <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                        Family / Random
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      {formatCurrency(gcash.balance, gcash.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Family money & random sends
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[10px] text-indigo-700 font-medium">
                    <span>Peer & Family</span>
                    <span>Edit →</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Visual Charts Component */}
      <VisualCharts transactions={transactions} baseCurrency={baseCurrency} />

      {/* Recent Activity Quick List & Savings Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Ledger items */}
        <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900">Recent Transactions</h4>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {transactions.slice(0, 5).map((t) => {
              const isIncome = t.type === 'income';
              return (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-white/60 border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{t.category}</p>
                      <p className="text-[11px] text-slate-500">{t.date} • {t.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-xs font-extrabold ${
                        isIncome ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(t.amountInBase, baseCurrency)}
                    </p>
                    {t.currency !== baseCurrency && (
                      <p className="text-[10px] text-slate-400">
                        {formatCurrency(t.amount, t.currency)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Savings Goals Highlights */}
        <div className="lg:col-span-5 bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900">Savings Goals Radar</h4>
            <button
              onClick={() => onNavigateTab('goals')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Manage Goals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {savingsGoals.slice(0, 3).map((goal) => {
              let currentVal = goal.currentAmount;
              let isMayaSynced = !!goal.isSyncedWithMaya;
              if (goal.linkedMayaPocket && mayaPockets[goal.linkedMayaPocket] !== undefined) {
                currentVal = mayaPockets[goal.linkedMayaPocket];
                isMayaSynced = true;
              } else if (goal.name.toLowerCase().includes('emergency') && mayaPockets.emergencyFund !== undefined) {
                currentVal = mayaPockets.emergencyFund;
                isMayaSynced = true;
              } else if (goal.name.toLowerCase().includes('milly') && mayaPockets.firstMilly !== undefined) {
                currentVal = mayaPockets.firstMilly;
                isMayaSynced = true;
              } else if (goal.name.toLowerCase().includes('travel') && mayaPockets.travel !== undefined) {
                currentVal = mayaPockets.travel;
                isMayaSynced = true;
              }

              const pct = Math.min(100, Math.round((currentVal / goal.targetAmount) * 100));

              return (
                <div key={goal.id} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{goal.name}</span>
                      {isMayaSynced && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          Maya
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-slate-900">{pct}%</span>
                  </div>

                  <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, pct)}%`, backgroundColor: goal.color }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{formatCurrency(currentVal, baseCurrency)}</span>
                    <span>Target: {formatCurrency(goal.targetAmount, baseCurrency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
