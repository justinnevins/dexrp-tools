import { xrplClient } from './xrpl-client';

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
      console.warn('No exchange rate found for XRP pair');
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
    console.error('Failed to fetch XRP price from InFTF API:', error);
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
