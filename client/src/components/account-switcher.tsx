import { Check, ChevronDown, Wallet } from 'lucide-react';
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

export function AccountSwitcher() {
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
          className="flex items-center gap-2 h-auto py-2 px-3 border-border"
          data-testid="account-switcher-trigger"
        >
          <Wallet className="w-4 h-4 text-muted-foreground" />
          {currentWallet ? (
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {currentWallet.name || formatAddress(currentWallet.address)}
                </span>
                <span 
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
                    getNetworkBadgeColor(currentWallet.network)
                  )}
                >
                  {currentWallet.network === 'testnet' ? 'Test' : 'Main'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatAddress(currentWallet.address)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium">Select Account</span>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
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
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Wallet className="w-4 h-4 text-primary" />
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
