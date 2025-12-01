import { Button } from '@/components/ui/button';
import { Wallet, Lock, GitBranch, CheckCircle2, Send, TrendingUp, Eye, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';

const IS_MOBILE_APP = import.meta.env.VITE_IS_MOBILE_APP === 'true';

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

export default function LandingPage() {
  const [showSetup, setShowSetup] = useState(false);

  if (showSetup) {
    return <EmptyWalletState />;
  }

  return (
    <div className="min-h-screen bg-black dark:bg-black text-white">
      {!IS_MOBILE_APP && (
        <>
          <title>DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro</title>
          <meta name="description" content="Free XRPL wallet with air-gapped signing via Keystone 3 Pro hardware wallet. Send XRP, trade on DEX, and manage tokens securely." />
          <meta property="og:title" content="DEXrp – Air-Gapped XRPL Wallet for Keystone 3 Pro" />
          <meta property="og:description" content="Secure XRPL trading with hardware wallet security. Watch-only interface with air-gapped signing via QR codes." />
          <meta property="og:type" content="website" />
        </>
      )}

      {/* Hero Section */}
      <div className="relative px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent leading-tight">
            DEXrp
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-2 sm:mb-3 font-medium">
            Air-Gapped XRPL Wallet for Keystone 3 Pro
          </p>

          <p className="text-sm sm:text-base lg:text-lg text-gray-400 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
            A watch-only interface where your private keys never leave your hardware wallet.
            Sign payments, trustlines, and DEX trades completely offline via QR codes.
          </p>

          {/* Security Badge */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-gray-900 border border-gray-800 px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 text-xs sm:text-sm">
            <Lock className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300">100% air-gapped signing — keys never touch the internet</span>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => setShowSetup(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base px-8 sm:px-10 py-3 h-12 sm:h-14 font-medium"
              data-testid="button-get-started"
            >
              {IS_MOBILE_APP ? 'Connect Your Wallet' : 'Get Started'}
            </Button>
            
            <a
              href={KEYSTONE_AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              data-testid="link-get-keystone-hero"
            >
              Don't have a Keystone 3 Pro yet?
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 border-b border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-2 sm:mb-4">
            Features
          </h2>
          <p className="text-center text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-2">
            Everything you need for secure, self-custodial XRPL management
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-5 sm:p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
                  data-testid={`feature-${index}`}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                    <div className="w-14 h-14 sm:w-12 sm:h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-7 h-7 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2 text-base">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Keystone CTA */}
          <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <p className="text-white font-medium text-sm sm:text-base mb-1">Need a Keystone 3 Pro?</p>
                <p className="text-gray-400 text-xs sm:text-sm">The most secure way to manage your XRPL assets</p>
              </div>
              <a
                href={KEYSTONE_AFFILIATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                data-testid="link-get-keystone-features"
              >
                Get Keystone 3 Pro
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-8">
            <a href="https://x.com/JustinNevins" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-x">
              X (@JustinNevins)
            </a>
            <a
              href={KEYSTONE_AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
              data-testid="footer-keystone"
            >
              Get Keystone
            </a>
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-privacy">
              Privacy
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" data-testid="footer-contact">
              Contact
            </a>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8">
            <p className="text-center text-gray-500 text-xs sm:text-sm">
              © 2025 DEXrp — Self-custodial XRPL tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
