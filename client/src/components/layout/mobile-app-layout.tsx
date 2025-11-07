import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Moon, Sun, Home, ArrowLeftRight, Coins, User, TrendingUp, LineChart } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';
import { TestnetBanner } from '@/components/testnet-banner';
import { fetchXRPPrice, formatPrice, type XRPPriceData } from '@/lib/xrp-price';
import { useNetwork } from '@/contexts/network-context';

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { currentNetwork } = useNetwork();
  const [xrpPrice, setXrpPrice] = useState<XRPPriceData | null>(null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Fetch XRP price on mainnet only
  useEffect(() => {
    if (currentNetwork !== 'mainnet') {
      setXrpPrice(null);
      return;
    }

    const updatePrice = async () => {
      const price = await fetchXRPPrice();
      if (price) {
        setXrpPrice(price);
      }
    };

    // Initial fetch
    updatePrice();

    // Update price every 30 seconds
    const interval = setInterval(updatePrice, 30000);

    return () => clearInterval(interval);
  }, [currentNetwork]);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/transactions', label: 'History', icon: ArrowLeftRight },
    { path: '/dex', label: 'DEX', icon: LineChart },
    { path: '/tokens', label: 'Tokens', icon: Coins },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-card min-h-screen relative">
      {/* Testnet Banner */}
      <TestnetBanner />

      {/* App Header */}
      <header className="bg-white dark:bg-card shadow-sm border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">XRPL Wallet</h1>
              <p className="text-xs text-muted-foreground">
                {xrpPrice ? (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    XRP {formatPrice(xrpPrice.price)}
                  </span>
                ) : (
                  <span className="capitalize">{currentNetwork}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
    </div>
  );
}
