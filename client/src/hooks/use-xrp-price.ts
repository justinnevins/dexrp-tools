import { useQuery } from '@tanstack/react-query';

interface XRPPriceResponse {
  USD: number;
}

export function useXRPPrice() {
  return useQuery<number>({
    queryKey: ['xrp-price'],
    queryFn: async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
        if (!response.ok) {
          throw new Error('Failed to fetch XRP price');
        }
        const data = await response.json();
        return data.ripple?.usd || 0.5; // Fallback to $0.50 if API fails
      } catch (error) {
        console.warn('Failed to fetch XRP price:', error);
        return 0.5; // Fallback rate
      }
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}