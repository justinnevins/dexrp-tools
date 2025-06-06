import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Wallet, Transaction, Trustline, Escrow } from '@shared/schema';

export function useWallet() {
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const queryClient = useQueryClient();

  const walletsQuery = useQuery<Wallet[]>({
    queryKey: ['/api/wallets'],
  });

  useEffect(() => {
    if (walletsQuery.data && walletsQuery.data.length > 0 && !currentWallet) {
      setCurrentWallet(walletsQuery.data[0]);
    }
  }, [walletsQuery.data, currentWallet]);

  const createWallet = useMutation({
    mutationFn: async (walletData: { address: string; hardwareWalletType?: string }) => {
      const response = await apiRequest('POST', '/api/wallets', walletData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
    },
  });

  const updateWalletBalance = useMutation({
    mutationFn: async ({ id, balance, reservedBalance }: { id: number; balance: string; reservedBalance: string }) => {
      const response = await apiRequest('PATCH', `/api/wallets/${id}`, { balance, reservedBalance });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
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
    queryKey: ['/api/transactions', walletId],
    enabled: !!walletId,
  });
}

export function useTrustlines(walletId: number | null) {
  return useQuery<Trustline[]>({
    queryKey: ['/api/trustlines', walletId],
    enabled: !!walletId,
  });
}

export function useEscrows(walletId: number | null) {
  return useQuery<Escrow[]>({
    queryKey: ['/api/escrows', walletId],
    enabled: !!walletId,
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
      const response = await apiRequest('POST', '/api/transactions', transactionData);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', variables.walletId] });
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
      const response = await apiRequest('POST', '/api/trustlines', trustlineData);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trustlines', variables.walletId] });
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
      const response = await apiRequest('POST', '/api/escrows', escrowData);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/escrows', variables.walletId] });
    },
  });
}
