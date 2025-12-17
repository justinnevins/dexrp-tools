import { Heart } from 'lucide-react';
import { SiGithub } from 'react-icons/si';

const DONATION_ADDRESS = 'rMVRPENEPfhwht1RkQp6Emw13DeAp2PtLv';
const DEFAULT_DONATION_AMOUNT = '2';
const KEYSTONE_AFFILIATE_URL = 'https://keyst.one/?rfsn=8924031.c9a3ff&utm_source=refersion&utm_medium=affiliate&utm_campaign=8924031.c9a3ff';
const GITHUB_URL = 'https://github.com/justinnevins/dexrp-tools';

export function Footer() {
  return (
    <div className="px-4 py-6 sm:py-8 bg-gray-950 dark:bg-gray-950 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6 text-center">
          <a 
            href="https://x.com/JustinNevins" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" 
            data-testid="footer-x"
          >
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
          <a 
            href={`/send?tip=true&destination=${DONATION_ADDRESS}&amount=${DEFAULT_DONATION_AMOUNT}&currency=XRP&memo=DEXrp%20Tip`}
            className="text-gray-400 hover:text-pink-400 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1" 
            data-testid="footer-tip"
          >
            <Heart className="w-3 h-3" />
            Tips
          </a>
          <a 
            href="/privacy" 
            className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" 
            data-testid="footer-privacy"
          >
            Privacy
          </a>
          <a 
            href="https://x.com/JustinNevins" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm" 
            data-testid="footer-contact"
          >
            Contact
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center gap-1"
            data-testid="footer-github"
          >
            <SiGithub className="w-3 h-3" />
            GitHub
          </a>
        </div>

        <div className="border-t border-gray-800 pt-4 sm:pt-6">
          <p className="text-center text-gray-500 text-xs sm:text-sm">© 2025 DEXrp Tools  |  Self-custodial XRPL Tools by CarbonVibe</p>
        </div>
      </div>
    </div>
  );
}
