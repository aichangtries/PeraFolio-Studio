import { AppState, Transaction, RecurringTransaction, SavingsGoal } from '../types';
import { INITIAL_DATA } from '../data/initialData';
import { convertCurrency, formatCurrency } from './currency';
import { reconcileMayaAndSavingsGoals } from './walletSync';
import jsPDF from 'jspdf';

const STORAGE_KEY = 'offline_expense_tracker_state_v1';

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const { updatedAccounts, updatedSavingsGoals } = reconcileMayaAndSavingsGoals(
        INITIAL_DATA.accounts,
        INITIAL_DATA.savingsGoals
      );
      const initialWithSync = {
        ...INITIAL_DATA,
        accounts: updatedAccounts,
        savingsGoals: updatedSavingsGoals,
      };
      saveAppState(initialWithSync);
      return initialWithSync;
    }
    const parsed = JSON.parse(raw);
    const candidateAccounts =
      Array.isArray(parsed.accounts) && parsed.accounts.length > 0
        ? parsed.accounts
        : INITIAL_DATA.accounts;
    const candidateGoals = Array.isArray(parsed.savingsGoals)
      ? parsed.savingsGoals
      : INITIAL_DATA.savingsGoals;

    // Automatically reconcile Maya and Savings Goals so they are 100% in sync
    const { updatedAccounts, updatedSavingsGoals } = reconcileMayaAndSavingsGoals(
      candidateAccounts,
      candidateGoals
    );

    return {
      ...INITIAL_DATA,
      ...parsed,
      accounts: updatedAccounts,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_DATA.transactions,
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : INITIAL_DATA.recurring,
      savingsGoals: updatedSavingsGoals,
    };
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
    return INITIAL_DATA;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state to localStorage:', e);
  }
}

export function resetToSampleData(): AppState {
  saveAppState(INITIAL_DATA);
  return INITIAL_DATA;
}

export function clearAllUserData(baseCurrency = 'PHP'): AppState {
  const blankState: AppState = {
    baseCurrency,
    customExchangeRates: {},
    lastExchangeRateUpdate: new Date().toISOString(),
    accounts: INITIAL_DATA.accounts.map((acc) => ({
      ...acc,
      balance: 0,
      mayaPockets: acc.mayaPockets ? { emergencyFund: 0, firstMilly: 0, travel: 0 } : undefined,
      wiseClients: acc.wiseClients ? acc.wiseClients.map((c) => ({ ...c, balance: 0 })) : undefined,
    })),
    transactions: [],
    recurring: [],
    savingsGoals: [],
  };
  saveAppState(blankState);
  return blankState;
}

/**
 * Downloads a backup of all local data as a .json file directly to the user's hard drive
 */
