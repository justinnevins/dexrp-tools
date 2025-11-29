import { useState, useEffect } from 'react';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { RecentTransactions } from '@/components/wallet/recent-transactions';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';
import { ReceiveModal } from '@/components/modals/receive-modal';
import { useLocation } from 'wouter';
import { useWallet } from '@/hooks/use-wallet';
import Landing from './landing';

export default function Home() {
  const [, setLocation] = useLocation();
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  const { wallets } = useWallet();

  useEffect(() => {
    const seen = localStorage.getItem('xrpl_has_seen_landing');
    setHasSeenLanding(!!seen);
  }, []);

  // Show landing page on first visit when no accounts
  if ((!wallets.data || wallets.data.length === 0) && !hasSeenLanding) {
    return <Landing />;
  }

  // Show empty wallet state after landing or on subsequent visits
  if (!wallets.data || wallets.data.length === 0) {
    return <EmptyWalletState />;
  }

  return (
    <div>
      <WalletBalance
        onReceiveClick={() => setReceiveModalOpen(true)}
      />
      
      <RecentTransactions
        onViewAllClick={() => setLocation('/transactions')}
      />

      <ReceiveModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
      />
    </div>
  );
}
