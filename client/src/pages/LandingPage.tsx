import { Button } from '@/components/ui/button';
import { Wallet, Lock, GitBranch, CheckCircle2, Send, TrendingUp, Eye, ExternalLink, Crown, Cloud, Zap, Heart } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { apiRequest } from '@/lib/queryClient';
import { isCommunity } from '@/edition';

const PENDING_CHECKOUT_KEY = 'dexrp_pending_checkout';


const KEYSTONE_AFFILIATE_URL = 'https://keyst.one/?rfsn=8924031.c9a3ff&utm_source=refersion&utm_medium=affiliate&utm_campaign=8924031.c9a3ff';

const features = [
  {
    icon: Lock,
    title: 'Air-Gapped Signing with Keystone 3 Pro',
    description: 'Fully offline transaction signing via QR codes. Your private keys never touch the internet.'
  },
  {
    icon: GitBranch,
    title: 'Custom XRPL Node Selection',
    description: 'Connect to your own node or choose from public endpoints. Complete control over your network connection.'
  },
  {
    icon: Send,
    title: 'Send & Receive XRP',
    description: 'Send XRP payments and receive funds securely through the air-gapped signing workflow.'
  },
  {
    icon: TrendingUp,
    title: 'DEX Trading',
    description: 'Create and cancel DEX offers on the XRPL order book. Trade tokens directly from your hardware wallet.'
  },
  {
    icon: CheckCircle2,
    title: 'Token & Trustline Management',
    description: 'Add, view, and remove trust lines for any XRPL token. Full control over which assets your wallet can hold.'
  },
  {
    icon: Eye,
    title: 'Watch-Only Mode',
    description: 'Monitor any XRPL address without signing capabilities. View balances and transaction history safely.'
  }
];

const premiumFeatures = [
  { icon: Wallet, text: 'Unlimited wallets (vs 1 signing + 2 watch-only)' },
  { icon: Cloud, text: 'Optional encrypted cloud sync' },
  { icon: Zap, text: 'Priority support' },
];

