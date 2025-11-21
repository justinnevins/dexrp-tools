/**
 * DEX Utilities
 * 
 * Parse XRPL transaction metadata to detect offer fills and calculate statistics
 */

import type { StoredOffer, OfferFill, Amount, OfferWithStatus } from './dex-types';
import { xrplClient } from './xrpl-client';

/**
 * Parse transaction metadata to detect if this transaction filled any offers
 * Returns array of offer fills extracted from AffectedNodes
 */
export interface OfferFillWithSequence extends OfferFill {
  offerSequence: number; // The sequence number of the offer that was filled
}

export function extractOfferFills(
  tx: any,
  walletAddress: string
): OfferFillWithSequence[] {
  const fills: OfferFillWithSequence[] = [];
  
  if (!tx.meta || !tx.meta.AffectedNodes) {
    return fills;
  }
  
  const transaction = tx.tx_json || tx.tx || tx;
  const txHash = transaction.hash || tx.hash;
  const timestamp = transaction.date ? (transaction.date * 1000 + 946684800000) : Date.now();
  const ledgerIndex = tx.ledger_index || tx.ledger_current_index || 0;
  
  // Check for immediate partial fill when creating an offer
  // This happens when OfferCreate transaction consumes existing offers
  if (transaction.TransactionType === 'OfferCreate' && transaction.Account === walletAddress) {
    for (const node of tx.meta.AffectedNodes) {
      if (node.CreatedNode?.LedgerEntryType === 'Offer') {
        const newFields = node.CreatedNode.NewFields;
        if (newFields?.Account === walletAddress) {
          // Compare submitted amounts with created amounts
          const submittedGets = transaction.TakerGets;
          const submittedPays = transaction.TakerPays;
          const createdGets = newFields.TakerGets;
          const createdPays = newFields.TakerPays;
          
          // Calculate immediate fill (submitted - created = consumed)
          const immediateFillGets = calculateAmountDifference(submittedGets, createdGets);
          const immediateFillPays = calculateAmountDifference(submittedPays, createdPays);
          
          if (immediateFillGets || immediateFillPays) {
            fills.push({
              offerSequence: transaction.Sequence,
              txHash,
              timestamp,
              ledgerIndex,
              takerGotAmount: immediateFillGets || submittedGets,
              takerPaidAmount: immediateFillPays || submittedPays,
              executionPrice: calculateExecutionPrice(
                immediateFillGets || submittedGets,
                immediateFillPays || submittedPays
              )
            });
          }
          break; // Found our created offer
        }
      }
    }
  }
  
  // Look for ModifiedNode or DeletedNode of type Offer belonging to our wallet
  for (const node of tx.meta.AffectedNodes) {
    const nodeData = node.ModifiedNode || node.DeletedNode;
    
    if (!nodeData || nodeData.LedgerEntryType !== 'Offer') {
      continue;
    }
    
    const finalFields = nodeData.FinalFields;
    const previousFields = nodeData.PreviousFields;
    
    // Check if this offer belongs to our wallet
    // For DeletedNode, Account/Sequence might only be in PreviousFields
    const offerAccount = finalFields?.Account || previousFields?.Account;
    if (offerAccount !== walletAddress) {
      continue;
    }
    
    // Get the offer sequence number (try both FinalFields and PreviousFields)
    const offerSequence = finalFields?.Sequence || previousFields?.Sequence;
    if (!offerSequence) {
      console.warn('Offer node missing Sequence field:', nodeData);
      continue;
    }
    
    // Calculate the fill amount by comparing previous and final fields
    if (previousFields && (previousFields.TakerGets || previousFields.TakerPays)) {
      const previousGets = previousFields.TakerGets;
      const previousPays = previousFields.TakerPays;
      const finalGets = finalFields?.TakerGets;
      const finalPays = finalFields?.TakerPays;
      
      // Calculate how much was filled
      const takerGotAmount = calculateAmountDifference(previousGets, finalGets);
      const takerPaidAmount = calculateAmountDifference(previousPays, finalPays);
      
      if (takerGotAmount || takerPaidAmount) {
        fills.push({
          offerSequence,
          txHash,
          timestamp,
          ledgerIndex,
          takerGotAmount: takerGotAmount || previousGets,
          takerPaidAmount: takerPaidAmount || previousPays,
          executionPrice: calculateExecutionPrice(takerGotAmount || previousGets, takerPaidAmount || previousPays)
        });
      }
    } else if (node.DeletedNode) {
      // Offer was fully consumed
      const previousGets = previousFields?.TakerGets || finalFields?.TakerGets;
      const previousPays = previousFields?.TakerPays || finalFields?.TakerPays;
      
      if (previousGets && previousPays) {
        fills.push({
          offerSequence,
          txHash,
          timestamp,
          ledgerIndex,
          takerGotAmount: previousGets,
          takerPaidAmount: previousPays,
          executionPrice: calculateExecutionPrice(previousGets, previousPays)
        });
      }
    }
  }
  
  return fills;
}

