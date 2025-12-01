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
      <div className="relative px-4 py-16 sm:px-6 sm:py-24 lg:px-8 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            DEXrp – Fully Air-Gapped XRPL Wallet for Keystone 3 Pro
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Watch-only interface. Private keys never leave your Keystone.
            <br />
            Sign payments, trustlines, and DEX trades completely offline via QR.
          </p>

          {/* Accuracy Callout Badge */}
          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 px-4 py-2 rounded-full mb-8">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">100% air-gapped signing — Keystone 3 Pro never touches the internet.</span>
          </div>

          {/* CTAs - Different per version */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center ${IS_MOBILE_APP ? 'max-w-sm mx-auto' : ''}`}>
            <Button
              onClick={() => setShowSetup(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8"
              data-testid="button-get-started"
            >
              {IS_MOBILE_APP ? 'Connect Your Wallet' : 'Launch Free Web App'}
            </Button>
            {!IS_MOBILE_APP && (
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-900 px-8"
                data-testid="button-get-premium"
              >
                Get Premium Mobile – $9.99
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Grid - Both Versions */}
      <div className="px-4 py-16 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            What You Get
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            All the tools you need for secure, sovereign XRPL trading
          </p>

          {/* Free Features */}
          <div className="mb-16">
            <h3 className="text-xl font-bold text-green-400 mb-8 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Included Free
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {freeFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-6 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                    data-testid={`feature-free-${index}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-400">
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
            <h3 className="text-xl font-bold text-amber-400 mb-8 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Premium Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {premiumFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={`p-6 rounded-lg border transition-colors ${
                      IS_MOBILE_APP
                        ? 'bg-gray-900 border-green-800/50 opacity-100'
                        : 'bg-gray-900/50 border-gray-800 opacity-75'
                    }`}
                    data-testid={`feature-premium-${index}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {feature.title}
                          </h3>
                          {IS_MOBILE_APP && (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
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
        <div className="px-4 py-16 sm:px-6 lg:px-8 border-b border-gray-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Simple Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Tier */}
              <div className="p-8 bg-gray-900 border border-gray-800 rounded-lg">
                <h3 className="text-2xl font-bold text-white mb-2">Free Web App</h3>
                <p className="text-4xl font-bold text-green-400 mb-4">Forever free</p>
                <p className="text-gray-400 mb-8">Full Keystone air-gapped workflow + basics</p>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Air-gapped signing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Custom XRPL nodes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Basic DEX trading
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Payments & trustlines
                  </li>
                </ul>
                <Button
                  onClick={() => setShowSetup(true)}
                  className="w-full mt-8 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-free-tier"
                >
                  Launch Now
                </Button>
              </div>

              {/* Premium Tier */}
              <div className="p-8 bg-gradient-to-br from-amber-950 to-gray-900 border border-amber-700/50 rounded-lg relative">
                <div className="absolute -top-3 left-6 bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Best Value
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Premium Mobile</h3>
                <p className="text-4xl font-bold text-amber-400 mb-1">$9.99</p>
                <p className="text-sm text-gray-400 mb-8">One-time purchase = lifetime access & updates</p>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Everything in Free, plus:
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Advanced DEX tools
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Portfolio analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Priority nodes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Batch signing
                  </li>
                </ul>
                <Button
                  className="w-full mt-8 bg-amber-600 hover:bg-amber-700"
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
      <div className="px-4 py-16 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">
            Open-Source Core. Community-Driven Future.
          </h2>

          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            The entire watch-only interface and QR signing flow are 100% open-source on GitHub.
            <br />
            Keystone 3 Pro is fully supported today.
            <br />
            Want another QR-based cold wallet? Tell us — we'll build the ones the community actually needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              className="border-gray-700 text-gray-300 hover:bg-gray-900"
              data-testid="button-github"
            >
              <Github className="w-4 h-4 mr-2" />
              View Source on GitHub
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-gray-700 text-gray-300 hover:bg-gray-900"
              data-testid="button-requests"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Request Your Wallet
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Both Versions */}
      <div className="px-4 py-12 sm:px-6 lg:px-8 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="footer-github">
              GitHub
            </a>
            <a href="https://x.com/JustinNevins" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="footer-x">
              X (@JustinNevins)
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="footer-privacy">
              Privacy
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="footer-contact">
              Contact
            </a>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-500 text-sm">
              © 2025 DEXrp – Sovereign XRPL tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
