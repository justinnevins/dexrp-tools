import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield, QrCode, CheckCircle, Loader2, Camera, Globe } from 'lucide-react';
import { useHardwareWallet } from '@/hooks/use-hardware-wallet';
import { useWallet } from '@/hooks/use-wallet';
import type { HardwareWalletType } from '@/lib/real-hardware-wallet';
import { KeystoneAddressModal } from '@/components/modals/keystone-address-modal';
import { QRScanner } from '@/components/qr-scanner';
import { KeystoneAccountScanner } from '@/components/keystone-account-scanner';

interface HardwareWalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const walletInfo = {
  'Keystone 3 Pro': {
    icon: QrCode,
    description: 'Air-gapped cold storage via QR codes',
    connectionType: 'QR Code',
    features: ['Air-gapped security', 'QR code signing', 'Multi-currency support'],
  },
};

export function HardwareWalletConnectModal({ isOpen, onClose }: HardwareWalletConnectModalProps) {
  const [availableWallets, setAvailableWallets] = useState<HardwareWalletType[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<HardwareWalletType | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [walletName, setWalletName] = useState('');
  const [showNetworkSelection, setShowNetworkSelection] = useState(false);
  const [showKeystoneModal, setShowKeystoneModal] = useState(false);
  const [showKeystoneScanner, setShowKeystoneScanner] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { connection, isConnecting, connect, disconnect, getAddress } = useHardwareWallet();
  const { createWallet } = useWallet();
  const isCreatingWalletRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Reset connection state and show only Keystone 3 Pro
      disconnect().catch(() => {}); // Disconnect any previous connection
      setAvailableWallets(['Keystone 3 Pro']);
      setSelectedWallet(null);
      setSelectedNetwork('mainnet');
      setWalletName('');
      setShowNetworkSelection(false);
      setShowKeystoneScanner(false);
      setShowKeystoneModal(false);
      setShowQRScanner(false);
      isCreatingWalletRef.current = false; // Reset the guard when modal opens
    }
  }, [isOpen, disconnect]);

  const handleConnect = async (walletType: HardwareWalletType) => {
    setSelectedWallet(walletType);
    
    // Show network selection first
    setShowNetworkSelection(true);
  };

  const handleNetworkConfirm = () => {
    // After network is selected, show the scanner
    setShowNetworkSelection(false);
    setShowKeystoneScanner(true);
  };

  const handleKeystoneAccountScan = async (address: string, publicKey: string) => {
    // Prevent duplicate wallet creation
    if (isCreatingWalletRef.current) {
      console.log('Already creating wallet, ignoring duplicate call');
      return;
    }
    isCreatingWalletRef.current = true;
    
    try {
      console.log('Keystone 3 Pro account scanned:', { address, publicKey, network: selectedNetwork, name: walletName });
      
      await connect('Keystone 3 Pro');
      
      await createWallet.mutateAsync({
        address,
        publicKey,
        hardwareWalletType: 'Keystone 3 Pro',
        network: selectedNetwork,
        name: walletName || undefined,
      });
      
      setShowKeystoneScanner(false);
      setShowNetworkSelection(false);
      setSelectedWallet(null);
      setSelectedNetwork('mainnet'); // Reset to default
      setWalletName('');
      onClose();
    } catch (error: any) {
      console.error('Keystone 3 Pro connection failed:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      alert(`Failed to add account: ${errorMessage}`);
      isCreatingWalletRef.current = false; // Reset on error so user can retry
    }
  };

  const handleKeystoneConfirm = async (address: string) => {
    // Prevent duplicate wallet creation
    if (isCreatingWalletRef.current) {
      console.log('Already creating wallet, ignoring duplicate call');
      return;
    }
    isCreatingWalletRef.current = true;
    
    try {
      await connect('Keystone 3 Pro');
      
      await createWallet.mutateAsync({
        address,
        hardwareWalletType: 'Keystone 3 Pro',
        network: selectedNetwork,
        name: walletName || undefined,
      });
      
      setShowKeystoneModal(false);
      setSelectedWallet(null);
      setSelectedNetwork('mainnet'); // Reset to default
      setWalletName('');
      onClose();
    } catch (error: any) {
      console.error('Keystone 3 Pro connection failed:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      alert(`Failed to add account: ${errorMessage}`);
      isCreatingWalletRef.current = false; // Reset on error so user can retry
    }
  };

  const handleQRScan = (data: string) => {
    try {
      // Check if the scanned data is a valid XRPL address
      if (data.length >= 25 && data.length <= 34 && data.startsWith('r')) {
        handleKeystoneConfirm(data);
        setShowQRScanner(false);
      } else {
        // Try to parse as JSON in case it's a more complex QR code
        const parsed = JSON.parse(data);
        if (parsed.address && parsed.address.startsWith('r')) {
          handleKeystoneConfirm(parsed.address);
          setShowQRScanner(false);
        } else {
          alert('Invalid account address QR code. Please scan a valid XRPL address.');
        }
      }
    } catch (error) {
      // If it's not JSON, check if it's a direct address
      if (data.startsWith('r') && data.length >= 25 && data.length <= 34) {
        handleKeystoneConfirm(data);
        setShowQRScanner(false);
      } else {
        alert('Invalid QR code format. Please scan a valid XRPL account address.');
      }
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
            <span>Add XRPL Account</span>
          </DialogTitle>
          <DialogDescription>
            Add your Keystone 3 Pro account for secure transaction signing.
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
                    `Add ${walletType} Wallet Account`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

      </DialogContent>
      
      <KeystoneAddressModal
        isOpen={showKeystoneModal}
        onClose={handleKeystoneClose}
        onConfirm={handleKeystoneConfirm}
      />
      
      {showNetworkSelection && (
        <Dialog open={showNetworkSelection} onOpenChange={setShowNetworkSelection}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-primary" />
                <span>Select Network</span>
              </DialogTitle>
              <DialogDescription>
                Choose which XRPL network this account will use. You can add the same address on both networks separately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="wallet-name">Account Name (Optional)</Label>
                <Input
                  id="wallet-name"
                  placeholder="e.g., My Main Account"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  data-testid="input-wallet-name"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for auto-generated name
                </p>
              </div>

              <RadioGroup value={selectedNetwork} onValueChange={(value: 'mainnet' | 'testnet') => setSelectedNetwork(value)}>
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="mainnet" id="mainnet" data-testid="radio-network-mainnet" />
                  <Label htmlFor="mainnet" className="flex-1 cursor-pointer">
                    <div className="font-medium">Mainnet</div>
                    <div className="text-sm text-muted-foreground">Production network with real XRP</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="testnet" id="testnet" data-testid="radio-network-testnet" />
                  <Label htmlFor="testnet" className="flex-1 cursor-pointer">
                    <div className="font-medium">Testnet</div>
                    <div className="text-sm text-muted-foreground">Test network for development</div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex gap-2">
                <Button onClick={handleNetworkConfirm} className="flex-1" data-testid="button-confirm-network">
                  Continue
                </Button>
                <Button onClick={() => {
                  setShowNetworkSelection(false);
                  setSelectedWallet(null);
                  setSelectedNetwork('mainnet'); // Reset to default on cancel
                }} variant="outline" className="flex-1" data-testid="button-cancel-network">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {showKeystoneScanner && (
        <Dialog open={showKeystoneScanner} onOpenChange={setShowKeystoneScanner}>
          <DialogContent className="sm:max-w-md">
            <KeystoneAccountScanner
              onScan={handleKeystoneAccountScan}
              onClose={() => setShowKeystoneScanner(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}