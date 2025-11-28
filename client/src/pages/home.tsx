import { useState } from 'react';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { RecentTransactions } from '@/components/wallet/recent-transactions';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';
import { ReceiveModal } from '@/components/modals/receive-modal';
import { useLocation } from 'wouter';
import { useWallet } from '@/hooks/use-wallet';

export default function Home() {
  const [, setLocation] = useLocation();
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const { wallets } = useWallet();

  // Show empty state when no accounts are added (authentic data integrity)
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
