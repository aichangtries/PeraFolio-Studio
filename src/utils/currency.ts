import { CurrencyConfig } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.92, flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 0.79, flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 152.0, flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUSD: 1.36, flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUSD: 1.52, flag: '🇦🇺' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateToUSD: 0.90, flag: '🇨🇭' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUSD: 83.5, flag: '🇮🇳' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 7.23, flag: '🇨🇳' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToUSD: 1.34, flag: '🇸🇬' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rateToUSD: 58.2, flag: '🇵🇭' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateToUSD: 5.42, flag: '🇧🇷' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rateToUSD: 1.64, flag: '🇳🇿' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToUSD: 3.67, flag: '🇦🇪' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', rateToUSD: 1380.0, flag: '🇰🇷' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', rateToUSD: 18.2, flag: '🇲🇽' },
];

export const DEFAULT_RATES: Record<string, number> = SUPPORTED_CURRENCIES.reduce(
  (acc, curr) => {
    acc[curr.code] = curr.rateToUSD;
    return acc;
  },
  {} as Record<string, number>
);

export function getCurrencyConfig(code: string): CurrencyConfig {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found || { code, symbol: code, name: code, rateToUSD: 1.0, flag: '🌐' };
}

/**
 * Converts any amount from currency A to currency B using USD-pegged rates table
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  customRates: Record<string, number> = {}
): number {
  if (fromCode === toCode) return amount;

  const rates = { ...DEFAULT_RATES, ...customRates };
  const fromRate = rates[fromCode] || 1.0;
  const toRate = rates[toCode] || 1.0;

  // Convert from -> USD -> to
  const amountInUSD = amount / fromRate;
  const converted = amountInUSD * toRate;

  return Math.round(converted * 100) / 100;
}

export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  showSymbol: boolean = true
): string {
  const config = getCurrencyConfig(currencyCode);
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formattedNumber = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
  }).format(absAmount);

  if (!showSymbol) {
    return `${isNegative ? '-' : ''}${formattedNumber}`;
  }

  return `${isNegative ? '-' : ''}${config.symbol}${formattedNumber}`;
}
