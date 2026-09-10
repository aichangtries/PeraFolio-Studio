import React, { useState } from 'react';
import { SavingsGoal, SavingsGoalHistoryItem, OnlineAccount, ActiveTab } from '../types';
import { formatCurrency } from '../utils/currency';
import { getLinkedMayaPocketKey } from '../utils/walletSync';
import confetti from 'canvas-confetti';
import {
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
  Trash2,
  X,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  Heart,
  Briefcase,
  Layers,
  Wallet,
  Landmark,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface SavingsGoalsTrackerProps {
  goals: SavingsGoal[];
  baseCurrency: string;
  accounts?: OnlineAccount[];
  onUpdateGoal: (goal: SavingsGoal) => void;
  onAddGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onGoalFundAdjusted?: (
    goal: SavingsGoal,
    actionType: 'deposit' | 'withdraw',
    amount: number,
    sourceWalletId: string,
    note: string
  ) => void;
  onSyncMayaWithSavings?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

const GOAL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ShieldCheck: Shield,
  Plane: Plane,
  Laptop: Laptop,
  Zap: Sparkles,
  Car: Car,
  Home: Home,
  Heart: Heart,
  Briefcase: Briefcase,
  Trophy: Trophy,
};

export const SavingsGoalsTracker: React.FC<SavingsGoalsTrackerProps> = ({
  goals,
  baseCurrency,
  accounts = [],
  onUpdateGoal,
  onAddGoal,
  onDeleteGoal,
  onGoalFundAdjusted,
  onSyncMayaWithSavings,
  onNavigateTab,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [sourceWalletId, setSourceWalletId] = useState<string>('auto');
  const [isSyncingMaya, setIsSyncingMaya] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New Goal Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalInitial, setNewGoalInitial] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Personal');
  const [newGoalIcon, setNewGoalIcon] = useState('Trophy');
  const [newGoalColor, setNewGoalColor] = useState('#10b981');
  const [syncWithMaya, setSyncWithMaya] = useState(true);
  const [mayaPocketSelection, setMayaPocketSelection] = useState('auto');

  // Maya account data
  const mayaAccount = accounts.find((a) => a.id === 'maya');
  const mayaPockets = mayaAccount?.mayaPockets || {
    emergencyFund: 75000,
    firstMilly: 65000,
    travel: 25000,
  };
  const totalMayaBalance = mayaAccount?.balance ?? (mayaPockets.emergencyFund + mayaPockets.firstMilly + mayaPockets.travel);
  const totalGoalsAccumulated = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  const handleTriggerMayaSync = () => {
    setIsSyncingMaya(true);
    if (onSyncMayaWithSavings) {
      onSyncMayaWithSavings();
    }
    setTimeout(() => {
      setIsSyncingMaya(false);
      setSyncFeedback('Maya savings and goals successfully synchronized!');
      setTimeout(() => setSyncFeedback(null), 3500);
    }, 450);
  };

  const getPocketLabel = (goal: SavingsGoal): string => {
    const key = getLinkedMayaPocketKey(goal);
    if (key === 'emergencyFund') return 'Emergency Fund Pocket';
    if (key === 'firstMilly') return 'First Milly Pocket';
    if (key === 'travel') return 'Travel Fund Pocket';
    return `${key.replace(/([A-Z])/g, ' $1').trim()} Pocket`;
  };

  // Quick Deposit / Withdraw handler
  const handleFundAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDepositModal) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    const current = showDepositModal.currentAmount;
    const target = showDepositModal.targetAmount;
    const isDeposit = actionType === 'deposit';

    let updatedAmount = isDeposit ? current + amount : Math.max(0, current - amount);
    const completed = updatedAmount >= target;

    const newHistoryItem: SavingsGoalHistoryItem = {
      id: 'h-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      type: actionType,
      note:
        depositNote.trim() ||
        (sourceWalletId && sourceWalletId !== 'none' && sourceWalletId !== 'auto'
          ? `${isDeposit ? 'Funded from' : 'Withdrawn to'} ${sourceWalletId.toUpperCase()}`
          : isDeposit
          ? 'Deposit into Maya Savings'
          : 'Withdrawal from Maya Savings'),
    };

    const updatedGoal: SavingsGoal = {
      ...showDepositModal,
      currentAmount: updatedAmount,
      isCompleted: completed,
      history: [newHistoryItem, ...(showDepositModal.history || [])],
    };

    if (onGoalFundAdjusted) {
      onGoalFundAdjusted(
        updatedGoal,
        actionType,
        amount,
        sourceWalletId,
        depositNote.trim()
      );
    } else {
      onUpdateGoal(updatedGoal);
    }

    if (completed && !showDepositModal.isCompleted) {
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback
      }
    }

    setDepositAmount('');
    setDepositNote('');
    setShowDepositModal(null);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget);
    const initial = parseFloat(newGoalInitial) || 0;

    if (!newGoalName.trim() || isNaN(target) || target <= 0) return;

    let pocketKey = mayaPocketSelection === 'auto' ? undefined : mayaPocketSelection;

    const newGoal: SavingsGoal = {
      id: 'goal-' + Date.now(),
      name: newGoalName.trim(),
      targetAmount: target,
      currentAmount: initial,
      targetDate: newGoalDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      category: newGoalCategory,
      color: newGoalColor,
      icon: newGoalIcon,
      isCompleted: initial >= target,
      createdAt: Date.now(),
      isSyncedWithMaya: syncWithMaya,
      linkedMayaPocket: pocketKey,
      history:
        initial > 0
          ? [
              {
                id: 'h-' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                amount: initial,
                type: 'deposit',
                note: syncWithMaya ? 'Initial deposit into Maya pocket' : 'Starting balance',
              },
            ]
          : [],
    };

    onAddGoal(newGoal);

    // Reset Form
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalInitial('');
    setNewGoalDate('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </span>
            <span>Goal Savings Tracker</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Set aside money towards specific milestones with real-time Maya synchronization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="sync-maya-goals-btn"
            onClick={handleTriggerMayaSync}
            disabled={isSyncingMaya}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Reconcile and synchronize Maya pockets with your savings goals"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingMaya ? 'animate-spin' : ''}`} />
            <span>{isSyncingMaya ? 'Syncing...' : 'Sync with Maya'}</span>
          </button>

          <button
            id="add-savings-goal-btn"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-full shadow-xs shadow-violet-700/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Maya Savings Live Sync Hub Banner */}
      <div
        id="maya-savings-sync-banner"
        className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 border border-emerald-700/50 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Maya High-Yield Savings • Real-Time Synced
              </span>
            </div>

            <h4 className="text-base sm:text-lg font-extrabold text-white">
              Your Savings Goals Are Directly Synced with Maya
            </h4>
            <p className="text-xs text-emerald-200/90 leading-relaxed font-normal">
              Every deposit, withdrawal, or milestone progress updates your Maya pockets (Emergency Fund, First Milly, and Travel Fund). Earning competitive high interest across all designated personal goals.
            </p>

            {/* 3 Maya Pockets Live Values */}
            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs backdrop-blur-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-200 font-medium">Emergency:</span>
                <span className="text-white font-bold">{formatCurrency(mayaPockets.emergencyFund || 0, baseCurrency)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs backdrop-blur-xs flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-purple-200 font-medium">First Milly:</span>
                <span className="text-white font-bold">{formatCurrency(mayaPockets.firstMilly || 0, baseCurrency)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs backdrop-blur-xs flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-cyan-300" />
                <span className="text-cyan-200 font-medium">Travel:</span>
                <span className="text-white font-bold">{formatCurrency(mayaPockets.travel || 0, baseCurrency)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0 pt-2 md:pt-0">
            <div className="bg-black/20 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/10 text-right">
              <span className="text-[11px] font-medium text-emerald-300 block">Total Maya Savings</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(totalMayaBalance, baseCurrency)}
              </span>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('wallets')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-white transition group"
              >
                <span>View Maya Wallet & Pockets</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* Grid of Savings Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const IconComp = GOAL_ICONS[goal.icon] || Trophy;
          const pocketLabel = getPocketLabel(goal);

          // Days remaining calculation
          const targetTime = new Date(goal.targetDate).getTime();
          const nowTime = new Date().getTime();
          const daysLeft = Math.ceil((targetTime - nowTime) / 86400000);

          return (
            <div
              key={goal.id}
              className="group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: goal.color }}
                    >
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {goal.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                        {goal.name}
                      </h4>
                    </div>
                  </div>

                  {goal.isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Completed</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                      {progress}%
                    </span>
                  )}
                </div>

                {/* Maya Pocket Sync Pill */}
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <Landmark className="w-3 h-3 text-emerald-600" />
                    <span>Maya Pocket: {pocketLabel}</span>
                  </span>
                </div>

                {/* Amount Progress */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Saved in Maya</span>
                      <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {formatCurrency(goal.currentAmount, baseCurrency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Target</span>
                      <p className="text-sm font-semibold text-slate-600">
                        {formatCurrency(goal.targetAmount, baseCurrency)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max(3, progress)}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>
                </div>

                {/* Sub info */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 pb-3 border-b border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target: {goal.targetDate}</span>
                  </span>
                  <span className="font-medium">
                    {goal.isCompleted
                      ? 'Goal reached!'
                      : daysLeft > 0
                      ? `${daysLeft} days left`
                      : 'Past target date'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setShowDepositModal(goal);
                    setActionType('deposit');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition active:scale-95"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Deposit</span>
                </button>

                <button
                  onClick={() => {
                    setShowDepositModal(goal);
                    setActionType('withdraw');
                  }}
                  className="inline-flex items-center justify-center p-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition"
                  title="Withdraw funds from Maya Pocket"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                </button>

                <button
                  onClick={() => onDeleteGoal(goal.id)}
                  className="inline-flex items-center justify-center p-2 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Delete Goal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deposit / Withdraw Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  {actionType === 'deposit' ? 'Add Funds to Maya Goal' : 'Withdraw from Maya Goal'}
                </h4>
              </div>
              <button
                onClick={() => setShowDepositModal(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Goal: <strong>{showDepositModal.name}</strong> (Currently:{' '}
              {formatCurrency(showDepositModal.currentAmount, baseCurrency)})
            </p>

            <form onSubmit={handleFundAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount ({baseCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionType === 'deposit' ? 'Funding Source Account' : 'Destination Account'}
                </label>
                <div className="relative">
                  <select
                    value={sourceWalletId}
                    onChange={(e) => setSourceWalletId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                  >
                    <option value="auto">
                      Maya Savings Pocket (Auto-synced)
                    </option>
                    <option value="gotyme">GoTyme Bank (Transfer from Allowance)</option>
                    <option value="maribank">MariBank (Transfer from Extras & Buffer)</option>
                    <option value="gcash">GCash (Transfer from Mobile Wallet)</option>
                    <option value="wise">Wise (Transfer from Freelance USD)</option>
                    <option value="none">External / Unlinked Direct Deposit</option>
                  </select>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-emerald-600 inline shrink-0" />
                  <span>Your Maya balance and pockets mirror this adjustment instantly.</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly transfer, bonus, freelance allocation"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition ${
                    actionType === 'deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Create New Savings Goal</h4>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya: Real Estate Fund, Japan 2027, Tech Upgrades"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Maya Sync Switch & Pocket Selection */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">Sync with Maya Savings</span>
                      <span className="text-[11px] text-emerald-700">Reflect in Maya High-Yield Pockets & Net Worth</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncWithMaya}
                    onChange={(e) => setSyncWithMaya(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {syncWithMaya && (
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Maya Pocket Destination
                    </label>
                    <select
                      value={mayaPocketSelection}
                      onChange={(e) => setMayaPocketSelection(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl text-emerald-950 font-medium focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="auto">Auto-detect from goal name</option>
                      <option value="emergencyFund">Emergency Fund Pocket</option>
                      <option value="firstMilly">First Milly Pocket</option>
                      <option value="travel">Travel Fund Pocket</option>
                      <option value="custom">Create New Maya Dedicated Pocket</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Amount ({baseCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="50000"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Saved ({baseCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newGoalInitial}
                    onChange={(e) => setNewGoalInitial(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Savings, Travel, Tech"
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewGoalColor(color)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          newGoalColor === color ? 'scale-115 ring-2 ring-offset-2 ring-slate-900' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-violet-700 hover:bg-violet-800 rounded-xl shadow-xs shadow-violet-700/20 transition"
                >
                  Create Maya Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
