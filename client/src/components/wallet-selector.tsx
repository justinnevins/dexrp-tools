import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '@/hooks/use-wallet';
import type { Wallet } from '@shared/schema';

interface WalletSelectorProps {
  onAddAccount: () => void;
}

export function WalletSelector({ onAddAccount }: WalletSelectorProps) {
  const { currentWallet, wallets, setCurrentWallet } = useWallet();

  const handleSelectWallet = (wallet: Wallet) => {
    setCurrentWallet(wallet);
  };

  const getWalletName = (wallet: Wallet, index: number) => {
    return wallet.name || `Account ${index + 1}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-3 py-2 h-auto text-white hover:bg-white/10"
          data-testid="wallet-selector-trigger"
        >
          <div className="flex flex-col items-start">
            <span className="text-xs opacity-75">Current Account</span>
            <span className="text-sm font-medium">
              {currentWallet?.name || (wallets.data && wallets.data.length > 0 ? getWalletName(wallets.data[0], 0) : 'No Wallet')}
            </span>
            <span className="text-xs opacity-60">
              {currentWallet ? formatAddress(currentWallet.address) : ''}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-75" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your Accounts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {wallets.data && wallets.data.length > 0 ? (
          wallets.data.map((wallet, index) => (
            <DropdownMenuItem
              key={wallet.id}
              onClick={() => handleSelectWallet(wallet)}
              className="flex items-center justify-between cursor-pointer"
              data-testid={`wallet-option-${wallet.id}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{getWalletName(wallet, index)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatAddress(wallet.address)}
                </span>
              </div>
              {currentWallet?.id === wallet.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No accounts yet</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onAddAccount}
          className="flex items-center gap-2 cursor-pointer text-primary"
          data-testid="add-account-button"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
