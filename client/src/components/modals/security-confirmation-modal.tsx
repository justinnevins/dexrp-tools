import { useState, useEffect } from 'react';
import { Shield, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface SecurityConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transactionData?: {
    amount: string;
    toAddress: string;
    currency?: string;
  };
}

export function SecurityConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  transactionData 
}: SecurityConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsConfirming(false);
      setIsConfirmed(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    setIsConfirming(true);
    
    // Simulate hardware wallet confirmation delay
    setTimeout(() => {
      setIsConfirmed(true);
      
      setTimeout(() => {
        onConfirm();
        onClose();
        
        toast({
          title: "Transaction Confirmed",
          description: "Your transaction has been sent successfully",
        });
      }, 1500);
    }, 3000);
  };

  const formatAddress = (address: string) => {
    if (address.length > 10) {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return address;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto p-6 bg-background">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Confirm on Hardware Wallet</h3>
          <p className="text-sm text-muted-foreground">
            Please confirm this transaction on your Keystone 3 Pro device
          </p>
        </div>
        
        {transactionData && (
          <div className="bg-muted rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-medium">
                {transactionData.amount} {transactionData.currency || 'XRP'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">To:</span>
              <span className="font-mono text-sm">
                {formatAddress(transactionData.toAddress)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fee:</span>
              <span className="text-sm">0.00001 XRP</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-center mb-6">
          <div className={isConfirming ? 'animate-pulse' : ''}>
            <Fingerprint className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 py-3 touch-target"
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={`flex-1 py-3 touch-target ${
              isConfirmed 
                ? 'bg-green-600 hover:bg-green-700' 
                : isConfirming 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={isConfirming || isConfirmed}
          >
            {isConfirmed ? 'Confirmed ✓' : isConfirming ? 'Waiting...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
