import { Shield, LogOut, Wallet, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useXRPL, useAccountInfo } from '@/hooks/use-xrpl';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { NetworkSettings } from '@/components/network-settings';
import { useState, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { browserStorage } from '@/lib/browser-storage';

export default function Profile() {
  const { currentWallet, wallets, setCurrentWallet } = useWallet();
  const { isConnected, currentNetwork, switchNetwork } = useXRPL();
  const { disconnect: disconnectHardwareWallet } = useHardwareWallet();
  const { toast } = useToast();
  // Fetch real balance from XRPL
  const { data: accountInfo, isLoading: loadingAccountInfo } = useAccountInfo(currentWallet?.address || null);



  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const getDisplayBalance = () => {
    if (loadingAccountInfo) return "Loading...";
    if (!accountInfo) return "0";
    
    // Check if account is not found (not activated)
    if ('account_not_found' in accountInfo) {
      return "0 (Not activated)";
    }
    
    // Get balance from XRPL account data
    if ('account_data' in accountInfo && accountInfo.account_data?.Balance) {
      const balanceInDrops = accountInfo.account_data.Balance;
      const balanceInXRP = parseInt(balanceInDrops) / 1000000; // Convert drops to XRP
      return balanceInXRP.toFixed(6).replace(/\.?0+$/, ''); // Remove trailing zeros
    }
    
    return "0";
  };

  const handleRemoveWallet = (walletId: number) => {
    if (!currentWallet) return;
    
    const allWallets = wallets.data || [];
    if (allWallets.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "You must have at least one wallet. Use 'Disconnect All' to remove everything.",
        variant: "destructive",
      });
      return;
    }
    
    // Remove the wallet
    browserStorage.deleteWallet(walletId);
    
    // If removing the current wallet, switch to another one
    if (currentWallet.id === walletId) {
      const remainingWallets = allWallets.filter(w => w.id !== walletId);
      if (remainingWallets.length > 0) {
        setCurrentWallet(remainingWallets[0]);
      }
    }
    
    // Invalidate queries to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['browser-wallets'] });
    
    toast({
      title: "Wallet Removed",
      description: "The wallet has been removed from your account list.",
    });
  };

  const handleDisconnectWallet = async () => {
    try {
      // Disconnect hardware wallet first
      await disconnectHardwareWallet();
      
      // Clear server-side data
      await fetch('/api/wallets', { method: 'DELETE' });
      
      // Clear all local storage data
      localStorage.clear();
      
      // Set network back to mainnet as default
      localStorage.setItem('xrpl_target_network', 'mainnet');
      
      // Clear all query cache
      queryClient.clear();
      
      // Invalidate all queries to force refetch
      await queryClient.invalidateQueries();
      
      // Show confirmation toast
      toast({
        title: "Wallet Disconnected",
        description: "All data cleared, reloading application...",
      });
      
      // Force immediate page reload
      window.location.href = '/';
    } catch (error) {
      console.error('Error clearing server data:', error);
      // Still proceed with local cleanup
      localStorage.clear();
      localStorage.setItem('xrpl_target_network', 'mainnet');
      queryClient.clear();
      window.location.href = '/';
    }
  };





  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Profile & Settings</h1>

      {/* Connected Wallets */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Connected Wallets</h2>
        <div className="space-y-3">
          {wallets.data && wallets.data.length > 0 ? (
            wallets.data.map((wallet, index) => (
              <div
                key={wallet.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  currentWallet?.id === wallet.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/30'
                }`}
                data-testid={`wallet-item-${wallet.id}`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{wallet.name || `Account ${index + 1}`}</h3>
                      {currentWallet?.id === wallet.id && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatAddress(wallet.address)}
                    </p>
                    {wallet.hardwareWalletType && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                        <Shield className="w-3 h-3" />
                        {wallet.hardwareWalletType}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentWallet?.id !== wallet.id && (
                    <Button
                      onClick={() => setCurrentWallet(wallet)}
                      variant="outline"
                      size="sm"
                      data-testid={`switch-wallet-${wallet.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Switch
                    </Button>
                  )}
                  <Button
                    onClick={() => handleRemoveWallet(wallet.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid={`remove-wallet-${wallet.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No wallets connected</p>
          )}
        </div>
      </div>

      {/* Network Status */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Network Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Network</p>
            <p className="font-semibold flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected ? currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1) : 'Disconnected'}
            </p>
          </div>
        </div>
      </div>





      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <h3 className="font-semibold text-red-800 dark:text-red-200 mb-4">Danger Zone</h3>
        
        <Button
          onClick={handleDisconnectWallet}
          variant="outline"
          className="w-full border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 touch-target"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect Wallet
        </Button>
      </div>

      {/* Network Settings Section */}
      <div className="space-y-4">
        <NetworkSettings
          currentNetwork={currentNetwork}
          onNetworkChange={switchNetwork}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
