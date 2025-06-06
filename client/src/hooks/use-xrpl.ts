import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { xrplClient } from '@/lib/xrpl-client';

export function useXRPL() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectToXRPL = async () => {
      try {
        await xrplClient.connect();
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to XRPL');
        setIsConnected(false);
      }
    };

    connectToXRPL();

    return () => {
      xrplClient.disconnect().catch(console.error);
    };
  }, []);

  return {
    isConnected,
    error,
    client: xrplClient
  };
}

export function useAccountInfo(address: string | null) {
  return useQuery({
    queryKey: ['accountInfo', address],
    queryFn: async () => {
      if (!address) return null;
      return await xrplClient.getAccountInfo(address);
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAccountTransactions(address: string | null, limit = 20) {
  return useQuery({
    queryKey: ['accountTransactions', address, limit],
    queryFn: async () => {
      if (!address) return null;
      return await xrplClient.getAccountTransactions(address, limit);
    },
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useAccountLines(address: string | null) {
  return useQuery({
    queryKey: ['accountLines', address],
    queryFn: async () => {
      if (!address) return null;
      return await xrplClient.getAccountLines(address);
    },
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
  });
}
