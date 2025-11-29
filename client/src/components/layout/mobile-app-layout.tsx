import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Moon, Sun, Home, ArrowLeftRight, Coins, Settings, TrendingUp, LineChart } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';
import { TestnetBanner } from '@/components/testnet-banner';
import { AccountSwitcher } from '@/components/account-switcher';
import { HardwareWalletConnectModal } from '@/components/modals/hardware-wallet-connect-modal';
import { fetchXRPToRLUSDPrice, formatPrice, type DEXPriceData } from '@/lib/xrp-price';
import { useWallet } from '@/hooks/use-wallet';
import { useFormSubmission } from '@/hooks/use-form-submission';

function ThemeToggleIcon({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemPrefersDark]);

  const isAuto = theme === 'system';
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative">
      <Icon className="w-4 h-4" />
      {isAuto && (
        <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground rounded-full w-3 h-3 flex items-center justify-center leading-none">
          A
        </span>
      )}
    </div>
  );
}

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { currentWallet } = useWallet();
  const [rlusdPrice, setRLUSDPrice] = useState<DEXPriceData | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const { isSubmitting } = useFormSubmission();
  const touchStartYRef = useRef<number>(0);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Handle pull-to-refresh on mobile
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isSubmitting) return;

      const currentY = e.touches[0].clientY;
      const scrollTop = mainContent.scrollTop;

      // Only detect pull-to-refresh when at the top
      if (scrollTop === 0 && currentY > touchStartYRef.current) {
        const pullDistance = currentY - touchStartYRef.current;
        // Refresh when pulled down by 100px or more
        if (pullDistance > 100) {
          window.location.reload();
        }
      }
    };

    mainContent.addEventListener('touchstart', handleTouchStart);
    mainContent.addEventListener('touchmove', handleTouchMove);

    return () => {
      mainContent.removeEventListener('touchstart', handleTouchStart);
      mainContent.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isSubmitting]);

  // Fetch XRP/RLUSD price from DEX order book
  useEffect(() => {
    const network = currentWallet?.network ?? 'mainnet';

    const updatePrice = async () => {
      const price = await fetchXRPToRLUSDPrice(network);
      if (price) {
        setRLUSDPrice(price);
      }
    };

    // Initial fetch
    updatePrice();

    // Update price every 5 seconds
    const interval = setInterval(updatePrice, 5000);

    return () => clearInterval(interval);
  }, [currentWallet?.network]);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/transactions', label: 'History', icon: ArrowLeftRight },
    { path: '/dex', label: 'DEX', icon: LineChart },
    { path: '/assets', label: 'Assets', icon: Coins },
    { path: '/profile', label: 'Settings', icon: Settings },
  ];

  return (
    <div 
      className="flex h-screen overflow-hidden bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r border-border bg-white dark:bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold">DEXrp Wallet</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start ${isActive ? 'bg-accent' : ''}`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col max-w-md lg:max-w-4xl mx-auto w-full h-full overflow-hidden">
        {/* Testnet Banner */}
        <TestnetBanner />

        {/* App Header */}
        <header className="flex-shrink-0 bg-white dark:bg-card shadow-sm border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 max-w-[50%] md:max-w-none">
              <AccountSwitcher onAddAccount={() => setShowConnectModal(true)} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {rlusdPrice && (
                <Link href="/dex" className="hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mr-2 cursor-pointer">
                    <TrendingUp className="w-3 h-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">XRP {formatPrice(rlusdPrice.price).replace('$', '')} (RLUSD)</span>
                  </div>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 rounded-full bg-muted flex-shrink-0"
                data-testid="theme-toggle"
              >
                <ThemeToggleIcon theme={theme} />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto pb-20 lg:pb-6"
          style={{ overscrollBehavior: 'none' }}
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <nav 
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-border z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
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
    </div>
  );
}
