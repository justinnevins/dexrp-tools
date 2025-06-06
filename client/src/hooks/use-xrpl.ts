import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { xrplClient, type XRPLNetwork } from '@/lib/xrpl-client';

export function useXRPL() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<XRPLNetwork>('mainnet');
  const queryClient = useQueryClient();

  useEffect(() => {
    const connectToXRPL = async () => {
      try {
        await xrplClient.connect();
        setIsConnected(true);
        setCurrentNetwork(xrplClient.getCurrentNetwork());
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

  const switchNetwork = (network: XRPLNetwork) => {
    if (network === currentNetwork) return;
    
    // Store network preference and reload immediately
    localStorage.setItem('xrpl_target_network', network);
    window.location.reload();
  };

  return {
    isConnected,
    error,
    currentNetwork,
    switchNetwork,
    client: xrplClient
  };
}

export function useAccountInfo(address: string | null) {
  const currentNetwork = xrplClient.getCurrentNetwork();
  return useQuery({
    queryKey: ['accountInfo', address, currentNetwork],
    queryFn: async () => {
      if (!address) return null;
      try {
        return await xrplClient.getAccountInfo(address);
      } catch (error: any) {
        // Handle account not found error for new addresses
        if (error.data?.error === 'actNotFound') {
          return { 
            account_not_found: true,
            address,
            error: 'Account not activated on XRPL network'
          };
        }
        throw error;
      }
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
