import { Button } from '@/components/ui/button';
import { Wallet, Lock, GitBranch, Github, MessageCircle, CheckCircle2, Shield, Send, TrendingUp, Zap, Star } from 'lucide-react';
import { useState } from 'react';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';

const IS_MOBILE_APP = import.meta.env.VITE_IS_MOBILE_APP === 'true';

const freeFeatures = [
  {
    icon: Lock,
    title: 'Air-Gapped Signing with Keystone 3 Pro',
    tier: 'Free',
    description: 'Fully offline transaction signing via QR codes. Your keys never touch the internet.'
  },
  {
    icon: GitBranch,
    title: 'Custom XRPL Node Selection',
    tier: 'Free',
    description: 'Connect to your own node or public endpoints. Complete control over your network.'
  },
  {
    icon: Send,
    title: 'Payments & Trustlines',
    tier: 'Free',
    description: 'Send XRP, manage trust lines, and add tokens directly from the air-gapped interface.'
  },
  {
    icon: TrendingUp,
    title: 'Basic DEX Trading',
    tier: 'Free',
    description: 'Create and cancel simple DEX offers on the XRPL order book.'
  }
];

const premiumFeatures = [
  {
    icon: Zap,
    title: 'Advanced DEX Tools',
    tier: 'Premium',
    description: 'Limit orders, slippage guards, multi-hop trading, and order tracking.'
  },
  {
    icon: TrendingUp,
    title: 'Portfolio Analytics & Tax Export',
    tier: 'Premium',
    description: 'Real-time portfolio tracking and downloadable transaction reports for taxes.'
  },
  {
    icon: Shield,
    title: 'Priority Private Nodes',
    tier: 'Premium',
    description: 'Dedicated, low-latency XRPL endpoints for faster execution.'
  },
  {
    icon: Star,
    title: 'Batch & Template Signing',
    tier: 'Premium',
    description: 'Sign multiple transactions at once and save templates for recurring trades.'
  }
];