/**
 * Calculate the difference between two amounts (previous - current)
 * Returns the amount that was consumed
 */
function calculateAmountDifference(
  previous: Amount | string | undefined,
  current: Amount | string | undefined
): Amount | string | null {
  if (!previous) return null;
  if (!current) return previous; // Fully consumed
  
  if (typeof previous === 'string' && typeof current === 'string') {
    // XRP amounts in drops
    const diff = BigInt(previous) - BigInt(current);
    return diff > 0 ? diff.toString() : null;
  }
  
  if (typeof previous === 'object' && typeof current === 'object') {
    // Token amounts
    const prevValue = parseFloat(previous.value);
    const currValue = parseFloat(current.value);
    const diff = prevValue - currValue;
    
    if (diff > 0) {
      return {
        currency: previous.currency,
        issuer: previous.issuer,
        value: diff.toString()
      };
    }
  }
  
  return null;
}

/**
 * Calculate execution price from amounts
 */
function calculateExecutionPrice(
  takerGets: Amount | string,
  takerPays: Amount | string
): number | undefined {
  try {
    let getsValue: number;
    let paysValue: number;
    
    if (typeof takerGets === 'string') {
      getsValue = parseFloat(xrplClient.formatXRPAmount(takerGets));
    } else {
      getsValue = parseFloat(takerGets.value);
    }
    
    if (typeof takerPays === 'string') {
      paysValue = parseFloat(xrplClient.formatXRPAmount(takerPays));
    } else {
      paysValue = parseFloat(takerPays.value);
    }
    
    if (getsValue > 0) {
      return paysValue / getsValue;
    }
  } catch (error) {
    console.error('Error calculating execution price:', error);
  }
  
  return undefined;
}

/**
 * Enrich stored offer with current status and calculated fields
 */
export function enrichOfferWithStatus(
  storedOffer: StoredOffer,
  currentOffer?: any // From account_offers query
): OfferWithStatus {
  const currentTakerGets = currentOffer?.taker_gets;
  const currentTakerPays = currentOffer?.taker_pays;
  
  // Calculate total filled amounts
  const totalFilledGets = calculateTotalFilled(storedOffer.fills, 'takerGotAmount');
  const totalFilledPays = calculateTotalFilled(storedOffer.fills, 'takerPaidAmount');
  
  // Calculate fill percentage
  const fillPercentage = calculateFillPercentage(
    storedOffer.originalTakerGets,
    totalFilledGets
  );
  
  // Calculate average execution price
  const averageExecutionPrice = calculateAverageExecutionPrice(storedOffer.fills);
  
  // Determine if fully executed or cancelled
  // An offer is fully executed if fill percentage is >= 99.9% (allowing for rounding)
  const isFullyExecuted = fillPercentage >= 99.9;
  const isCancelled = !currentOffer && storedOffer.fills.length === 0;
  
  return {
    ...storedOffer,
    currentTakerGets,
    currentTakerPays,
    totalFilled: {
      takerGets: totalFilledGets,
      takerPays: totalFilledPays
    },
    fillPercentage,
    averageExecutionPrice,
    isFullyExecuted,
    isCancelled
  };
}

/**
 * Calculate total filled amount from fills
 */
function calculateTotalFilled(fills: OfferFill[], field: 'takerGotAmount' | 'takerPaidAmount'): string {
  let total = 0;
  let isXRP = true;
  
  for (const fill of fills) {
    const amount = fill[field];
    if (typeof amount === 'string') {
      total += parseFloat(xrplClient.formatXRPAmount(amount));
    } else {
      isXRP = false;
      total += parseFloat(amount.value);
    }
  }
  
  return total.toFixed(isXRP ? 6 : 6);
}

/**
 * Calculate fill percentage
 */