export default function LandingPage() {
  const [showSetup, setShowSetup] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPremium } = useSubscription();
  const pendingCheckoutHandled = useRef(false);

  const startCheckout = async (plan: 'monthly' | 'yearly') => {
    setIsCheckingOut(true);
    try {
      const response = await apiRequest('POST', '/api/subscription/checkout', { plan });
      const data = await response.json();
      if (data.url) {
        localStorage.removeItem(PENDING_CHECKOUT_KEY);
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    if (authLoading || pendingCheckoutHandled.current) return;
    
    const pendingPlan = localStorage.getItem(PENDING_CHECKOUT_KEY) as 'monthly' | 'yearly' | null;
    if (pendingPlan && isAuthenticated) {
      pendingCheckoutHandled.current = true;
      startCheckout(pendingPlan);
    }
  }, [isAuthenticated, authLoading]);

  const handleStartTrial = async (plan: 'monthly' | 'yearly') => {
    if (!isAuthenticated) {
      localStorage.setItem(PENDING_CHECKOUT_KEY, plan);
      window.location.href = '/login';
      return;
    }

    startCheckout(plan);
  };

  const handleContinueAsGuest = () => {
    setShowSetup(true);
  };

  if (showSetup) {
    return <EmptyWalletState />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <title>DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro</title>
      <meta name="description" content="Free XRPL wallet with air-gapped signing via Keystone 3 Pro hardware wallet. Send XRP, trade on DEX, and manage tokens securely." />
      <meta property="og:title" content="DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro" />
      <meta property="og:description" content="Secure XRPL trading with hardware wallet security. Watch-only interface with air-gapped signing via QR codes." />
      <meta property="og:type" content="website" />

      {/* Hero Section */}
      <div className="relative px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24 border-b border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent leading-tight">
            DEXrp
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-2 sm:mb-3 font-medium">
            Air-Gapped XRPL Wallet for Keystone 3 Pro
          </p>

          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
            A watch-only interface where your private keys never leave your hardware wallet.
            Sign payments, trustlines, and DEX trades completely offline via QR codes.
          </p>

          {/* Security Badge */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-muted border border-border px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 text-xs sm:text-sm">
            <Lock className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
            <span className="text-muted-foreground">100% air-gapped signing — keys never touch the internet</span>
          </div>

          {/* Community Edition - Simple Get Started with Donation */}
          {isCommunity && (
            <div className="max-w-xl mx-auto mb-8">
              <div className="flex flex-col items-center gap-6">
                <Button
                  onClick={() => setShowSetup(true)}
                  size="lg"
                  className="text-sm sm:text-base px-8 sm:px-10 py-3 h-12 sm:h-14 font-medium"
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
                
                {/* Donation Section */}
                <div className="bg-card border border-border rounded-2xl p-6 w-full shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <span className="font-semibold">Support DEXrp Tools</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 text-center">
                    DEXrp Tools is free and open source. If you find it useful, consider supporting development.
                  </p>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">XRP Tip Jar</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded break-all" data-testid="text-tip-address-landing">
                      rDEXrpTipsAddress
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Premium CTA Section - Commercial Edition Only */}
          {!isCommunity && !isPremium && (
            <div className="max-w-xl mx-auto mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Crown className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                  <span className="font-semibold text-lg">Start Your 7-Day Free Trial</span>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Full access to all Premium features. Cancel anytime.
                </p>
                
                <div className="space-y-2 mb-5">
                  {premiumFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="w-4 h-4 text-primary" />
                        <span>{feature.text}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => handleStartTrial('monthly')}
                    disabled={isCheckingOut}
                    className="font-medium px-6 py-3"
                    data-testid="button-start-trial-monthly"
                  >
                    {isCheckingOut ? 'Loading...' : '$3.49/month'}
                  </Button>
                  <Button
                    onClick={() => handleStartTrial('yearly')}
                    disabled={isCheckingOut}
                    variant="outline"
                    className="font-medium px-6 py-3"
                    data-testid="button-start-trial-yearly"
                  >
                    {isCheckingOut ? 'Loading...' : '$29.99/year (save 15%)'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Payment required to start trial. Cancel before trial ends to avoid charges.
                </p>
              </div>

              {/* Guest Mode Option */}
              <div className="text-center space-y-2">
                <button
                  onClick={handleContinueAsGuest}
                  className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 transition-colors"
                  data-testid="button-continue-guest"
                >
                  Continue as Guest (1 signing + 2 watch-only wallets)
                </button>
                <div className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <a
                    href="/login"
                    className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                    data-testid="link-login-existing"
                  >
                    Sign in
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* If already premium (Commercial Edition), show simple get started */}
          {!isCommunity && isPremium && (
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={() => setShowSetup(true)}
                size="lg"
                className="text-sm sm:text-base px-8 sm:px-10 py-3 h-12 sm:h-14 font-medium"
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </div>
          )}

          <a
            href={KEYSTONE_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mt-4"
            data-testid="link-get-keystone-hero"
          >
            Don't have a Keystone 3 Pro yet?
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-2 sm:mb-4">
            Features
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-2">
            Everything you need for secure, self-custodial XRPL management
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-5 sm:p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
                  data-testid={`feature-${index}`}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                    <div className="w-14 h-14 sm:w-12 sm:h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-7 h-7 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-base">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Keystone CTA */}
          <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-muted border border-border rounded-xl max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <p className="font-medium text-sm sm:text-base mb-1">Need a Keystone 3 Pro?</p>
                <p className="text-muted-foreground text-xs sm:text-sm">The most secure way to manage your XRPL assets</p>
              </div>
              <a
                href={KEYSTONE_AFFILIATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                data-testid="link-get-keystone-features"
              >
                Get Keystone 3 Pro
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
