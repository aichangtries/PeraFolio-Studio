import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES, convertCurrency } from '../utils/currency';
import { DEFAULT_CATEGORIES, getCategoryDefinition } from '../data/categories';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  X,
  ChevronDown,
} from 'lucide-react';

interface TransactionsManagerProps {
  transactions: Transaction[];
  baseCurrency: string;
  customRates: Record<string, number>;
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsManager: React.FC<TransactionsManagerProps> = ({
  transactions,
  baseCurrency,
  customRates,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Modal Form State
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState(baseCurrency);
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('GoTyme (Allowance)');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('');

  const openAddModal = (defaultType?: TransactionType) => {
    setEditingTransaction(null);
    setFormType(defaultType || 'expense');
    setFormAmount('');
    setFormCurrency(baseCurrency);
    setFormCategory(defaultType === 'income' ? 'Freelance & Consulting' : 'Dining Out & Cafe');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod(defaultType === 'income' ? 'Wise (Freelance Company 1)' : 'GoTyme (Allowance)');
    setFormNotes('');
    setFormTags('');
    setShowModal(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormCurrency(t.currency);
    setFormCategory(t.category);
    setFormDate(t.date);
    setFormPaymentMethod(t.paymentMethod);
    setFormNotes(t.notes || '');
    setFormTags((t.tags || []).join(', '));
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    // Calculate base currency equivalent
    const amountInBase = convertCurrency(parsedAmount, formCurrency, baseCurrency, customRates);

    const tagsArray = formTags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    if (editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        type: formType,
        amount: parsedAmount,
        currency: formCurrency,
        amountInBase,
        category: formCategory,
        date: formDate,
        paymentMethod: formPaymentMethod,
        notes: formNotes.trim() || undefined,
        tags: tagsArray,
      };
      onUpdateTransaction(updated);
    } else {
      const newTx: Transaction = {
        id: 'tx-' + Date.now(),
        type: formType,
        amount: parsedAmount,
        currency: formCurrency,
        amountInBase,
        category: formCategory,
        date: formDate,
        paymentMethod: formPaymentMethod,
        notes: formNotes.trim() || undefined,
        tags: tagsArray,
        createdAt: Date.now(),
      };
      onAddTransaction(newTx);
    }

    setShowModal(false);
  };

  // Filtered & Sorted Transactions
  const filteredList = useMemo(() => {
    return transactions
      .filter((t) => {
        // Type filter
        if (filterType !== 'all' && t.type !== filterType) return false;

        // Category filter
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;

        // Account filter
        if (filterAccount !== 'all') {
          const method = (t.paymentMethod || '').toLowerCase();
          if (filterAccount === 'gotyme' && !method.includes('gotyme')) return false;
          if (filterAccount === 'maribank' && !method.includes('maribank')) return false;
          if (filterAccount === 'maya' && !method.includes('maya')) return false;
          if (filterAccount === 'wise' && !method.includes('wise')) return false;
          if (filterAccount === 'gcash' && !method.includes('gcash')) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCat = t.category.toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          const matchTags = (t.tags || []).some((tag) => tag.includes(q));
          const matchMethod = (t.paymentMethod || '').toLowerCase().includes(q);
          if (!matchCat && !matchNotes && !matchTags && !matchMethod) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'amount-desc') return b.amountInBase - a.amountInBase;
        if (sortBy === 'amount-asc') return a.amountInBase - b.amountInBase;
        return 0;
      });
  }, [transactions, filterType, filterCategory, filterAccount, searchQuery, sortBy]);

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Income & Expense Ledger</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, organize, and categorize cash flows with automatic multi-currency conversion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-income-quick-btn"
            onClick={() => openAddModal('income')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 rounded-full border border-emerald-300/60 shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>+ Income</span>
          </button>

          <button
            id="add-expense-quick-btn"
            onClick={() => openAddModal('expense')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-full shadow-xs shadow-violet-700/25 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Expense</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-violet-100/60 shadow-xs space-y-3">
        {/* Quick Account Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">Account:</span>
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'gotyme', label: 'GoTyme (Allowance)' },
            { id: 'maribank', label: 'MariBank (Extras)' },
            { id: 'maya', label: 'Maya (Savings)' },
            { id: 'wise', label: 'Wise (Freelance)' },
            { id: 'gcash', label: 'GCash (Family/Random)' },
          ].map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => setFilterAccount(acc.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                filterAccount === acc.id
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, categories, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="all">All Cash Flows</option>
              <option value="income">Incoming Only (+)</option>
              <option value="expense">Outgoing Only (-)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Categories</option>
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Filter count indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            Showing <strong>{filteredList.length}</strong> of {transactions.length} total records
          </span>
          {(searchQuery || filterType !== 'all' || filterCategory !== 'all' || filterAccount !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterCategory('all');
                setFilterAccount('all');
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="py-12 bg-white/60 rounded-3xl border border-dashed border-slate-200 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No transactions match your search</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your filters or click &quot;+ Expense&quot; / &quot;+ Income&quot; to log a new record
            </p>
          </div>
        ) : (
          filteredList.map((tx) => {
            const isIncome = tx.type === 'income';
            const catDef = getCategoryDefinition(tx.category);

            return (
              <div
                key={tx.id}
                className="group bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  {/* Icon badge */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
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
                      <h4 className="text-sm font-bold text-slate-900">{tx.category}</h4>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{tx.date}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {tx.paymentMethod}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{tx.notes}</p>
                    )}

                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {tx.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
                          >
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Converted & Original Currency Amount */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span
                      className={`text-base font-extrabold tracking-tight ${
                        isIncome ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(tx.amountInBase, baseCurrency)}
                    </span>
                    {tx.currency !== baseCurrency && (
                      <p className="text-[11px] text-slate-400">
                        ({formatCurrency(tx.amount, tx.currency)})
                      </p>
                    )}
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900">
                {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormType('expense')}
                  className={`py-2 rounded-xl transition ${
                    formType === 'expense' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Outgoing Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('income')}
                  className={`py-2 rounded-xl transition ${
                    formType === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Incoming Income (+)
                </button>
              </div>

              {/* Amount & Currency */}
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
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
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

              {/* Conversion Preview if foreign currency */}
              {formCurrency !== baseCurrency && formAmount && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Equivalent in {baseCurrency}:</span>
                  <strong className="text-slate-900">
                    {formatCurrency(
                      convertCurrency(parseFloat(formAmount) || 0, formCurrency, baseCurrency, customRates),
                      baseCurrency
                    )}
                  </strong>
                </div>
              )}

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {DEFAULT_CATEGORIES.filter((c) => c.type === formType || c.type === 'both').map(
                      (c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method / Account
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => {
                    const method = e.target.value as PaymentMethod;
                    setFormPaymentMethod(method);
                    if (method.includes('Wise')) {
                      setFormCurrency('USD');
                    } else if (method.includes('GoTyme') || method.includes('MariBank') || method.includes('Maya') || method.includes('GCash')) {
                      if (formCurrency === 'USD') setFormCurrency(baseCurrency);
                    }
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <optgroup label="Online Banking & Wallets">
                    <option value="GoTyme (Allowance)">GoTyme (Monthly/Daily Allowance)</option>
                    <option value="MariBank (Extras)">MariBank (Extra Funds / Buffer)</option>
                    <option value="Maya - Emergency Fund">Maya — Emergency Fund Pocket</option>
                    <option value="Maya - First Milly">Maya — First Milly Pocket</option>
                    <option value="Maya - Travel">Maya — Travel Pocket</option>
                    <option value="Wise (Freelance Company 1)">Wise — Freelance Salary (Company 1)</option>
                    <option value="Wise (Freelance Company 2)">Wise — Freelance Salary (Company 2)</option>
                    <option value="GCash (Family & Random)">GCash — Family & Random Money</option>
                  </optgroup>
                  <optgroup label="Standard Payment Methods">
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Account">Bank Account / Direct Deposit</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Digital Wallet">Digital Wallet (Apple Pay / PayPal)</option>
                    <option value="Crypto">Cryptocurrency</option>
                    <option value="Other">Other</option>
                  </optgroup>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes & Details (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grocery trip to Trader Joe's, invoice #402"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. vacation, tax-deductible, business"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-violet-700 hover:bg-violet-800 rounded-xl shadow-xs shadow-violet-700/25 transition"
                >
                  {editingTransaction ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
