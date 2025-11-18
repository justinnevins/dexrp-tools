import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browserStorage } from '@/lib/browser-storage';
import type { Wallet, Transaction, Trustline } from '@shared/schema';

interface WalletContextType {
  currentWallet: Wallet | null;
  setCurrentWallet: (wallet: Wallet) => void;
  wallets: {
    data: Wallet[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  createWallet: {
    mutateAsync: (data: { address: string; hardwareWalletType?: string; publicKey?: string; network?: 'mainnet' | 'testnet'; name?: string }) => Promise<Wallet>;
    isPending: boolean;
  };
  updateWallet: {
    mutateAsync: (data: { id: number; updates: Partial<Wallet> }) => Promise<Wallet | null>;
    isPending: boolean;
  };
  updateWalletBalance: {
    mutateAsync: (data: { id: number; balance: string; reservedBalance: string }) => Promise<Wallet | null>;
    isPending: boolean;
  };
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [currentWallet, setCurrentWalletState] = useState<Wallet | null>(() => {
    const stored = localStorage.getItem('xrpl_current_wallet_id');
    if (stored) {
      const walletId = parseInt(stored, 10);
      return browserStorage.getWallet(walletId) || null;
    }
    return null;
  });

  const queryClient = useQueryClient();

  const walletsQuery = useQuery<Wallet[]>({
    queryKey: ['browser-wallets'],
    queryFn: () => Promise.resolve(browserStorage.getAllWallets()),
    staleTime: 0,
  });

  useEffect(() => {
    if (walletsQuery.data && walletsQuery.data.length > 0 && !currentWallet) {
      const wallet = walletsQuery.data[0];
      setCurrentWalletState(wallet);
      localStorage.setItem('xrpl_current_wallet_id', wallet.id.toString());
    }
  }, [walletsQuery.data, currentWallet]);

  const setCurrentWallet = (wallet: Wallet) => {
    setCurrentWalletState(wallet);
    localStorage.setItem('xrpl_current_wallet_id', wallet.id.toString());
    
    // Immediately invalidate and refetch account data for the new wallet
    queryClient.invalidateQueries({ queryKey: ['accountInfo'] });
    queryClient.invalidateQueries({ queryKey: ['accountTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['accountLines'] });
  };

  const createWallet = useMutation({
    mutationFn: async (walletData: { address: string; hardwareWalletType?: string; publicKey?: string; network?: 'mainnet' | 'testnet'; name?: string }) => {
      const wallet = browserStorage.createWallet({
        address: walletData.address,
        publicKey: walletData.publicKey,
        hardwareWalletType: walletData.hardwareWalletType,
        network: walletData.network,
        name: walletData.name,
        balance: '0',
        reservedBalance: '20',
        isConnected: false
      });
      return wallet;
    },
    onSuccess: (newWallet) => {
      setCurrentWallet(newWallet);
      queryClient.invalidateQueries({ queryKey: ['browser-wallets'] });
    },
  });

  const updateWallet = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Wallet> }) => {
      const wallet = browserStorage.updateWallet(id, updates);
      return wallet;
    },
    onSuccess: (updatedWallet) => {
      queryClient.invalidateQueries({ queryKey: ['browser-wallets'] });
      // If network was changed, invalidate all XRPL data queries
      if (updatedWallet && currentWallet?.id === updatedWallet.id) {
        setCurrentWalletState(updatedWallet);
        queryClient.invalidateQueries({ queryKey: ['accountInfo'] });
        queryClient.invalidateQueries({ queryKey: ['accountTransactions'] });
        queryClient.invalidateQueries({ queryKey: ['accountLines'] });
        queryClient.invalidateQueries({ queryKey: ['accountOffers'] });
      }
    },
  });

  const updateWalletBalance = useMutation({
    mutationFn: async ({ id, balance, reservedBalance }: { id: number; balance: string; reservedBalance: string }) => {
      const wallet = browserStorage.updateWallet(id, { balance, reservedBalance });
      return wallet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-wallets'] });
    },
  });

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        setCurrentWallet,
        wallets: {
          data: walletsQuery.data,
          isLoading: walletsQuery.isLoading,
          error: walletsQuery.error,
        },
        createWallet: {
          mutateAsync: createWallet.mutateAsync,
          isPending: createWallet.isPending,
        },
        updateWallet: {
          mutateAsync: updateWallet.mutateAsync,
          isPending: updateWallet.isPending,
        },
        updateWalletBalance: {
          mutateAsync: updateWalletBalance.mutateAsync,
          isPending: updateWalletBalance.isPending,
        },
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

export function useTransactions(walletId: number | null) {
  return useQuery<Transaction[]>({
    queryKey: ['browser-transactions', walletId],
    queryFn: () => Promise.resolve(walletId ? browserStorage.getTransactionsByWallet(walletId) : []),
    enabled: !!walletId,
    staleTime: 0,
  });
}

export function useTrustlines(walletId: number | null) {
  return useQuery<Trustline[]>({
    queryKey: ['browser-trustlines', walletId],
    queryFn: () => Promise.resolve(walletId ? browserStorage.getTrustlinesByWallet(walletId) : []),
    enabled: !!walletId,
    staleTime: 0,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactionData: {
      walletId: number;
      type: string;
      amount: string;
      currency?: string;
      fromAddress?: string;
      toAddress?: string;
      destinationTag?: string;
    }) => {
      const transaction = browserStorage.createTransaction(transactionData);
      return transaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['browser-transactions', variables.walletId] });
    },
  });
}

export function useCreateTrustline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trustlineData: {
      walletId: number;
      currency: string;
      issuer: string;
      issuerName: string;
      limit: string;
    }) => {
      const trustline = browserStorage.createTrustline(trustlineData);
      return trustline;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['browser-trustlines', variables.walletId] });
    },
  });
}
