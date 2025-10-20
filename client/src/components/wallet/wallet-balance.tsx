import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useAccountInfo } from '@/hooks/use-xrpl';
import { useXRPPrice } from '@/hooks/use-xrp-price';
import { xrplClient } from '@/lib/xrpl-client';
import { useLocation } from 'wouter';

interface WalletBalanceProps {
  onSendClick: () => void;
  onReceiveClick: () => void;
}

export function WalletBalance({ onSendClick, onReceiveClick }: WalletBalanceProps) {
  const { currentWallet } = useWallet();
  const { data: accountInfo, isLoading } = useAccountInfo(currentWallet?.address || null);
  const { data: xrpPrice, isLoading: priceLoading } = useXRPPrice();
  const [, setLocation] = useLocation();

  // Handle account not found on XRPL network (new/unactivated addresses)
  if (accountInfo && 'account_not_found' in accountInfo) {
    return (
      <section className="px-4 py-6 xrpl-gradient text-white">
        <div className="text-center mb-6">
          <h1 className="text-sm font-medium text-white/80 mb-1">
            Hardware Wallet Connected
          </h1>
          <div className="mb-2">
            <span className="text-3xl font-bold">0.000000</span>
            <span className="text-lg ml-1">XRP</span>
          </div>
          <p className="text-xs text-white/70">
            Account not activated on XRPL network
          </p>
          <p className="text-xs text-white/60 mt-1">
            Receive at least 1 XRP to activate this address
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            disabled
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            Send
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={onReceiveClick}
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Receive
          </Button>
        </div>
      </section>
    );
  }

  const balance = (accountInfo && 'account_data' in accountInfo && accountInfo.account_data?.Balance)
    ? xrplClient.formatXRPAmount(accountInfo.account_data.Balance)
    : '0.000000';
    
  // Current XRPL reserve: 1 XRP base + 0.2 XRP per owned object
  const reservedBalance = (accountInfo && 'account_data' in accountInfo && accountInfo.account_data?.OwnerCount)
    ? ((accountInfo.account_data.OwnerCount * 0.2) + 1).toFixed(6)
    : '1.000000';

  const availableBalance = (parseFloat(balance) - parseFloat(reservedBalance)).toFixed(6);
  const usdValue = xrpPrice ? (parseFloat(balance) * xrpPrice).toFixed(2) : '0.00';

  if (isLoading) {
    return (
      <section className="px-4 py-6 xrpl-gradient text-white">
        <div className="text-center mb-6 animate-pulse">
          <div className="h-4 bg-white/20 rounded w-24 mx-auto mb-2"></div>
          <div className="h-8 bg-white/20 rounded w-32 mx-auto mb-1"></div>
          <div className="h-4 bg-white/20 rounded w-20 mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6 xrpl-gradient text-white">
      <div className="text-center mb-6">
        <p className="text-sm opacity-90 mb-2">Total Balance</p>
        <h2 className="text-3xl font-bold mb-1">{balance} XRP</h2>
        <p className="text-sm opacity-75">≈ ${usdValue} USD</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
          <p className="text-xs opacity-75 mb-1">Available</p>
          <p className="font-semibold">{availableBalance} XRP</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
          <p className="text-xs opacity-75 mb-1">Reserved</p>
          <p className="font-semibold">{reservedBalance} XRP</p>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={() => setLocation('/send')}
          className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 rounded-xl py-3 px-4 touch-target"
          variant="ghost"
          disabled={parseFloat(availableBalance) <= 0}
        >
          <ArrowUp className="w-4 h-4 mr-2" />
          Send
        </Button>
        <Button
          onClick={onReceiveClick}
          className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 rounded-xl py-3 px-4 touch-target"
          variant="ghost"
        >
          <ArrowDown className="w-4 h-4 mr-2" />
          Receive
        </Button>
      </div>
    </section>
  );
}
