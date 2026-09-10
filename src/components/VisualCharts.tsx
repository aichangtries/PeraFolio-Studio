import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { getCategoryDefinition } from '../data/categories';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, Calendar } from 'lucide-react';

interface VisualChartsProps {
  transactions: Transaction[];
  baseCurrency: string;
}

export const VisualCharts: React.FC<VisualChartsProps> = ({
  transactions,
  baseCurrency,
}) => {
  const [timeframe, setTimeframe] = useState<'30d' | '3m' | 'all'>('30d');
  const [chartMode, setChartMode] = useState<'category' | 'trend'>('category');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter transactions based on timeframe
  const filteredTransactions = useMemo(() => {
    if (timeframe === 'all') return transactions;
    const now = new Date();
    const days = timeframe === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 86400000);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return transactions.filter((t) => t.date >= cutoffStr);
  }, [transactions, timeframe]);

  // Expenses only
  const expenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense'),
    [filteredTransactions]
  );
  const totalExpense = useMemo(
    () => expenses.reduce((sum, t) => sum + t.amountInBase, 0),
    [expenses]
  );

  // Incomes only
  const incomes = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'income'),
    [filteredTransactions]
  );
  const totalIncome = useMemo(
    () => incomes.reduce((sum, t) => sum + t.amountInBase, 0),
    [incomes]
  );

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, { total: number; count: number; color: string }> = {};
    expenses.forEach((t) => {
      const def = getCategoryDefinition(t.category);
      if (!map[t.category]) {
        map[t.category] = { total: 0, count: 0, color: def.color };
      }
      map[t.category].total += t.amountInBase;
      map[t.category].count += 1;
    });

    return Object.entries(map)
      .map(([category, info]) => ({
        category,
        total: info.total,
        count: info.count,
        color: info.color,
        percentage: totalExpense > 0 ? (info.total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalExpense]);

  // Monthly / Period Comparison
  const periodData = useMemo(() => {
    const monthsMap: Record<string, { income: number; expense: number; label: string }> = {};

    // Sort transactions chronologically
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((t) => {
      const [year, month] = t.date.split('-');
      const key = `${year}-${month}`;
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

      if (!monthsMap[key]) {
        monthsMap[key] = { income: 0, expense: 0, label };
      }
      if (t.type === 'income') {
        monthsMap[key].income += t.amountInBase;
      } else {
        monthsMap[key].expense += t.amountInBase;
      }
    });

    // Take last 6 periods or at least current months
    const keys = Object.keys(monthsMap).slice(-6);
    return keys.map((k) => monthsMap[k]);
  }, [transactions]);

  // Max value for bar scaling
  const maxPeriodValue = useMemo(() => {
    let max = 1000;
    periodData.forEach((p) => {
      if (p.income > max) max = p.income;
      if (p.expense > max) max = p.expense;
    });
    return max * 1.15; // 15% headroom
  }, [periodData]);

  // Donut SVG paths calculation
  const donutSegments = useMemo(() => {
    let accumulatedAngle = 0;
    const radius = 70;
    const innerRadius = 45;
    const cx = 90;
    const cy = 90;

    return categoryData.map((item) => {
      const sliceAngle = (item.percentage / 100) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sliceAngle;
      accumulatedAngle += sliceAngle;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      return {
        ...item,
        pathData,
        startAngle,
        endAngle,
      };
    });
  }, [categoryData]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-xs space-y-6">
      {/* Header with Switchers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Financial Visual Analytics</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-currency breakdown normalized to {baseCurrency}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart mode tabs */}
          <div className="flex bg-slate-100/80 p-1 rounded-full text-xs font-medium">
            <button
              onClick={() => setChartMode('category')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                chartMode === 'category'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>
            <button
              onClick={() => setChartMode('trend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                chartMode === 'trend'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Cash Flow</span>
            </button>
          </div>

          {/* Timeframe pill filter */}
          <div className="flex bg-slate-100/80 p-1 rounded-full text-xs font-medium">
            {(['30d', '3m', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1.5 rounded-full transition ${
                  timeframe === t
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === '30d' ? 'Last 30d' : t === '3m' ? 'Last 90d' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Content Area */}
      {chartMode === 'category' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart Visual */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative p-4">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg viewBox="0 0 180 180" className="w-full h-full drop-shadow-xs">
                {donutSegments.length === 0 ? (
                  <circle cx="90" cy="90" r="60" fill="none" stroke="#e2e8f0" strokeWidth="25" />
                ) : (
                  donutSegments.map((segment) => {
                    const isHovered = hoveredCategory === segment.category;
                    return (
                      <path
                        key={segment.category}
                        d={segment.pathData}
                        fill={segment.color}
                        className="transition-all duration-200 cursor-pointer"
                        opacity={hoveredCategory ? (isHovered ? 1 : 0.4) : 0.92}
                        transform={isHovered ? 'scale(1.03) translate(-2.7, -2.7)' : ''}
                        onMouseEnter={() => setHoveredCategory(segment.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );
                  })
                )}
              </svg>

              {/* Center Donut Hole Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {hoveredCategory || 'Total Spent'}
                </span>
                <span className="text-base font-extrabold text-slate-900 tracking-tight">
                  {hoveredCategory
                    ? formatCurrency(
                        categoryData.find((c) => c.category === hoveredCategory)?.total || 0,
                        baseCurrency
                      )
                    : formatCurrency(totalExpense, baseCurrency)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {hoveredCategory
                    ? `${(
                        categoryData.find((c) => c.category === hoveredCategory)?.percentage || 0
                      ).toFixed(1)}% of total`
                    : `${expenses.length} records`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Hover over or click a category to inspect volume
            </p>
          </div>

          {/* Category List Breakdown */}
          <div className="md:col-span-7 space-y-2.5">
            {categoryData.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No expense transactions logged in this timeframe.
              </div>
            ) : (
              categoryData.slice(0, 6).map((item) => {
                const isHovered = hoveredCategory === item.category;
                return (
                  <div
                    key={item.category}
                    onMouseEnter={() => setHoveredCategory(item.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`p-2.5 rounded-2xl border transition cursor-pointer ${
                      isHovered
                        ? 'bg-slate-50 border-slate-300 shadow-xs'
                        : 'bg-white/60 border-slate-100 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800">{item.category}</span>
                        <span className="text-[10px] text-slate-400">({item.count} items)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.total, baseCurrency)}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 w-9 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress track */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(2, item.percentage)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Monthly / Period Cash Flow Comparison */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="font-medium text-slate-700">Incoming Cash</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500" />
                <span className="font-medium text-slate-700">Outgoing Cash</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Monthly Comparisons</span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 flex items-end justify-between gap-3 pt-4 px-2">
            {periodData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No financial history available yet.
              </div>
            ) : (
              periodData.map((p, idx) => {
                const incHeight = maxPeriodValue > 0 ? (p.income / maxPeriodValue) * 160 : 0;
                const expHeight = maxPeriodValue > 0 ? (p.expense / maxPeriodValue) * 160 : 0;
                const net = p.income - p.expense;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-24 bg-slate-900 text-white text-[10px] rounded-xl py-1.5 px-2.5 shadow-lg pointer-events-none z-20 whitespace-nowrap">
                      <p className="font-bold text-slate-200">{p.label}</p>
                      <p className="text-emerald-400">In: {formatCurrency(p.income, baseCurrency)}</p>
                      <p className="text-rose-400">Out: {formatCurrency(p.expense, baseCurrency)}</p>
                      <p className="text-slate-300 font-semibold border-t border-slate-700 pt-0.5 mt-0.5">
                        Net: {formatCurrency(net, baseCurrency)}
                      </p>
                    </div>

                    {/* Dual Bars */}
                    <div className="w-full flex items-end justify-center gap-1.5 h-44">
                      {/* Income bar */}
                      <div
                        style={{ height: `${Math.max(4, incHeight)}px` }}
                        className="w-full max-w-[20px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs"
                      />
                      {/* Expense bar */}
                      <div
                        style={{ height: `${Math.max(4, expHeight)}px` }}
                        className="w-full max-w-[20px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs"
                      />
                    </div>

                    {/* Label */}
                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
                      {p.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Summary Pill Row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Total Inflow</span>
              <p className="text-sm font-extrabold text-emerald-900 mt-0.5">
                {formatCurrency(totalIncome, baseCurrency)}
              </p>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-rose-700">Total Outflow</span>
              <p className="text-sm font-extrabold text-rose-900 mt-0.5">
                {formatCurrency(totalExpense, baseCurrency)}
              </p>
            </div>
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-indigo-700">Net Balance</span>
              <p className="text-sm font-extrabold text-indigo-900 mt-0.5">
                {formatCurrency(totalIncome - totalExpense, baseCurrency)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
