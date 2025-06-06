import { User, Shield, Settings, LogOut, Wallet, Globe, Bell, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/hooks/use-wallet';
import { useXRPL, useAccountInfo } from '@/hooks/use-xrpl';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { NetworkSettings } from '@/components/network-settings';
import { useState, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/notification-service';
import { biometricService } from '@/lib/biometric-service';

export default function Profile() {
  const { currentWallet } = useWallet();
  const { isConnected, currentNetwork, switchNetwork } = useXRPL();
  const { disconnect: disconnectHardwareWallet } = useHardwareWallet();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notifications_enabled') === 'true';
  });
  const [biometric, setBiometric] = useState(() => {
    return localStorage.getItem('biometric_enabled') === 'true';
  });
  
  // Fetch real balance from XRPL
  const { data: accountInfo, isLoading: loadingAccountInfo } = useAccountInfo(currentWallet?.address || null);

  // Start/stop transaction monitoring based on notification settings
  useEffect(() => {
    if (currentWallet?.address && notifications) {
      notificationService.startTransactionMonitoring(currentWallet.address);
    } else {
      notificationService.stopTransactionMonitoring();
    }

    return () => {
      notificationService.stopTransactionMonitoring();
    };
  }, [currentWallet?.address, notifications]);

  // Handle push notification permission
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotifications(true);
          notificationService.enable();
          toast({
            title: "Notifications Enabled",
            description: "You'll receive transaction alerts",
          });
        } else {
          toast({
            title: "Permission Denied",
            description: "Please enable notifications in browser settings",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Not Supported",
          description: "Push notifications not supported in this browser",
          variant: "destructive",
        });
      }
    } else {
      setNotifications(false);
      notificationService.disable();
      toast({
        title: "Notifications Disabled",
        description: "Transaction alerts turned off",
      });
    }
  };

  // Handle biometric authentication
  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const isAvailable = await biometricService.isAvailable();
        if (!isAvailable) {
          toast({
            title: "Not Available",
            description: "Biometric authentication not available on this device",
            variant: "destructive",
          });
          return;
        }

        // Register biometric authentication
        const success = await biometricService.register();
        if (success) {
          setBiometric(true);
          toast({
            title: "Biometric Auth Enabled",
            description: "Use fingerprint or face unlock for security",
          });
        } else {
          toast({
            title: "Setup Failed",
            description: "Could not enable biometric authentication",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Setup Failed",
          description: error instanceof Error ? error.message : "Could not enable biometric authentication",
          variant: "destructive",
        });
      }
    } else {
      setBiometric(false);
      biometricService.disable();
      toast({
        title: "Biometric Auth Disabled",
        description: "Standard authentication will be used",
      });
    }
  };

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

  const profileSettings = [
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified about transactions',
      action: (
        <Switch
          checked={notifications}
          onCheckedChange={handleNotificationToggle}
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
          onCheckedChange={handleBiometricToggle}
        />
      ),
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
            <p className="font-semibold">{getDisplayBalance()} XRP</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Network</p>
            <p className="font-semibold">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected ? currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1) : 'Disconnected'}
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
