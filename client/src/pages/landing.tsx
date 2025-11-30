import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Send, Shield, Smartphone, Zap } from 'lucide-react';
import { useState } from 'react';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';

export default function Landing() {
  const [showSetup, setShowSetup] = useState(false);

  if (showSetup) {
    return <EmptyWalletState />;
  }

  const features = [
    {
      icon: Wallet,
      title: 'Manage XRP Wallets',
      description: 'Create, import, or connect hardware wallets. Support for mainnet and testnet.'
    },
    {
      icon: TrendingUp,
      title: 'Trade on the DEX',
      description: 'Access the XRPL decentralized exchange. Trade tokens with real-time order book depth.'
    },
    {
      icon: Send,
      title: 'Send & Receive XRP',
      description: 'Fast, low-cost transactions. QR code scanning for easy receiving.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your keys, your wallet. Local-first architecture with enterprise security.'
    },
    {
      icon: Smartphone,
      title: 'Mobile Ready',
      description: 'Works on web and mobile. Native app support for iOS and Android.'
    },
    {
      icon: Zap,
      title: 'Advanced Control',
      description: 'Custom RPC endpoints, full transaction history, and trust line management.'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-background overflow-hidden">
      {/* Hero Section */}
      <div className="relative px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white mb-4">DEXrp Wallet</h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Your gateway to the XRP Ledger. Trade, send, and manage your digital assets with confidence.
          </p>
          
          <Button
            onClick={() => setShowSetup(true)}
            size="lg"
            className="px-8"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </div>
      {/* Features Grid */}
      <div className="px-4 py-16 sm:px-6 lg:px-8 bg-gray-50 dark:bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-black dark:text-white text-center mb-12">
            Powerful Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white dark:bg-background border border-border rounded-xl hover:shadow-lg transition-shadow"
                  data-testid={`feature-${index}`}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* CTA Section */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Ready to explore?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Add your first wallet or import an existing one to start trading and managing your XRP.
          </p>
          <Button
            onClick={() => setShowSetup(true)}
            size="lg"
            className="px-8"
            data-testid="button-start-now"
          >
            Start Now
          </Button>
        </div>
      </div>
    </div>
  );
}