export function exportJSONBackup(state: AppState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `financial_tracker_backup_${timestamp}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Imports state from a user-uploaded JSON file
 */
export async function importJSONBackup(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as AppState;
        if (!parsed || !Array.isArray(parsed.transactions)) {
          throw new Error('Invalid backup file format');
        }
        saveAppState(parsed);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * Exports transactions as CSV
 */
export function exportTransactionsCSV(
  transactions: Transaction[],
  baseCurrency: string
): void {
  const headers = [
    'Date',
    'Type',
    'Category',
    'Original Amount',
    'Currency',
    `Amount in Base (${baseCurrency})`,
    'Payment Method',
    'Notes',
    'Tags',
  ];

  const rows = transactions.map((t) => [
    t.date,
    t.type.toUpperCase(),
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    t.currency,
    t.amountInBase.toFixed(2),
    `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    `"${(t.tags || []).join(';')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `financial_report_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generates an offline printable PDF report using jsPDF
 */
export function exportFinancialPDFReport(
  transactions: Transaction[],
  goals: SavingsGoal[],
  baseCurrency: string,
  dateRangeLabel = 'All Time'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Title Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('FINANCIAL SUMMARY REPORT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Range: ${dateRangeLabel} | Base Currency: ${baseCurrency}`, 14, 21);

  y = 36;

  // Summary Metrics
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amountInBase, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amountInBase, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, ((netSavings / totalIncome) * 100)).toFixed(1) : '0.0';

  // Metric Cards (4 cards)
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cardHeight = 22;

  // Card 1: Income
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('TOTAL INCOMING', 17, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalIncome, baseCurrency), 17, y + 15);

  // Card 2: Expense
  doc.setFillColor(254, 242, 242); // rose-50
  doc.roundedRect(14 + cardWidth + 3, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(225, 29, 72);
  doc.text('TOTAL OUTGOING', 14 + cardWidth + 6, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalExpense, baseCurrency), 14 + cardWidth + 6, y + 15);

  // Card 3: Net Balance
  doc.setFillColor(245, 243, 255); // purple-50
  doc.roundedRect(14 + (cardWidth + 3) * 2, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(124, 58, 237);
  doc.text('NET CASHFLOW', 14 + (cardWidth + 3) * 2 + 3, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(netSavings, baseCurrency), 14 + (cardWidth + 3) * 2 + 3, y + 15);

  // Card 4: Savings Rate
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(14 + (cardWidth + 3) * 3, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(37, 99, 235);
  doc.text('SAVINGS RATE', 14 + (cardWidth + 3) * 3 + 3, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${savingsRate}%`, 14 + (cardWidth + 3) * 3 + 3, y + 15);

  y += 30;

  // Section 1: Top Expenses by Category
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Category Breakdown (Outgoing)', 14, y);
  y += 5;

  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amountInBase;
    });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  if (sortedCategories.length === 0) {
    doc.text('No expense records available for this period.', 14, y + 4);
    y += 10;
  } else {
    // Render mini bar table
    sortedCategories.slice(0, 6).forEach(([cat, amount]) => {
      const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      doc.text(`${cat}`, 14, y + 4);
      doc.text(`${formatCurrency(amount, baseCurrency)} (${pct.toFixed(1)}%)`, pageWidth - 50, y + 4);
      
      // mini bar
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(14, y + 6, pageWidth - 28, 2, 1, 1, 'F');
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(14, y + 6, Math.max(2, (pageWidth - 28) * (pct / 100)), 2, 1, 1, 'F');
      
      y += 11;
    });
  }

  y += 4;

  // Section 2: Active Savings Goals
  if (goals.length > 0 && y < 190) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Savings Goals Progress', 14, y);
    y += 6;

    goals.slice(0, 4).forEach((goal) => {
      const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`${goal.name} (Target: ${goal.targetDate})`, 14, y);
      doc.text(`${formatCurrency(goal.currentAmount, baseCurrency)} / ${formatCurrency(goal.targetAmount, baseCurrency)} [${pct}%]`, pageWidth - 60, y);
      
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y + 2, pageWidth - 28, 2, 1, 1, 'F');
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(14, y + 2, Math.max(2, (pageWidth - 28) * (pct / 100)), 2, 1, 1, 'F');
      y += 8;
    });
  }

  y += 6;

  // Section 3: Recent Transactions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Transactions Ledger', 14, y);
  y += 5;

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE', 16, y + 4);
  doc.text('TYPE', 36, y + 4);
  doc.text('CATEGORY', 56, y + 4);
  doc.text('ACCOUNT', 105, y + 4);
  doc.text('ORIGINAL', 140, y + 4);
  doc.text(`BASE (${baseCurrency})`, pageWidth - 36, y + 4);
  y += 7;

  // Table rows
  doc.setFont('helvetica', 'normal');
  const sortedTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const maxRows = Math.min(sortedTx.length, 14);

  for (let i = 0; i < maxRows; i++) {
    if (y > 275) break;
    const t = sortedTx[i];
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    doc.text(t.date, 16, y + 4);
    
    // Type indicator
    if (t.type === 'income') {
      doc.setTextColor(16, 185, 129);
      doc.text('INCOME', 36, y + 4);
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text('EXPENSE', 36, y + 4);
    }

    doc.setTextColor(51, 65, 85);
    doc.text(t.category.substring(0, 26), 56, y + 4);
    doc.text(t.paymentMethod || 'Other', 105, y + 4);
    doc.text(`${formatCurrency(t.amount, t.currency)}`, 140, y + 4);
    doc.text(`${formatCurrency(t.amountInBase, baseCurrency)}`, pageWidth - 36, y + 4);

    // Subtle line divider
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 6, pageWidth - 14, y + 6);
    y += 6.5;
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated with Offline Expense & Savings Tracker. Stored securely on your device.', 14, 288);

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`financial_report_${timestamp}.pdf`);
}
