import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { hardwareWalletService, type HardwareWalletType, type HardwareWalletConnection, type TransactionRequest, type SignedTransaction } from '@/lib/hardware-wallet';

export function useHardwareWallet() {
  const [connection, setConnection] = useState<HardwareWalletConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(async (type: HardwareWalletType) => {
    setIsConnecting(true);
    try {
      const newConnection = await hardwareWalletService.connectHardwareWallet(type);
      setConnection(newConnection);
      
      toast({
        title: "Hardware Wallet Connected",
        description: `Successfully connected to ${type}`,
      });
      
      return newConnection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect hardware wallet';
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    try {
      await hardwareWalletService.disconnect();
      setConnection(null);
      
      toast({
        title: "Hardware Wallet Disconnected",
        description: "Successfully disconnected from hardware wallet",
      });
    } catch (error) {
      console.error('Error disconnecting hardware wallet:', error);
    }
  }, [toast]);

  const getAddress = useCallback(async (type?: HardwareWalletType): Promise<string> => {
    try {
      const address = await hardwareWalletService.getAddress(type);
      return address;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get address';
      
      toast({
        title: "Address Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [toast]);

  const signTransaction = useCallback(async (txRequest: TransactionRequest, type?: HardwareWalletType): Promise<SignedTransaction> => {
    setIsSigning(true);
    try {
      const signedTx = await hardwareWalletService.signTransaction(txRequest, type);
      
      toast({
        title: "Transaction Signed",
        description: "Transaction successfully signed by hardware wallet",
      });
      
      return signedTx;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction';
      
      toast({
        title: "Signing Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsSigning(false);
    }
  }, [toast]);

  const detectAvailableWallets = useCallback(async (): Promise<HardwareWalletType[]> => {
    const availableWallets: HardwareWalletType[] = [];

    // Check for Ledger support (WebUSB)
    if (typeof navigator !== 'undefined' && navigator.usb) {
      availableWallets.push('Ledger');
    }

    // Keystone is always available (QR code based)
    availableWallets.push('Keystone Pro 3');

    // Check for DCent bridge
    if (typeof window !== 'undefined' && (window as any).DCentWebConnector) {
      availableWallets.push('DCent');
    }

    return availableWallets;
  }, []);

  // Initialize connection state from service
  useEffect(() => {
    const currentConnection = hardwareWalletService.getCurrentConnection();
    setConnection(currentConnection);
  }, []);

  return {
    connection,
    isConnected: connection?.connected || false,
    isConnecting,
    isSigning,
    connect,
    disconnect,
    getAddress,
    signTransaction,
    detectAvailableWallets,
  };
}