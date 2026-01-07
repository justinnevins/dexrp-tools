export type SubscriptionTier = 'guest' | 'free_account' | 'premium';
export type SubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  renewalAt: string | null;
  syncOptIn: boolean;
}

export interface WalletLimits {
  maxSigningWallets: number;
  maxWatchOnlyWallets: number;
  canAddSigningWallet: boolean;
  canAddWatchOnlyWallet: boolean;
  currentSigningWallets: number;
  currentWatchOnlyWallets: number;
}

const UNLIMITED = 999999;

export function useSubscription() {
  return {
    tier: 'premium' as SubscriptionTier,
    status: 'active' as SubscriptionStatus,
    isPremium: true,
    isTrialing: false,
    trialEndsAt: null,
    renewalAt: null,
    syncOptIn: false,
    isLoading: false,
    isAuthenticated: false,
    subscription: {
      tier: 'premium' as SubscriptionTier,
      status: 'active' as SubscriptionStatus,
      trialEnd: null,
      renewalAt: null,
      syncOptIn: false,
    },
  };
}

export function useWalletLimits(currentSigningWallets: number, currentWatchOnlyWallets: number): WalletLimits {
  return {
    maxSigningWallets: UNLIMITED,
    maxWatchOnlyWallets: UNLIMITED,
    canAddSigningWallet: true,
    canAddWatchOnlyWallet: true,
    currentSigningWallets,
    currentWatchOnlyWallets,
  };
}

export function getWalletLimitsForTier(_tier: SubscriptionTier, _isPremium: boolean) {
  return { maxSigning: UNLIMITED, maxWatchOnly: UNLIMITED };
}

export interface WalletOverageInfo {
  isOverLimit: boolean;
  signingOverage: number;
  watchOnlyOverage: number;
  totalSigningWallets: number;
  totalWatchOnlyWallets: number;
  allowedSigning: number;
  allowedWatchOnly: number;
}

export function computeWalletOverage(
  signingCount: number,
  watchOnlyCount: number,
  _tier: SubscriptionTier,
  _isPremium: boolean
): WalletOverageInfo {
  return {
    isOverLimit: false,
    signingOverage: 0,
    watchOnlyOverage: 0,
    totalSigningWallets: signingCount,
    totalWatchOnlyWallets: watchOnlyCount,
    allowedSigning: UNLIMITED,
    allowedWatchOnly: UNLIMITED,
  };
}
