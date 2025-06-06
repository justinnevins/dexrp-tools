import { useState } from 'react';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { HardwareWalletStatus } from '@/components/wallet/hardware-wallet-status';
import { QuickActions } from '@/components/wallet/quick-actions';
import { RecentTransactions } from '@/components/wallet/recent-transactions';
import { EmptyWalletState } from '@/components/wallet/empty-wallet-state';
import { SendModal } from '@/components/modals/send-modal';
import { ReceiveModal } from '@/components/modals/receive-modal';
import { TrustlineModal } from '@/components/modals/trustline-modal';
import { SecurityConfirmationModal } from '@/components/modals/security-confirmation-modal';
import { useLocation } from 'wouter';
import { useWallet } from '@/hooks/use-wallet';

export default function Home() {
  const [, setLocation] = useLocation();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [trustlineModalOpen, setTrustlineModalOpen] = useState(false);
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

  return (
    <div>
      <WalletBalance
        onSendClick={() => setSendModalOpen(true)}
        onReceiveClick={() => setReceiveModalOpen(true)}
      />
      
      <HardwareWalletStatus />
      
      <QuickActions
        onTrustlineClick={() => setTrustlineModalOpen(true)}
        onEscrowClick={() => {/* TODO: Implement escrow modal */}}
        onHistoryClick={() => setLocation('/transactions')}
        onSettingsClick={() => setLocation('/profile')}
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

      <TrustlineModal
        isOpen={trustlineModalOpen}
        onClose={() => setTrustlineModalOpen(false)}
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
