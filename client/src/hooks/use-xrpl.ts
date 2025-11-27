import { useQuery } from '@tanstack/react-query';
import { xrplClient, type XRPLNetwork } from '@/lib/xrpl-client';

export function useXRPL() {
  return {
    client: xrplClient
  };
}

export function useAccountInfo(address: string | null, network: XRPLNetwork) {
  return useQuery({
    queryKey: ['accountInfo', address, network],
    queryFn: async () => {
      if (!address) return null;
      try {
        return await xrplClient.getAccountInfo(address, network);
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

export function useAccountTransactions(address: string | null, network: XRPLNetwork, limit = 20) {
  return useQuery({
    queryKey: ['accountTransactions', address, network, limit],
    queryFn: async () => {
      if (!address) return null;
      try {
        return await xrplClient.getAccountTransactions(address, network, limit);
      } catch (error: any) {
        console.error('Error fetching transactions:', error);
        // Return empty result instead of throwing to prevent UI errors
        return { transactions: [] };
      }
    },
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });
}

export function useAccountLines(address: string | null, network: XRPLNetwork) {
  return useQuery({
    queryKey: ['accountLines', address, network],
    queryFn: async () => {
      if (!address) return null;
      try {
        return await xrplClient.getAccountLines(address, network);
      } catch (error: any) {
        console.error('Error fetching account lines:', error);
        // Return empty result instead of throwing to prevent UI errors
        return { lines: [] };
      }
    },
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });
}

export function useAccountOffers(address: string | null, network: XRPLNetwork) {
  return useQuery({
    queryKey: ['accountOffers', address, network],
    queryFn: async () => {
      if (!address) return null;
      try {
        return await xrplClient.getAccountOffers(address, network);
      } catch (error: any) {
        console.error('Error fetching account offers:', error);
        // Return empty result instead of throwing to prevent UI errors
        return { offers: [] };
      }
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
}

export function useServerInfo(network: XRPLNetwork) {
  return useQuery({
    queryKey: ['serverInfo', network],
    queryFn: async () => {
      return await xrplClient.getServerInfo(network);
    },
    refetchInterval: 300000, // Refetch every 5 minutes (reserves don't change often)
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}
