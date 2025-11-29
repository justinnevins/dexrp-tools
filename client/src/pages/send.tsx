import { SendTransactionForm } from '@/components/send-transaction-form';
import { ArrowLeft, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useWallet } from '@/hooks/use-wallet';

export default function Send() {
  const [, setLocation] = useLocation();
  const { currentWallet } = useWallet();
  const isWatchOnly = currentWallet?.walletType === 'watchOnly';

  return (
    <div className="px-4 py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Send XRP</h1>
      </div>

      {isWatchOnly ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Watch-Only Account</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            This is a watch-only account. To send XRP, you need to connect a Keystone 3 Pro hardware wallet with signing capabilities.
          </p>
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg max-w-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 text-left">
              Watch-only accounts can only view balances and transaction history. Add a Keystone 3 Pro account to enable sending.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setLocation('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      ) : (
        <SendTransactionForm 
          onSuccess={() => {
            setLocation('/');
          }}
        />
      )}
    </div>
  );
}