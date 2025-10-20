import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { browserStorage } from '@/lib/browser-storage';
import type { Wallet, Transaction, Trustline, Escrow } from '@shared/schema';

export function useWallet() {
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const queryClient = useQueryClient();

  const walletsQuery = useQuery<Wallet[]>({
    queryKey: ['browser-wallets'],
    queryFn: () => {
      const wallets = browserStorage.getAllWallets();
      console.log('Loaded wallets from storage:', wallets.map(w => ({ id: w.id, address: w.address })));
      return Promise.resolve(wallets);
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (walletsQuery.data && walletsQuery.data.length > 0 && !currentWallet) {
      console.log('Setting current wallet to:', walletsQuery.data[0].address);
      setCurrentWallet(walletsQuery.data[0]);
    } else if (currentWallet) {
      console.log('Current wallet is:', currentWallet.address);
    }
  }, [walletsQuery.data, currentWallet]);

  const createWallet = useMutation({
    mutationFn: async (walletData: { address: string; hardwareWalletType?: string; publicKey?: string }) => {
      const wallet = browserStorage.createWallet({
        address: walletData.address,
        publicKey: walletData.publicKey,
        hardwareWalletType: walletData.hardwareWalletType,
        balance: '0',
        reservedBalance: '20',
        isConnected: false
      });
      return wallet;
    },
    onSuccess: (newWallet) => {
      // Automatically switch to the newly added wallet
      setCurrentWallet(newWallet);
      queryClient.invalidateQueries({ queryKey: ['browser-wallets'] });
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

  return {
    currentWallet,
    setCurrentWallet,
    wallets: walletsQuery,
    createWallet,
    updateWalletBalance,
  };
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

export function useEscrows(walletId: number | null) {
  return useQuery<Escrow[]>({
    queryKey: ['browser-escrows', walletId],
    queryFn: () => Promise.resolve(walletId ? browserStorage.getEscrowsByWallet(walletId) : []),
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

export function useCreateEscrow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (escrowData: {
      walletId: number;
      amount: string;
      recipient: string;
      releaseDate: string;
    }) => {
      const escrow = browserStorage.createEscrow({
        ...escrowData,
        releaseDate: new Date(escrowData.releaseDate)
      });
      return escrow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['browser-escrows', variables.walletId] });
    },
  });
}
