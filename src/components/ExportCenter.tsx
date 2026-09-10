import React, { useState, useRef } from 'react';
import { AppState, Transaction, SavingsGoal } from '../types';
import {
  exportTransactionsCSV,
  exportFinancialPDFReport,
  exportJSONBackup,
  importJSONBackup,
  resetToSampleData,
  clearAllUserData,
} from '../utils/storage';
import { formatCurrency } from '../utils/currency';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Database,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

interface ExportCenterProps {
  appState: AppState;
  onRestoreState: (newState: AppState) => void;
}

export const ExportCenter: React.FC<ExportCenterProps> = ({
  appState,
  onRestoreState,
}) => {
  const [reportRange, setReportRange] = useState<'30d' | '90d' | 'year' | 'all'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterByRange = (transactions: Transaction[]) => {
    if (reportRange === 'all') return transactions;
    const now = new Date().getTime();
    const days = reportRange === '30d' ? 30 : reportRange === '90d' ? 90 : 365;
    const cutoff = new Date(now - days * 86400000).toISOString().split('T')[0];
    return transactions.filter((t) => t.date >= cutoff);
  };

  const handleExportCSV = () => {
    const subset = filterByRange(appState.transactions);
    exportTransactionsCSV(subset, appState.baseCurrency);
    showNotice(`Exported ${subset.length} transactions to CSV`);
  };

  const handleExportPDF = () => {
    const subset = filterByRange(appState.transactions);
    const rangeLabel =
      reportRange === '30d'
        ? 'Past 30 Days'
        : reportRange === '90d'
        ? 'Past Quarter'
        : reportRange === 'year'
        ? 'Past Year'
        : 'All Time Records';

    exportFinancialPDFReport(
      subset,
      appState.savingsGoals,
      appState.baseCurrency,
      rangeLabel
    );
    showNotice('Downloaded comprehensive PDF report');
  };

  const handleExportJSON = () => {
    exportJSONBackup(appState);
    showNotice('Full local storage backup downloaded to disk');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const restored = await importJSONBackup(file);
      onRestoreState(restored);
      showNotice('Data successfully restored from file!');
    } catch (err) {
      setErrorMessage('Failed to parse backup file. Please ensure it is a valid JSON backup.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetSample = () => {
    if (window.confirm('Reset application to sample demo data? Any unsaved changes will be overwritten.')) {
      const reset = resetToSampleData();
      onRestoreState(reset);
      showNotice('Reset to sample demo data');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? You can download a backup first.')) {
      const cleared = clearAllUserData(appState.baseCurrency);
      onRestoreState(cleared);
      showNotice('All data cleared. Application is now fresh.');
    }
  };

  const showNotice = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <span>Reports, Data Exports & Backup</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate professional CSV and PDF financial reports or backup your entire vault to local storage
        </p>
      </div>

      {/* Notification Toast */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Range Selection Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700">Filter Report Scope:</span>
        <div className="flex bg-slate-100 p-1 rounded-full text-xs font-medium">
          {(['30d', '90d', 'year', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setReportRange(r)}
              className={`px-3 py-1.5 rounded-full transition ${
                reportRange === r ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === '30d' ? 'Last 30 Days' : r === '90d' ? 'Last Quarter' : r === 'year' ? 'Past Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Export Cards Grid (Matching pastel bento card aesthetics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CSV Export Card */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Export CSV Spreadsheet</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Generate a clean, structured `.csv` spreadsheet with dates, categories, original currencies, base conversions, tags, and account methods.
            </p>
            <div className="mt-3 py-2 px-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
              Compatible with Microsoft Excel, Google Sheets, Apple Numbers, and Notion.
            </div>
          </div>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Report</span>
          </button>
        </div>

        {/* PDF Export Card */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Export PDF Summary Report</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Creates a printable, beautifully formatted A4 financial statement including executive KPI cards, category breakdown graphs, savings goal trackers, and transaction ledger.
            </p>
            <div className="mt-3 py-2 px-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-800">
              Generated 100% locally and offline in high resolution via jsPDF.
            </div>
          </div>

          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Local Storage & Device Vault Section */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Local Storage & Vault Management</h4>
            <p className="text-xs text-slate-500">
              Your financial data never leaves your browser unless you export it.
            </p>
          </div>
        </div>

        {/* Stats on stored items */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Transactions</span>
            <p className="text-lg font-bold text-slate-800">{appState.transactions.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Savings Goals</span>
            <p className="text-lg font-bold text-slate-800">{appState.savingsGoals.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Recurring Rules</span>
            <p className="text-lg font-bold text-slate-800">{appState.recurring.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Base Currency</span>
            <p className="text-lg font-bold text-indigo-600">{appState.baseCurrency}</p>
          </div>
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Download JSON */}
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download Backup (JSON)</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Restore From File</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />

          {/* Reset Demo Data */}
          <button
            onClick={handleResetSample}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>Load Demo Data</span>
          </button>

          {/* Clear Data */}
          <button
            onClick={handleClearAll}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Wipe All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
