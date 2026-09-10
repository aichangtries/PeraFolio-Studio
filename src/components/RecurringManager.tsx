import React, { useState } from 'react';
import { RecurringTransaction, Transaction, RecurrenceFrequency, PaymentMethod } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currency';
import { DEFAULT_CATEGORIES } from '../data/categories';
import {
  Repeat,
  Plus,
  Calendar,
  Clock,
  Check,
  Pause,
  Play,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
} from 'lucide-react';

interface RecurringManagerProps {
  recurringList: RecurringTransaction[];
  baseCurrency: string;
  onAddRecurring: (rec: RecurringTransaction) => void;
  onUpdateRecurring: (rec: RecurringTransaction) => void;
  onDeleteRecurring: (id: string) => void;
  onTriggerRecurring: (rec: RecurringTransaction) => void;
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({
  recurringList,
  baseCurrency,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onTriggerRecurring,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loggedSuccessId, setLoggedSuccessId] = useState<string | null>(null);

  // New Recurring Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Account');
  const [notes, setNotes] = useState('');
  const [autoLog, setAutoLog] = useState(true);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newRec: RecurringTransaction = {
      id: 'rec-' + Date.now(),
      title: title.trim(),
      type,
      amount: parsedAmount,
      currency,
      category,
      frequency,
      startDate,
      nextDueDate: startDate,
      paymentMethod,
      notes: notes.trim() || undefined,
      isActive: true,
      autoLog,
      createdAt: Date.now(),
    };

    onAddRecurring(newRec);

    // Reset
    setTitle('');
    setAmount('');
    setNotes('');
    setShowAddModal(false);
  };

  const handleTrigger = (rec: RecurringTransaction) => {
    onTriggerRecurring(rec);
    setLoggedSuccessId(rec.id);
    setTimeout(() => setLoggedSuccessId(null), 2500);
  };

  const toggleActive = (rec: RecurringTransaction) => {
    onUpdateRecurring({
      ...rec,
      isActive: !rec.isActive,
    });
  };

  // Calculate monthly total recurring outgoing & incoming
  const monthlyRecurringExpense = recurringList
    .filter((r) => r.isActive && r.type === 'expense')
    .reduce((sum, r) => {
      let multiplier = 1;
      if (r.frequency === 'daily') multiplier = 30;
      else if (r.frequency === 'weekly') multiplier = 4.33;
      else if (r.frequency === 'bi-weekly') multiplier = 2.16;
      else if (r.frequency === 'yearly') multiplier = 1 / 12;
      return sum + r.amount * multiplier;
    }, 0);

  const monthlyRecurringIncome = recurringList
    .filter((r) => r.isActive && r.type === 'income')
    .reduce((sum, r) => {
      let multiplier = 1;
      if (r.frequency === 'daily') multiplier = 30;
      else if (r.frequency === 'weekly') multiplier = 4.33;
      else if (r.frequency === 'bi-weekly') multiplier = 2.16;
      else if (r.frequency === 'yearly') multiplier = 1 / 12;
      return sum + r.amount * multiplier;
    }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </span>
            <span>Recurring Transaction Schedules</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automate routine salaries, subscriptions, and utility bills with frequency controls
          </p>
        </div>

        <button
          id="add-recurring-btn"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-full shadow-xs shadow-violet-700/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Recurring Schedule</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Schedules
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {recurringList.filter((r) => r.isActive).length}{' '}
            <span className="text-xs font-normal text-slate-400">of {recurringList.length}</span>
          </p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-100/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
            Monthly Recurring Inflow
          </span>
          <p className="text-xl font-extrabold text-emerald-900 mt-1">
            {formatCurrency(monthlyRecurringIncome, baseCurrency)}
          </p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-3xl border border-rose-100/80 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
            Monthly Recurring Outflow
          </span>
          <p className="text-xl font-extrabold text-rose-900 mt-1">
            {formatCurrency(monthlyRecurringExpense, baseCurrency)}
          </p>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {recurringList.length === 0 ? (
          <div className="py-12 bg-white/60 rounded-3xl border border-dashed border-slate-200 text-center">
            <Repeat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No recurring items setup yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Add subscriptions, rent, or scheduled paychecks to automatically project finances
            </p>
          </div>
        ) : (
          recurringList.map((rec) => {
            const isIncome = rec.type === 'income';

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  rec.isActive
                    ? 'bg-white/80 backdrop-blur-xl border-white/80 shadow-xs hover:shadow-md'
                    : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {rec.frequency}
                      </span>
                      {rec.autoLog && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Auto
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>{rec.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <span>{rec.paymentMethod}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Next due: {rec.nextDueDate}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span
                      className={`text-base font-extrabold tracking-tight ${
                        isIncome ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(rec.amount, rec.currency)}
                    </span>
                    {rec.currency !== baseCurrency && (
                      <p className="text-[10px] text-slate-400">
                        ~{formatCurrency(rec.amount, baseCurrency)} in {baseCurrency}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTrigger(rec)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                        loggedSuccessId === rec.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                      title="Log into current active transactions now"
                    >
                      {loggedSuccessId === rec.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Logged!</span>
                        </>
                      ) : (
                        <span>Log Now</span>
                      )}
                    </button>

                    <button
                      onClick={() => toggleActive(rec)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title={rec.isActive ? 'Pause recurring' : 'Activate recurring'}
                    >
                      {rec.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onDeleteRecurring(rec.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Recurring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900">New Recurring Schedule</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 rounded-xl transition ${
                    type === 'expense' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Outgoing Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 rounded-xl transition ${
                    type === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Incoming Income
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Fiber Internet, Salary, Gym"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Date / Next Due
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Bank Account">Bank Account</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Account number, customer ID, cancellation url"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={autoLog}
                    onChange={(e) => setAutoLog(e.target.checked)}
                    className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Mark as Auto-logged rule</span>
                </label>
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
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
