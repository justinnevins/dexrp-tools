import { useState } from 'react';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { RecentTransactions } from '@/components/wallet/recent-transactions';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';
import { SendModal } from '@/components/modals/send-modal';
import { ReceiveModal } from '@/components/modals/receive-modal';
import { SecurityConfirmationModal } from '@/components/modals/security-confirmation-modal';
import { useLocation } from 'wouter';
import { useWallet } from '@/hooks/use-wallet';

export default function Home() {
  const [, setLocation] = useLocation();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const { wallets } = useWallet();

  const handleSecurityConfirm = (transactionData: any) => {
    setPendingTransaction(transactionData);
    setSendModalOpen(false);
    setSecurityModalOpen(true);
  };

  const handleTransactionConfirmed = () => {
    setPendingTransaction(null);
    setSecurityModalOpen(false);
  };

  // Show empty state when no accounts are added (authentic data integrity)
  if (!wallets.data || wallets.data.length === 0) {
    return <EmptyWalletState />;
  }

  return (
    <div>
      <WalletBalance
        onSendClick={() => setSendModalOpen(true)}
        onReceiveClick={() => setReceiveModalOpen(true)}
      />
      
      <RecentTransactions
        onViewAllClick={() => setLocation('/transactions')}
      />

      <SendModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSecurityConfirm={handleSecurityConfirm}
      />

      <ReceiveModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
      />

      <SecurityConfirmationModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        onConfirm={handleTransactionConfirmed}
        transactionData={pendingTransaction}
      />
    </div>
  );
}
