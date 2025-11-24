import { useQuery } from '@tanstack/react-query';
import { fetchXRPToRLUSDPrice, DEXPriceData } from '@/lib/xrp-price';
import { useWallet } from './use-wallet';

export function useXRPPrice() {
  const { currentWallet } = useWallet();
  const network = currentWallet?.network ?? 'mainnet';

  return useQuery<DEXPriceData | null>({
    queryKey: ['xrp-price-dex', network],
    queryFn: async () => {
      try {
        const priceData = await fetchXRPToRLUSDPrice(network);
        return priceData;
      } catch (error) {
        console.warn('Failed to fetch XRP price from DEX:', error);
        return null;
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time DEX pricing
    staleTime: 2000, // Consider data stale after 2 seconds
  });
}