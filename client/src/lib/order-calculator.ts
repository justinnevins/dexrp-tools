import { xrplClient } from './xrpl-client';

const BASE_RESERVE_XRP = 20;
const TRUSTLINE_RESERVE_XRP = 2;
const OFFER_RESERVE_XRP = 0.2;
const TRANSACTION_FEE_XRP = 0.00001;

export interface OrderCalculation {
  amount: string;
  price: string;
  total: string;
}

export interface MaxCalculation {
  maxAmount: string;
  maxTotal: string;
  reason: string;
}

export interface ReserveInfo {
  baseReserve: number;
  ownerReserve: number;
  totalReserve: number;
  availableBalance: number;
}

export function calculateTotal(amount: string, price: string): string {
  if (!amount || !price || parseFloat(amount) <= 0 || parseFloat(price) <= 0) {
    return '';
  }
  
  const total = parseFloat(amount) * parseFloat(price);
  return total.toFixed(8).replace(/\.?0+$/, '');
}

export function calculateAmount(total: string, price: string): string {
  if (!total || !price || parseFloat(total) <= 0 || parseFloat(price) <= 0) {
    return '';
  }
  
  const amount = parseFloat(total) / parseFloat(price);
  return amount.toFixed(8).replace(/\.?0+$/, '');
}

export function calculatePrice(amount: string, total: string): string {
  if (!amount || !total || parseFloat(amount) <= 0 || parseFloat(total) <= 0) {
    return '';
  }
  
  const price = parseFloat(total) / parseFloat(amount);
  return price.toFixed(8).replace(/\.?0+$/, '');
}

export function calculateXRPReserves(
  trustlineCount: number,
  offerCount: number
): ReserveInfo {
  const trustlineReserve = trustlineCount * TRUSTLINE_RESERVE_XRP;
  const offerReserve = offerCount * OFFER_RESERVE_XRP;
  const ownerReserve = trustlineReserve + offerReserve;
  const totalReserve = BASE_RESERVE_XRP + ownerReserve;
  
  return {
    baseReserve: BASE_RESERVE_XRP,
    ownerReserve,
    totalReserve,
    availableBalance: 0
  };
}

export function calculateAvailableXRP(
  xrpBalance: number,
  trustlineCount: number,
  offerCount: number
): number {
  const reserves = calculateXRPReserves(trustlineCount, offerCount);
  const available = xrpBalance - reserves.totalReserve - TRANSACTION_FEE_XRP;
  return Math.max(0, available);
}

export function calculateMaxBuy(
  quoteBalance: number,
  price: string,
  isQuoteXRP: boolean,
  trustlineCount: number = 0,
  offerCount: number = 0
): MaxCalculation {
  if (!price || parseFloat(price) <= 0) {
    return {
      maxAmount: '',
      maxTotal: '',
      reason: 'Price required'
    };
  }

  const priceNum = parseFloat(price);
  let availableQuote = quoteBalance;

  if (isQuoteXRP) {
    availableQuote = calculateAvailableXRP(quoteBalance, trustlineCount, offerCount);
    if (availableQuote <= 0) {
      return {
        maxAmount: '',
        maxTotal: '',
        reason: 'Insufficient XRP (reserves required)'
      };
    }
  }

  const maxAmount = availableQuote / priceNum;
  
  return {
    maxAmount: maxAmount.toFixed(8).replace(/\.?0+$/, ''),
    maxTotal: availableQuote.toFixed(8).replace(/\.?0+$/, ''),
    reason: 'success'
  };
}

export function calculateMaxSell(
  baseBalance: number,
  price: string,
  isBaseXRP: boolean,
  trustlineCount: number = 0,
  offerCount: number = 0
): MaxCalculation {
  if (!price || parseFloat(price) <= 0) {
    return {
      maxAmount: '',
      maxTotal: '',
      reason: 'Price required'
    };
  }

  const priceNum = parseFloat(price);
  let availableBase = baseBalance;

  if (isBaseXRP) {
    availableBase = calculateAvailableXRP(baseBalance, trustlineCount, offerCount);
    if (availableBase <= 0) {
      return {
        maxAmount: '',
        maxTotal: '',
        reason: 'Insufficient XRP (reserves required)'
      };
    }
  }

  const maxTotal = availableBase * priceNum;
  
  return {
    maxAmount: availableBase.toFixed(8).replace(/\.?0+$/, ''),
    maxTotal: maxTotal.toFixed(8).replace(/\.?0+$/, ''),
    reason: 'success'
  };
}

export function formatOrderPrice(price: string, decimals: number = 6): string {
  if (!price) return '';
  const num = parseFloat(price);
  if (isNaN(num)) return '';
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

export function getTokenBalance(
  currency: string,
  issuer: string,
  accountLines: any[] | undefined
): number {
  if (!accountLines) return 0;
  
  const decodedCurrency = xrplClient.decodeCurrency(currency);
  const line = accountLines.find(
    (line) =>
      xrplClient.decodeCurrency(line.currency) === decodedCurrency &&
      line.account === issuer
  );
  
  return line ? parseFloat(line.balance) : 0;
}