export default function LandingPage() {
  const [showSetup, setShowSetup] = useState(false);

  if (showSetup) {
    return <EmptyWalletState />;
  }

  return (
    <div className="min-h-screen bg-black dark:bg-black text-white">
      {/* SEO Meta Tags */}
      {!IS_MOBILE_APP && (
        <>
          <title>DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro | Open-Source</title>
          <meta name="description" content="Free open-source watch-only interface for XRPL. Fully air-gapped signing with Keystone 3 Pro. Premium mobile unlocks pro DEX trading tools." />
          <meta property="og:title" content="DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro" />
          <meta property="og:description" content="Sovereign XRPL trading with hardware wallet security. Watch-only interface, air-gapped signing via QR." />
          <meta property="og:type" content="website" />
        </>
      )}

      {/* Hero Section - Both Versions */}
      <div className="relative px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent leading-tight">
            DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro
          </h1>

          <p className="text-sm sm:text-base lg:text-xl text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-2">
            Watch-only interface. Private keys never leave your Keystone.
            <br />
            Sign payments, trustlines, and DEX trades completely offline via QR.
          </p>

          {/* Accuracy Callout Badge */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-gray-900 border border-gray-800 px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 text-xs sm:text-sm">
            <Lock className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300">100% air-gapped signing — Keystone 3 Pro never touches internet</span>
          </div>

          {/* CTAs - Different per version */}
          <div className={`flex flex-col gap-3 sm:gap-4 ${IS_MOBILE_APP ? 'max-w-xs mx-auto' : 'sm:flex-row sm:justify-center'}`}>
            <Button
              onClick={() => setShowSetup(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base px-6 sm:px-8 py-2 sm:py-2 h-10 sm:h-11 font-medium"
              data-testid="button-get-started"
            >
              {IS_MOBILE_APP ? 'Connect Your Wallet' : 'Launch Free Web App'}
            </Button>
            {!IS_MOBILE_APP && (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-900 text-sm sm:text-base px-6 sm:px-8 py-2 sm:py-2 h-10 sm:h-11 font-medium"
                data-testid="button-get-premium"
              >
                Get Premium – $9.99
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Grid - Both Versions */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 border-b border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-2 sm:mb-4">
            What You Get
          </h2>
          <p className="text-center text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-2">
            All the tools you need for secure, sovereign XRPL trading
          </p>

          {/* Free Features */}
          <div className="mb-12 sm:mb-16">
            <h3 className="text-lg sm:text-xl font-bold text-green-400 mb-6 sm:mb-8 flex items-center gap-2 justify-center px-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              Included Free
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {freeFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-4 sm:p-6 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                    data-testid={`feature-free-${index}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">
                          {feature.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium Features */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-amber-400 mb-6 sm:mb-8 flex items-center gap-2 justify-center px-2">
              <Star className="w-5 h-5 flex-shrink-0" />
              Premium Features
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {premiumFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={`p-4 sm:p-6 rounded-lg border transition-colors ${
                      IS_MOBILE_APP
                        ? 'bg-gray-900 border-green-800/50 opacity-100'
                        : 'bg-gray-900/50 border-gray-800 opacity-75'
                    }`}
                    data-testid={`feature-premium-${index}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white text-sm sm:text-base">
                            {feature.title}
                          </h3>
                          {IS_MOBILE_APP && (
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Table - Public Site Only */}
      {!IS_MOBILE_APP && (
        <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 border-b border-gray-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12">
              Simple Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {/* Free Tier */}
              <div className="p-6 sm:p-8 bg-gray-900 border border-gray-800 rounded-lg">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Free Web App</h3>
                <p className="text-3xl sm:text-4xl font-bold text-green-400 mb-4">Forever free</p>
                <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8">Full Keystone air-gapped workflow + basics</p>
                <ul className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base mb-6 sm:mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    Air-gapped signing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    Custom XRPL nodes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    Basic DEX trading
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    Payments & trustlines
                  </li>
                </ul>
                <Button
                  onClick={() => setShowSetup(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base h-10 sm:h-11"
                  data-testid="button-free-tier"
                >
                  Launch Now
                </Button>
              </div>

              {/* Premium Tier */}
              <div className="p-6 sm:p-8 bg-gradient-to-br from-amber-950 to-gray-900 border border-amber-700/50 rounded-lg relative">
                <div className="absolute -top-3 left-6 bg-amber-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                  Best Value
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Premium Mobile</h3>
                <p className="text-3xl sm:text-4xl font-bold text-amber-400 mb-1">$9.99</p>
                <p className="text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8">One-time purchase = lifetime access & updates</p>
                <ul className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base mb-6 sm:mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    Everything in Free, plus:
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    Advanced DEX tools
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    Portfolio analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    Priority nodes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    Batch signing
                  </li>
                </ul>
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-sm sm:text-base h-10 sm:h-11"
                  data-testid="button-premium-tier"
                >
                  Get Premium
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open-Source & Community Section - Both Versions */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 px-2">
            Open-Source Core. Community-Driven Future.
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-2">
            The entire watch-only interface and QR signing flow are 100% open-source on GitHub.
            <br className="hidden sm:block" />
            Keystone 3 Pro is fully supported today.
            <br className="hidden sm:block" />
            Want another QR-based cold wallet? Tell us — we'll build the ones the community actually needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-900 text-sm sm:text-base px-4 sm:px-6 h-10 sm:h-11"
              data-testid="button-github"
            >
              <Github className="w-4 h-4 mr-2" />
              View Source
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-900 text-sm sm:text-base px-4 sm:px-6 h-10 sm:h-11"
              data-testid="button-requests"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Request Wallet
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Both Versions */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-8">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-github">
              GitHub
            </a>
            <a href="https://x.com/JustinNevins" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-x">
              X (@JustinNevins)
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-privacy">
              Privacy
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-contact">
              Contact
            </a>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8">
            <p className="text-center text-gray-500 text-xs sm:text-sm">
              © 2025 DEXrp – Sovereign XRPL tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
