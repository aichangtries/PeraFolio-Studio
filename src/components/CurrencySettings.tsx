import React, { useState } from 'react';
import { SUPPORTED_CURRENCIES, getCurrencyConfig, convertCurrency, formatCurrency } from '../utils/currency';
import { Globe, RefreshCw, ArrowRightLeft, Check, SlidersHorizontal, Calculator } from 'lucide-react';

interface CurrencySettingsProps {
  baseCurrency: string;
  customRates: Record<string, number>;
  onSelectBaseCurrency: (code: string) => void;
  onUpdateRates: (rates: Record<string, number>) => void;
}

export const CurrencySettings: React.FC<CurrencySettingsProps> = ({
  baseCurrency,
  customRates,
  onSelectBaseCurrency,
  onUpdateRates,
}) => {
  // Calculator state
  const [calcAmount, setCalcAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState(baseCurrency);

  // Rate edit modal or inline
  const [editRateCode, setEditRateCode] = useState<string | null>(null);
  const [editRateVal, setEditRateVal] = useState('');
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);

  const convertedResult = convertCurrency(
    parseFloat(calcAmount) || 0,
    fromCurrency,
    toCurrency,
    customRates
  );

  const handleSaveRate = (code: string) => {
    const val = parseFloat(editRateVal);
    if (isNaN(val) || val <= 0) return;

    onUpdateRates({
      ...customRates,
      [code]: val,
    });
    setEditRateCode(null);
  };

  const handleResetRates = () => {
    onUpdateRates({});
    setRefreshStatus('Exchange rates reset to defaults');
    setTimeout(() => setRefreshStatus(null), 3000);
  };

  const handleFetchLiveRates = async () => {
    setRefreshStatus('Updating exchange rates...');
    try {
      // Free open-access rates from frankfurter / open.er-api
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data && data.rates) {
        onUpdateRates(data.rates);
        setRefreshStatus('Live rates successfully updated!');
      } else {
        throw new Error('Invalid rate format');
      }
    } catch {
      setRefreshStatus('Offline mode: Using cached standard exchange rates');
    }
    setTimeout(() => setRefreshStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </span>
            <span>Multi-Currency & Global Tracking</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select your preferred primary base currency, view exchange rates against USD, or convert values
          </p>
        </div>

        <button
          onClick={handleFetchLiveRates}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span>Update Rates</span>
        </button>
      </div>

      {refreshStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-semibold animate-in fade-in">
          {refreshStatus}
        </div>
      )}

      {/* Quick Converter Widget Card */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Instant Currency Converter</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-center">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Amount</label>
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">From</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1 flex justify-center pt-4">
            <button
              onClick={() => {
                const temp = fromCurrency;
                setFromCurrency(toCurrency);
                setToCurrency(temp);
              }}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">To</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result banner */}
        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Converted Value</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(convertedResult, toCurrency)}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <span>1 {fromCurrency} ≈ </span>
            <strong className="text-slate-800">
              {formatCurrency(convertCurrency(1, fromCurrency, toCurrency, customRates), toCurrency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Select Base Currency Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Choose Primary Reporting Currency</h4>
          {Object.keys(customRates).length > 0 && (
            <button
              onClick={handleResetRates}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Reset custom rates
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SUPPORTED_CURRENCIES.map((curr) => {
            const isSelected = curr.code === baseCurrency;
            const currentRate = customRates[curr.code] || curr.rateToUSD;

            return (
              <div
                key={curr.code}
                onClick={() => onSelectBaseCurrency(curr.code)}
                className={`p-4 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-white/80 backdrop-blur-xl border-white/80 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{curr.flag}</span>
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{curr.symbol}</span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">{curr.code}</p>
                  <p className="text-[11px] text-slate-500">{curr.name}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>1 USD = {currentRate}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditRateCode(curr.code);
                      setEditRateVal(currentRate.toString());
                    }}
                    className="hover:text-indigo-600 font-medium"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Rate Modal */}
      {editRateCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-bold text-slate-900 mb-2">
              Edit Exchange Rate for {editRateCode}
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              1 US Dollar (USD) equals how many {editRateCode}?
            </p>

            <input
              type="number"
              step="any"
              autoFocus
              value={editRateVal}
              onChange={(e) => setEditRateVal(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl mb-4 font-bold"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditRateCode(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRate(editRateCode)}
                className="flex-1 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
