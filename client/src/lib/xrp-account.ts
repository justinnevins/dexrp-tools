import type { AccountInfoResponse } from 'xrpl';

export interface BalanceInfo {
  totalBalance: number;
  reserved: number;
  available: number;
  availableMinusFees: number;
}

const BASE_RESERVE_XRP = 1;
const OWNER_RESERVE_XRP = 0.2;
const STANDARD_FEE_DROPS = 12;
const DROPS_PER_XRP = 1000000;

/**
 * Calculate available XRP balance accounting for reserves and fees
 * @param accountInfo - XRPL account info response
 * @param feeDrops - Transaction fee in drops (default: 12)
 * @returns Balance breakdown with total, reserved, available, and available minus fees
 */
export function calculateAvailableBalance(
  accountInfo: AccountInfoResponse | { account_not_found: string } | null | undefined,
  feeDrops: number = STANDARD_FEE_DROPS
): BalanceInfo {
  const defaultBalance: BalanceInfo = {
    totalBalance: 0,
    reserved: BASE_RESERVE_XRP,
    available: 0,
    availableMinusFees: 0
  };

  if (!accountInfo || 'account_not_found' in accountInfo || !('account_data' in accountInfo)) {
    return defaultBalance;
  }

  const { account_data } = accountInfo;
  
  if (!account_data?.Balance) {
    return defaultBalance;
  }

  // Parse total balance
  const totalBalanceDrops = parseInt(account_data.Balance);
  const totalBalance = totalBalanceDrops / DROPS_PER_XRP;

  // Calculate reserve (1 XRP base + 0.2 XRP per owned object)
  const ownerCount = account_data.OwnerCount || 0;
  const reserved = BASE_RESERVE_XRP + (ownerCount * OWNER_RESERVE_XRP);

  // Calculate available (total - reserve, clamped to 0)
  const available = Math.max(0, totalBalance - reserved);

  // Calculate available minus transaction fee
  const feeXRP = feeDrops / DROPS_PER_XRP;
  const availableMinusFees = Math.max(0, available - feeXRP);

  return {
    totalBalance,
    reserved,
    available,
    availableMinusFees
  };
}

/**
 * Get token balance from trustline
 * @param accountLines - Account lines response
 * @param currency - Currency code
 * @param issuer - Issuer address
 * @returns Token balance as a number
 */
export function getTokenBalance(
  accountLines: any,
  currency: string,
  issuer: string
): number {
  if (!accountLines?.lines) {
    return 0;
  }

  const trustline = accountLines.lines.find(
    (line: any) => line.currency === currency && line.account === issuer
  );

  if (!trustline) {
    return 0;
  }

  return Math.max(0, parseFloat(trustline.balance || '0'));
}
