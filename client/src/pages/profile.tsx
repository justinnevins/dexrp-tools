import { User, Shield, Settings, LogOut, Wallet, Globe, Bell, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/hooks/use-wallet';
import { useXRPL } from '@/hooks/use-xrpl';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { NetworkSettings } from '@/components/network-settings';
import { useState } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { currentWallet } = useWallet();
  const { isConnected, currentNetwork, switchNetwork } = useXRPL();
  const { disconnect: disconnectHardwareWallet } = useHardwareWallet();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(true);

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const handleDisconnectWallet = () => {
    // Clear all local storage data
    localStorage.clear();
    
    // Clear all query cache
    queryClient.clear();
    
    // Show confirmation toast
    toast({
      title: "Wallet Disconnected",
      description: "All data cleared, reloading application...",
    });
    
    // Force page reload after brief delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const profileSettings = [
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified about transactions',
      action: (
        <Switch
          checked={notifications}
          onCheckedChange={setNotifications}
        />
      ),
    },
    {
      icon: Lock,
      title: 'Biometric Authentication',
      description: 'Use fingerprint or face unlock',
      action: (
        <Switch
          checked={biometric}
          onCheckedChange={setBiometric}
        />
      ),
    },
  ];

  const accountActions = [
    {
      icon: Wallet,
      title: 'Wallet Management',
      description: 'Add or remove wallets',
      onClick: () => {},
    },
    {
      icon: Shield,
      title: 'Security Settings',
      description: 'Hardware wallet and backup',
      onClick: () => {},
    },
    {
      icon: Globe,
      title: 'Network Settings',
      description: 'Mainnet, Testnet configuration',
      onClick: () => {},
    },
    {
      icon: Settings,
      title: 'App Preferences',
      description: 'Currency, language, theme',
      onClick: () => {},
    },
  ];

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Profile & Settings</h1>

      {/* Wallet Info */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Primary Wallet</h3>
            <p className="text-sm text-muted-foreground">
              {currentWallet ? formatAddress(currentWallet.address) : 'No wallet connected'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p className="font-semibold">{currentWallet?.balance || '0'} XRP</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Network</p>
            <p className="font-semibold">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected ? 'Testnet' : 'Disconnected'}
            </p>
          </div>
        </div>

        {currentWallet?.hardwareWalletType && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {currentWallet.hardwareWalletType} Connected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* App Settings */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-4">App Settings</h3>
        
        <div className="space-y-4">
          {profileSettings.map((setting, index) => {
            const Icon = setting.icon;
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{setting.title}</p>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                {setting.action}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-4">Account</h3>
        
        <div className="space-y-2">
          {accountActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                onClick={action.onClick}
                variant="ghost"
                className="w-full justify-start h-auto p-3 touch-target"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </Button>
            );
          })}
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
