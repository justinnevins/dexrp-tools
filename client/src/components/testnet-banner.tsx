import { AlertTriangle } from 'lucide-react';
import { useNetwork } from '@/contexts/network-context';

export function TestnetBanner() {
  const { currentNetwork } = useNetwork();

  if (currentNetwork !== 'testnet') {
    return null;
  }

  return (
    <div 
      className="bg-orange-500 dark:bg-orange-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
      data-testid="testnet-banner"
    >
      <AlertTriangle className="w-4 h-4" />
      <span>Connected to XRPL Testnet</span>
    </div>
  );
}
