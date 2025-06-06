import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Moon, Sun, Settings, Home, ArrowLeftRight, Coins, User } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { path: '/tokens', label: 'Tokens', icon: Coins },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-card min-h-screen relative">
      {/* Status Bar */}
      <div className="bg-[hsl(var(--xrpl-dark))] dark:bg-black text-white px-4 py-2 text-sm flex justify-between items-center">
        <span>9:41</span>
        <div className="flex items-center space-x-1 text-xs">
          <span>•••</span>
          <span>📶</span>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* App Header */}
      <header className="bg-white dark:bg-card shadow-sm border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">XRPL Wallet</h1>
              <p className="text-xs text-muted-foreground">Secure & Mobile-First</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 rounded-full bg-muted"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="p-2 rounded-full bg-muted">
              <Settings className="w-4 h-4" />
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
