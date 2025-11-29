import { Check, ChevronDown, Wallet, Plus, Eye } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AccountSwitcherProps {
  onAddAccount?: () => void;
}

export function AccountSwitcher({ onAddAccount }: AccountSwitcherProps = {}) {
  const { currentWallet, wallets, setCurrentWallet } = useWallet();

  const availableWallets = wallets.data || [];

  // Don't render if there are no wallets at all
  if (availableWallets.length === 0) {
    return null;
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getNetworkBadgeColor = (network: 'mainnet' | 'testnet') => {
    return network === 'testnet' 
      ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
      : 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 h-auto py-2 px-3 border-border w-full max-w-full"
          data-testid="account-switcher-trigger"
        >
          {currentWallet?.walletType === 'watchOnly' ? (
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          ) : (
            <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          {currentWallet ? (
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 max-w-full">
                <span className="text-sm font-medium truncate">
                  {currentWallet.name || formatAddress(currentWallet.address)}
                </span>
                <span 
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0",
                    getNetworkBadgeColor(currentWallet.network)
                  )}
                >
                  {currentWallet.network === 'testnet' ? 'Test' : 'Main'}
                </span>
                {currentWallet.walletType === 'watchOnly' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    Watch
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-full">
                {formatAddress(currentWallet.address)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium">Select Account</span>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-1 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {onAddAccount && (
          <>
            <DropdownMenuItem
              onClick={onAddAccount}
              className="flex items-center gap-2 cursor-pointer text-primary"
              data-testid="add-account-from-switcher"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableWallets.map((wallet) => {
          const isActive = currentWallet ? wallet.id === currentWallet.id : false;
          return (
            <DropdownMenuItem
              key={wallet.id}
              onClick={() => !isActive && setCurrentWallet(wallet)}
              className={cn(
                "flex items-center gap-3 cursor-pointer py-3",
                isActive && "bg-accent"
              )}
              data-testid={`account-option-${wallet.id}`}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full",
                wallet.walletType === 'watchOnly' ? 'bg-amber-500/10' : 'bg-primary/10'
              )}>
                {wallet.walletType === 'watchOnly' ? (
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Wallet className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {wallet.name || formatAddress(wallet.address)}
                  </span>
                  <span 
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
                      getNetworkBadgeColor(wallet.network)
                    )}
                  >
                    {wallet.network === 'testnet' ? 'Test' : 'Main'}
                  </span>
                  {wallet.walletType === 'watchOnly' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      Watch
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatAddress(wallet.address)}
                </span>
              </div>
              {isActive && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
