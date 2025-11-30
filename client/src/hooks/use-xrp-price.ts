import { useQuery } from '@tanstack/react-query';
import { fetchXRPToRLUSDPrice, DEXPriceData } from '@/lib/xrp-price';

export function useXRPPrice(network: 'mainnet' | 'testnet' = 'mainnet') {
  return useQuery<DEXPriceData | null>({
    queryKey: ['xrp-price-dex', network],
    queryFn: async () => {
      try {
        const priceData = await fetchXRPToRLUSDPrice(network);
        return priceData;
      } catch {
        return null;
      }
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });
}