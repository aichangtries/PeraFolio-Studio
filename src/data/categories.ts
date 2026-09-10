import { CategoryDefinition } from '../types';

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // Expense categories
  {
    id: 'housing',
    name: 'Housing & Rent',
    type: 'expense',
    icon: 'Home',
    color: '#6366f1',
    bgColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'groceries',
    name: 'Groceries & Food',
    type: 'expense',
    icon: 'ShoppingCart',
    color: '#10b981',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'dining',
    name: 'Dining Out & Cafe',
    type: 'expense',
    icon: 'Utensils',
    color: '#f59e0b',
    bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'transportation',
    name: 'Transport & Travel',
    type: 'expense',
    icon: 'Car',
    color: '#3b82f6',
    bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'utilities',
    name: 'Bills & Utilities',
    type: 'expense',
    icon: 'Zap',
    color: '#ec4899',
    bgColor: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Subs',
    type: 'expense',
    icon: 'Tv',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'health',
    name: 'Health & Fitness',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#14b8a6',
    bgColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'shopping',
    name: 'Shopping & Gear',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#f43f5e',
    bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'education',
    name: 'Education & Books',
    type: 'expense',
    icon: 'BookOpen',
    color: '#06b6d4',
    bgColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    id: 'personal',
    name: 'Personal Care',
    type: 'expense',
    icon: 'Sparkles',
    color: '#eab308',
    bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  // Income categories
  {
    id: 'salary',
    name: 'Primary Salary',
    type: 'income',
    icon: 'Briefcase',
    color: '#10b981',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'freelance',
    name: 'Freelance & Consulting',
    type: 'income',
    icon: 'Laptop',
    color: '#3b82f6',
    bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'investments',
    name: 'Investments & Dividends',
    type: 'income',
    icon: 'TrendingUp',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'gifts',
    name: 'Gifts & Reimbursements',
    type: 'income',
    icon: 'Gift',
    color: '#ec4899',
    bgColor: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'side_hustle',
    name: 'Side Hustle & Sales',
    type: 'income',
    icon: 'Store',
    color: '#f97316',
    bgColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'other',
    name: 'Other / Miscellaneous',
    type: 'both',
    icon: 'HelpCircle',
    color: '#64748b',
    bgColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export function getCategoryDefinition(name: string): CategoryDefinition {
  const match = DEFAULT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() || c.id === name.toLowerCase()
  );
  if (match) return match;
  return {
    id: 'custom',
    name,
    type: 'both',
    icon: 'Tag',
    color: '#64748b',
    bgColor: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}
