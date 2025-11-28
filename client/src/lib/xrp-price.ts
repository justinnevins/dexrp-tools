import { xrplClient } from './xrpl-client';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log('[XRPPrice]', ...args);

export interface XRPPriceData {
  price: number;
  currency: string;
  issuer: string;
  timestamp: number;
  ledgerIndex?: number;
  txHash?: string;
}

export interface DEXPriceData {
  price: number;
  currency: string;
  issuer: string;
  timestamp: number;
}

interface InFTFExchangeRate {
  rate: number;
  ledger_index: number;
  tx_hash: string;
  timestamp: string;
}

/**
 * Fetches XRP price from InFTF XRPL Data API
 * Uses actual executed trade rates for accuracy
 */
export async function fetchXRPPrice(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<XRPPriceData | null> {
  try {
    const currentNetwork = network;
    
    let counter: string;
    let currency: string;
    let issuer: string;

    if (currentNetwork === 'mainnet') {
      counter = 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq_USD';
      currency = 'USD';
      issuer = 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq';
    } else {
      counter = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV_RLUSD';
      currency = 'RLUSD';
      issuer = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
    }

    const url = `https://xrpldata.inftf.org/v1/iou/exchange_rates/XRP/${counter}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`InFTF API error: ${response.status}`);
    }

    const data: InFTFExchangeRate = await response.json();

    if (!data.rate || data.rate === 0) {
      log('No exchange rate found for XRP pair');
      return null;
    }

    return {
      price: data.rate,
      currency,
      issuer,
      timestamp: new Date(data.timestamp).getTime(),
      ledgerIndex: data.ledger_index,
      txHash: data.tx_hash
    };
  } catch (error) {
    console.error('[XRPPrice] Failed to fetch XRP price from InFTF API:', error);
    return null;
  }
}

/**
 * Fetches XRP/RLUSD price directly from XRPL order book
 */
export async function fetchXRPToRLUSDPrice(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<DEXPriceData | null> {
  try {
    const isMainnet = network === 'mainnet';
    const rlusdIssuer = isMainnet 
      ? 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
      : 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';

    const takerGets = { currency: 'XRP' };
    const takerPays = { currency: '524C555344000000000000000000000000000000', issuer: rlusdIssuer };

    const priceData = await xrplClient.getOrderBookPrice(network, takerGets, takerPays);

    // Use mid-market price or best available price
    const price = priceData.askPrice && priceData.bidPrice
      ? (priceData.askPrice + priceData.bidPrice) / 2
      : (priceData.askPrice || priceData.bidPrice);

    if (!price) {
      log('No price available for XRP/RLUSD pair');
      return null;
    }

    return {
      price,
      currency: 'RLUSD',
      issuer: rlusdIssuer,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[XRPPrice] Failed to fetch XRP/RLUSD price from order book:', error);
    return null;
  }
}

/**
 * Formats price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(price);
}
