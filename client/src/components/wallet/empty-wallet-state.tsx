import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Plus } from 'lucide-react';
import { KeystoneAccountScanner } from '@/components/keystone-account-scanner';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { useWallet } from '@/hooks/use-wallet';

export function EmptyWalletState() {
  const [showScanner, setShowScanner] = useState(false);
  const { connect } = useHardwareWallet();
  const { createWallet } = useWallet();

  const handleAccountScan = async (address: string, publicKey: string) => {
    try {
      await connect('Keystone 3 Pro');
      
      await createWallet.mutateAsync({
        address,
        publicKey,
        hardwareWalletType: 'Keystone 3 Pro',
      });
      
      setShowScanner(false);
    } catch (error: any) {
      console.error('Connection failed:', error);
      alert(`Connection failed: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            No Accounts Added
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Add your Keystone 3 Pro XRPL account to view real-time balance, transactions, and trustlines.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Secure hardware wallet integration</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Real-time XRPL network data</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Transaction signing & management</span>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowScanner(true)}
            className="w-full"
            data-testid="add-account-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Keystone 3 Pro Account
          </Button>
        </CardContent>
      </Card>
      
      {showScanner && (
        <KeystoneAccountScanner
          onScan={handleAccountScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}