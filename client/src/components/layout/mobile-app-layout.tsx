import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Moon, Sun, Home, ArrowLeftRight, Coins, Settings, TrendingUp, LineChart, Plus } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';
import { TestnetBanner } from '@/components/testnet-banner';
import { AccountSwitcher } from '@/components/account-switcher';
import { HardwareWalletConnectModal } from '@/components/modals/hardware-wallet-connect-modal';
import { fetchXRPPrice, formatPrice, type XRPPriceData } from '@/lib/xrp-price';
import { useWallet } from '@/hooks/use-wallet';

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { currentWallet } = useWallet();
  const [xrpPrice, setXrpPrice] = useState<XRPPriceData | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Fetch XRP price on mainnet only
  useEffect(() => {
    const network = currentWallet?.network ?? 'mainnet';
    if (network !== 'mainnet') {
      setXrpPrice(null);
      return;
    }

    const updatePrice = async () => {
      const price = await fetchXRPPrice(network);
      if (price) {
        setXrpPrice(price);
      }
    };

    // Initial fetch
    updatePrice();

    // Update price every 30 seconds
    const interval = setInterval(updatePrice, 30000);

    return () => clearInterval(interval);
  }, [currentWallet?.network]);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/transactions', label: 'History', icon: ArrowLeftRight },
    { path: '/dex', label: 'DEX', icon: LineChart },
    { path: '/tokens', label: 'Tokens', icon: Coins },
    { path: '/profile', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-card min-h-screen relative">
      {/* Testnet Banner */}
      <TestnetBanner />

      {/* App Header */}
      <header className="bg-white dark:bg-card shadow-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <AccountSwitcher />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConnectModal(true)}
              className="p-2"
              data-testid="add-account-header-button"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 rounded-full bg-muted"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white dark:bg-card border-t border-border">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`flex flex-col items-center py-2 px-4 touch-target ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Hardware Wallet Connect Modal */}
      <HardwareWalletConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
}
