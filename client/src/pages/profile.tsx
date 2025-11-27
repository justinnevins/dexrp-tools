import { Shield, LogOut, Wallet, Check, Trash2, Edit2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/use-wallet';
import { useAccountInfo } from '@/hooks/use-xrpl';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { useState, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { browserStorage } from '@/lib/browser-storage';
import { xrplClient } from '@/lib/xrpl-client';
import type { Wallet as WalletType } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Profile() {
  const { currentWallet, wallets, setCurrentWallet, updateWallet } = useWallet();
  const network = currentWallet?.network ?? 'mainnet';
  const { disconnect: disconnectHardwareWallet } = useHardwareWallet();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [editName, setEditName] = useState('');
  const [editNetwork, setEditNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [customMainnetNode, setCustomMainnetNode] = useState('');
  const [customTestnetNode, setCustomTestnetNode] = useState('');
  const [fullHistoryMainnetNode, setFullHistoryMainnetNode] = useState('');
  const [fullHistoryTestnetNode, setFullHistoryTestnetNode] = useState('');
  // Fetch real balance from XRPL
  const { data: accountInfo, isLoading: loadingAccountInfo } = useAccountInfo(currentWallet?.address || null, network);

  // Load custom node settings on mount
  useEffect(() => {
    const settings = browserStorage.getSettings();
    setCustomMainnetNode(settings.customMainnetNode || '');
    setCustomTestnetNode(settings.customTestnetNode || '');
    setFullHistoryMainnetNode(settings.fullHistoryMainnetNode || '');
    setFullHistoryTestnetNode(settings.fullHistoryTestnetNode || '');
  }, []);



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

  const handleRemoveAccount = async (walletId: number) => {
    if (!currentWallet) return;
    
    const allWallets = wallets.data || [];
    
    // Remove the account
    browserStorage.deleteWallet(walletId);
    
    // If this was the last account, redirect to setup
    if (allWallets.length === 1) {
      localStorage.clear();
      localStorage.setItem('xrpl_target_network', 'mainnet');
      queryClient.clear();
      window.location.href = '/';
      return;
    }
    
    // If removing the current account, switch to another one
    if (currentWallet.id === walletId) {
      const remainingWallets = allWallets.filter(w => w.id !== walletId);
      if (remainingWallets.length > 0) {
        setCurrentWallet(remainingWallets[0]);
      }
    }
    
    // Clear mutation cache and invalidate queries to fully refresh
    queryClient.resetQueries({ queryKey: ['browser-wallets'] });
    await queryClient.invalidateQueries({ queryKey: ['browser-wallets'] });
    
    toast({
      title: "Account Removed",
      description: "The account has been removed from your list.",
    });
  };

  const handleEditWallet = (wallet: WalletType) => {
    setEditingWallet(wallet);
    setEditName(wallet.name || '');
    setEditNetwork(wallet.network);
    setEditDialogOpen(true);
  };

  const handleSaveWalletEdit = async () => {
    if (!editingWallet) return;
    
    try {
      await updateWallet.mutateAsync({
        id: editingWallet.id,
        updates: {
          name: editName || undefined,
          network: editNetwork,
        },
      });
      
      toast({
        title: "Account Updated",
        description: "Account settings have been updated successfully",
      });
      
      setEditDialogOpen(false);
      setEditingWallet(null);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update account",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAllAccounts = async () => {
    try {
      // Disconnect hardware wallet first
      await disconnectHardwareWallet();
      
      // Clear server-side data
      const { apiFetch } = await import('@/lib/queryClient');
      await apiFetch('/api/wallets', { method: 'DELETE' });
      
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
        title: "All Accounts Removed",
        description: "All account data cleared, reloading application...",
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

  const handleSaveCustomNodes = () => {
    // Validate URLs (basic validation)
    const isValidUrl = (url: string) => {
      if (!url) return true; // Empty is okay (will use default)
      return url.startsWith('ws://') || url.startsWith('wss://') || 
             url.startsWith('http://') || url.startsWith('https://');
    };

    if (!isValidUrl(customMainnetNode)) {
      toast({
        title: "Invalid Mainnet Node URL",
        description: "Node URL must start with http://, https://, ws://, or wss://",
        variant: "destructive"
      });
      return;
    }

    if (!isValidUrl(customTestnetNode)) {
      toast({
        title: "Invalid Testnet Node URL",
        description: "Node URL must start with http://, https://, ws://, or wss://",
        variant: "destructive"
      });
      return;
    }

    if (!isValidUrl(fullHistoryMainnetNode)) {
      toast({
        title: "Invalid Full History Mainnet URL",
        description: "Node URL must start with http://, https://, ws://, or wss://",
        variant: "destructive"
      });
      return;
    }

    if (!isValidUrl(fullHistoryTestnetNode)) {
      toast({
        title: "Invalid Full History Testnet URL",
        description: "Node URL must start with http://, https://, ws://, or wss://",
        variant: "destructive"
      });
      return;
    }

    // Update XRPL client with custom endpoints (this saves to storage)
    xrplClient.setCustomEndpoint('mainnet', customMainnetNode || null);
    xrplClient.setCustomEndpoint('testnet', customTestnetNode || null);

    // Save full history endpoints to storage AFTER setCustomEndpoint
    // This ensures the full history fields are not overwritten
    const settings = browserStorage.getSettings();
    if (fullHistoryMainnetNode) {
      settings.fullHistoryMainnetNode = fullHistoryMainnetNode.trim();
    } else {
      delete settings.fullHistoryMainnetNode;
    }
    if (fullHistoryTestnetNode) {
      settings.fullHistoryTestnetNode = fullHistoryTestnetNode.trim();
    } else {
      delete settings.fullHistoryTestnetNode;
    }
    browserStorage.saveSettings(settings);

    // Reload full history endpoints in memory
    xrplClient.reloadFullHistoryEndpoints();

    toast({
      title: "Network Settings Saved",
      description: "Custom node URLs and full history servers have been updated successfully"
    });
  };





  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Accounts & Settings</h1>

      {/* XRPL Accounts */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">XRPL Accounts</h2>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{wallet.name || `Account ${index + 1}`}</h3>
                      {currentWallet?.id === wallet.id && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        wallet.network === 'mainnet' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {wallet.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                      </span>
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
                  <Button
                    onClick={() => handleEditWallet(wallet)}
                    variant="ghost"
                    size="sm"
                    data-testid={`edit-wallet-${wallet.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
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
                    onClick={() => handleRemoveAccount(wallet.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid={`remove-account-${wallet.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No accounts added</p>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white dark:bg-card border border-border rounded-xl mb-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="network-settings" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Advanced Settings</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-0">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure custom XRPL node endpoints (JSON-RPC or WebSocket). Supports custom ports. Leave empty to use defaults.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mainnet-node">
                    Mainnet Node URL
                    <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                  </Label>
                  <Input
                    id="mainnet-node"
                    type="text"
                    placeholder="https://s1.ripple.com:51234"
                    value={customMainnetNode}
                    onChange={(e) => setCustomMainnetNode(e.target.value)}
                    data-testid="input-mainnet-node"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: https://s1.ripple.com:51234 or wss://xrplcluster.com
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Default: {xrplClient.getEndpoint('mainnet')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="testnet-node">
                    Testnet Node URL
                    <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                  </Label>
                  <Input
                    id="testnet-node"
                    type="text"
                    placeholder="https://s.altnet.rippletest.net:51234"
                    value={customTestnetNode}
                    onChange={(e) => setCustomTestnetNode(e.target.value)}
                    data-testid="input-testnet-node"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: https://s.altnet.rippletest.net:51234 or wss://s.altnet.rippletest.net:51233
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Default: {xrplClient.getEndpoint('testnet')}
                  </p>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3">Full History Servers (Optional)</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Separate servers are used for transaction history queries. Leave blank to use default full history servers.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full-history-mainnet-node">
                        Mainnet Full History Server
                        <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                      </Label>
                      <Input
                        id="full-history-mainnet-node"
                        type="text"
                        placeholder="https://s1.ripple.com:51234"
                        value={fullHistoryMainnetNode}
                        onChange={(e) => setFullHistoryMainnetNode(e.target.value)}
                        data-testid="input-full-history-mainnet-node"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default: https://s1.ripple.com:51234
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="full-history-testnet-node">
                        Testnet Full History Server
                        <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                      </Label>
                      <Input
                        id="full-history-testnet-node"
                        type="text"
                        placeholder="https://s.altnet.rippletest.net:51234"
                        value={fullHistoryTestnetNode}
                        onChange={(e) => setFullHistoryTestnetNode(e.target.value)}
                        data-testid="input-full-history-testnet-node"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default: https://s.altnet.rippletest.net:51234
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleSaveCustomNodes}
                  className="w-full"
                  data-testid="button-save-nodes"
                >
                  Save Network Settings
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <Button
          onClick={handleRemoveAllAccounts}
          variant="outline"
          className="w-full border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 touch-target"
          data-testid="remove-all-accounts"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Remove All Accounts
        </Button>
      </div>

      {/* Edit Wallet Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Change the account name or switch between mainnet and testnet networks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-name">Account Name</Label>
              <Input
                id="wallet-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="My Account"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wallet-network">Network</Label>
              <Select value={editNetwork} onValueChange={(value: 'mainnet' | 'testnet') => setEditNetwork(value)}>
                <SelectTrigger id="wallet-network">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                  <SelectItem value="testnet">Testnet</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing the network will reload the account data for the selected network.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWalletEdit} disabled={updateWallet.isPending}>
              {updateWallet.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