function calculateFillPercentage(original: Amount | string, filled: string): number {
  try {
    let originalValue: number;
    
    if (typeof original === 'string') {
      originalValue = parseFloat(xrplClient.formatXRPAmount(original));
    } else {
      originalValue = parseFloat(original.value);
    }
    
    const filledValue = parseFloat(filled);
    
    if (originalValue > 0) {
      return Math.min(100, (filledValue / originalValue) * 100);
    }
  } catch (error) {
    console.error('Error calculating fill percentage:', error);
  }
  
  return 0;
}

/**
 * Calculate weighted average execution price from fills
 */
function calculateAverageExecutionPrice(fills: OfferFill[]): number | undefined {
  if (fills.length === 0) return undefined;
  
  let totalValue = 0;
  let totalWeight = 0;
  
  for (const fill of fills) {
    if (fill.executionPrice !== undefined) {
      const weight = typeof fill.takerGotAmount === 'string'
        ? parseFloat(xrplClient.formatXRPAmount(fill.takerGotAmount))
        : parseFloat((fill.takerGotAmount as Amount).value);
      
      totalValue += fill.executionPrice * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? totalValue / totalWeight : undefined;
}

/**
 * Format amount for display
 */
export function formatOfferAmount(amount: Amount | string): string {
  if (typeof amount === 'string') {
    return `${xrplClient.formatXRPAmount(amount)} XRP`;
  }
  return `${parseFloat(amount.value).toFixed(6)} ${xrplClient.decodeCurrency(amount.currency)}`;
}

/**
 * Calculate the wallet's actual balance changes from transaction metadata
 * Returns { xrpChange, tokenChanges } where changes are positive for increases, negative for decreases
 */
export function calculateBalanceChanges(tx: any, walletAddress: string): {
  xrpChange: string | null;
  tokenChanges: Array<{ currency: string; issuer: string; change: string }>;
} {
  const result = {
    xrpChange: null as string | null,
    tokenChanges: [] as Array<{ currency: string; issuer: string; change: string }>
  };

  if (!tx.meta || !tx.meta.AffectedNodes) {
    return result;
  }

  // Look through AffectedNodes for balance changes
  for (const node of tx.meta.AffectedNodes) {
    const nodeData = node.ModifiedNode || node.CreatedNode || node.DeletedNode;
    
    if (!nodeData) continue;

    // Check AccountRoot for XRP balance changes
    if (nodeData.LedgerEntryType === 'AccountRoot') {
      const finalFields = nodeData.FinalFields;
      const previousFields = nodeData.PreviousFields;
      
      // Only process if this is our wallet
      const account = finalFields?.Account || previousFields?.Account;
      if (account === walletAddress) {
        const prevBalance = previousFields?.Balance;
        const finalBalance = finalFields?.Balance;
        
        if (prevBalance && finalBalance) {
          const change = BigInt(finalBalance) - BigInt(prevBalance);
          if (change !== BigInt(0)) {
            result.xrpChange = xrplClient.formatXRPAmount(change.toString().replace('-', ''));
            if (change < BigInt(0)) {
              result.xrpChange = '-' + result.xrpChange;
            }
          }
        }
      }
    }
    
    // Check RippleState for token balance changes
    if (nodeData.LedgerEntryType === 'RippleState') {
      const finalFields = nodeData.FinalFields;
      const previousFields = nodeData.PreviousFields;
      
      // RippleState has HighLimit and LowLimit representing the two parties
      const highLimit = finalFields?.HighLimit || previousFields?.HighLimit;
      const lowLimit = finalFields?.LowLimit || previousFields?.LowLimit;
      
      // Check if our wallet is involved
      const isHighParty = highLimit?.issuer === walletAddress;
      const isLowParty = lowLimit?.issuer === walletAddress;
      
      if (isHighParty || isLowParty) {
        const prevBalance = previousFields?.Balance;
        const finalBalance = finalFields?.Balance;
        
        if (prevBalance && finalBalance && prevBalance.value && finalBalance.value) {
          let change = parseFloat(finalBalance.value) - parseFloat(prevBalance.value);
          
          // Balance is from the perspective of the low party
          // If we're the high party, invert the change
          if (isHighParty) {
            change = -change;
          }
          
          if (change !== 0) {
            const currency = xrplClient.decodeCurrency(finalBalance.currency || prevBalance.currency);
            const issuer = isHighParty ? lowLimit.issuer : highLimit.issuer;
            
            result.tokenChanges.push({
              currency,
              issuer,
              change: change.toString()
            });
          }
        }
      }
    }
  }

  return result;
}
