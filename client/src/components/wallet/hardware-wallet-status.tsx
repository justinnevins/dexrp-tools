import { Shield } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';

export function HardwareWalletStatus() {
  const { currentWallet } = useWallet();
  
  const hardwareWalletType = currentWallet?.hardwareWalletType || 'Keystone Pro 3';
  const isConnected = currentWallet?.isConnected || true;

  return (
    <section className="px-4 py-4 border-b border-border">
      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">Hardware Wallet</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {isConnected ? `${hardwareWalletType} Connected` : 'Not Connected'}
            </p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      </div>
    </section>
  );
}
