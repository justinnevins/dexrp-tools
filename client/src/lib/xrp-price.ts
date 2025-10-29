import { xrplClient } from './xrpl-client';

export interface XRPPriceData {
  price: number;
  currency: string;
  issuer: string;
  timestamp: number;
}

/**
 * Fetches XRP price from the XRPL DEX using book_offers
 * Calculates volume-weighted average price from order book
 */
export async function fetchXRPPrice(): Promise<XRPPriceData | null> {
  try {
    // Ensure client is connected before making request
    await xrplClient.connect();
    
    const client = xrplClient.getClient();
    if (!client) {
      throw new Error('XRPL client not connected');
    }

    // Using a popular USD stablecoin on XRPL for price reference
    // Bitstamp USD is one of the most liquid pairs
    const response = await client.request({
      command: 'book_offers',
      taker_gets: { currency: 'XRP' },
      taker_pays: {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' // Bitstamp USD
      },
      limit: 10,
      ledger_index: 'validated'
    });

    if (!response.result.offers || response.result.offers.length === 0) {
      console.warn('No offers found for XRP/USD pair');
      return null;
    }

    // Calculate volume-weighted average price
    let totalXRP = 0;
    let totalUSD = 0;

    for (const offer of response.result.offers) {
      const xrpAmount = typeof offer.TakerGets === 'string' 
        ? parseFloat(offer.TakerGets) / 1000000 // Convert drops to XRP
        : parseFloat(offer.TakerGets.value);
      
      const usdAmount = typeof offer.TakerPays === 'string'
        ? parseFloat(offer.TakerPays) / 1000000
        : parseFloat(offer.TakerPays.value);

      totalXRP += xrpAmount;
      totalUSD += usdAmount;
    }

    const averagePrice = totalXRP > 0 ? totalUSD / totalXRP : 0;

    return {
      price: averagePrice,
      currency: 'USD',
      issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to fetch XRP price:', error);
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
