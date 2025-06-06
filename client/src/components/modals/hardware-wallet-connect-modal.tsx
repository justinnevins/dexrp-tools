import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Usb, QrCode, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { useWallet } from '@/hooks/use-wallet';
import type { HardwareWalletType } from '@/lib/hardware-wallet';
import { KeystoneAddressModal } from '@/components/modals/keystone-address-modal';

interface HardwareWalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const walletInfo = {
  'Keystone Pro 3': {
    icon: QrCode,
    description: 'Air-gapped cold storage via QR codes',
    connectionType: 'QR Code',
    features: ['Air-gapped security', 'QR code signing', 'Multi-currency support'],
  },
  'Ledger': {
    icon: Usb,
    description: 'Hardware wallet via USB connection',
    connectionType: 'USB',
    features: ['Secure element', 'USB connection', 'App-based verification'],
  },
  'DCent': {
    icon: Globe,
    description: 'Biometric hardware wallet',
    connectionType: 'Web Bridge',
    features: ['Biometric authentication', 'Mobile app', 'Web3 integration'],
  },
};

export function HardwareWalletConnectModal({ isOpen, onClose }: HardwareWalletConnectModalProps) {
  const [availableWallets, setAvailableWallets] = useState<HardwareWalletType[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<HardwareWalletType | null>(null);
  const [showKeystoneModal, setShowKeystoneModal] = useState(false);
  const { connection, isConnecting, connect, getAddress } = useHardwareWallet();
  const { createWallet } = useWallet();

  useEffect(() => {
    if (isOpen) {
      // Always show all wallet types for demonstration
      setAvailableWallets(['Keystone Pro 3', 'Ledger', 'DCent']);
    }
  }, [isOpen]);

  const handleConnect = async (walletType: HardwareWalletType) => {
    setSelectedWallet(walletType);
    
    if (walletType === 'Keystone Pro 3') {
      // Show the React modal for Keystone address entry
      setShowKeystoneModal(true);
      return;
    }
    
    try {
      const connection = await connect(walletType);
      
      if (connection.connected) {
        // Get the actual address from the hardware device
        const address = await getAddress(walletType);
        
        await createWallet.mutateAsync({
          address,
          hardwareWalletType: walletType,
        });
        
        onClose();
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      setSelectedWallet(null);
      alert(`Hardware wallet connection failed: ${error.message}`);
    }
  };

  const handleKeystoneConfirm = async (address: string) => {
    try {
      await connect('Keystone Pro 3');
      
      await createWallet.mutateAsync({
        address,
        hardwareWalletType: 'Keystone Pro 3',
      });
      
      setShowKeystoneModal(false);
      setSelectedWallet(null);
      onClose();
    } catch (error: any) {
      console.error('Keystone connection failed:', error);
      alert(`Keystone connection failed: ${error.message}`);
    }
  };

  const handleKeystoneClose = () => {
    setShowKeystoneModal(false);
    setSelectedWallet(null);
  };

  const isWalletConnected = (walletType: HardwareWalletType) => {
    return connection?.type === walletType && connection.connected;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-6 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Connect Hardware Wallet</span>
          </DialogTitle>
          <DialogDescription>
            Select and connect your hardware wallet for secure transaction signing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {availableWallets.map((walletType) => {
            const info = walletInfo[walletType];
            const Icon = info.icon;
            const isConnected = isWalletConnected(walletType);
            const isConnectingThis = isConnecting && selectedWallet === walletType;

            return (
              <div
                key={walletType}
                className="border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{walletType}</h3>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {info.connectionType}
                  </Badge>
                </div>

                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {info.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleConnect(walletType)}
                  disabled={isConnectingThis || isConnected}
                  className="w-full h-9 text-sm"
                  variant={isConnected ? "secondary" : "default"}
                >
                  {isConnectingThis ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : isConnected ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Connected
                    </>
                  ) : (
                    `Connect ${walletType}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Security Notice
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Only connect hardware wallets from trusted manufacturers. Never share your recovery phrases or private keys.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <KeystoneAddressModal
        isOpen={showKeystoneModal}
        onClose={handleKeystoneClose}
        onConfirm={handleKeystoneConfirm}
      />
    </Dialog>
  );
}