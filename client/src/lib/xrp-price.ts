import { xrplClient } from './xrpl-client';
import { PRICE_API, RLUSD_ISSUERS, GATEHUB_ISSUERS, CURRENCY_CODES } from './constants';

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
      counter = `${GATEHUB_ISSUERS.USD_MAINNET}_USD`;
      currency = 'USD';
      issuer = GATEHUB_ISSUERS.USD_MAINNET;
    } else {
      counter = `${RLUSD_ISSUERS.TESTNET}_RLUSD`;
      currency = 'RLUSD';
      issuer = RLUSD_ISSUERS.TESTNET;
    }

    const url = `${PRICE_API.INFTF_BASE_URL}/XRP/${counter}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`InFTF API error: ${response.status}`);
    }

    const data: InFTFExchangeRate = await response.json();

    if (!data.rate || data.rate === 0) {
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
  } catch {
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
      ? RLUSD_ISSUERS.MAINNET
      : RLUSD_ISSUERS.TESTNET;

    const takerGets = { currency: 'XRP' };
    const takerPays = { currency: CURRENCY_CODES.RLUSD_HEX, issuer: rlusdIssuer };

    const priceData = await xrplClient.getOrderBookPrice(network, takerGets, takerPays);

    // Use mid-market price or best available price
    const price = priceData.askPrice && priceData.bidPrice
      ? (priceData.askPrice + priceData.bidPrice) / 2
      : (priceData.askPrice || priceData.bidPrice);

    if (!price) {
      return null;
    }

    return {
      price,
      currency: 'RLUSD',
      issuer: rlusdIssuer,
      timestamp: Date.now()
    };
  } catch {
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
