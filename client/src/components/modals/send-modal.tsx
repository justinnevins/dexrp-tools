import { useState } from 'react';
import { ArrowUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet, useCreateTransaction } from '@/hooks/use-wallet';
import { xrplClient } from '@/lib/xrpl-client';
import { useToast } from '@/hooks/use-toast';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSecurityConfirm: (transactionData: any) => void;
}

export function SendModal({ isOpen, onClose, onSecurityConfirm }: SendModalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [destinationTag, setDestinationTag] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  const { currentWallet } = useWallet();
  const createTransaction = useCreateTransaction();
  const { toast } = useToast();

  const isValidRecipient = recipient === '' || xrplClient.isValidAddress(recipient);
  const isValidAmount = amount === '' || (parseFloat(amount) > 0 && parseFloat(amount) <= 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentWallet || !recipient || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!isValidRecipient) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid XRP address",
        variant: "destructive",
      });
      return;
    }

    if (!isValidAmount) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    const transactionData = {
      walletId: currentWallet.id,
      type: 'sent',
      amount,
      currency: 'XRP',
      fromAddress: currentWallet.address,
      toAddress: recipient,
      destinationTag: destinationTag || undefined,
    };

    try {
      // First create the transaction record
      await createTransaction.mutateAsync(transactionData);
      
      // Then show security confirmation
      onSecurityConfirm(transactionData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setRecipient('');
    setAmount('');
    setDestinationTag('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold">Send XRP</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 pb-6">
          <div>
            <Label htmlFor="recipient" className="block text-sm font-medium mb-2">
              Recipient Address
            </Label>
            <Input
              id="recipient"
              type="text"
              placeholder="rN7n...4X2k or scan QR code"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={`touch-target ${!isValidRecipient ? 'border-destructive' : ''}`}
            />
            {!isValidRecipient && (
              <p className="text-sm text-destructive mt-1">Invalid XRP address format</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="amount" className="block text-sm font-medium mb-2">
              Amount
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`pr-16 touch-target ${!isValidAmount ? 'border-destructive' : ''}`}
                step="0.000001"
                min="0"
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                XRP
              </span>
            </div>
            {!isValidAmount && (
              <p className="text-sm text-destructive mt-1">Please enter a valid amount</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="destinationTag" className="block text-sm font-medium mb-2">
              Destination Tag (Optional)
            </Label>
            <Input
              id="destinationTag"
              type="number"
              placeholder="12345678"
              value={destinationTag}
              onChange={(e) => setDestinationTag(e.target.value)}
              className="touch-target"
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Hardware Wallet Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This transaction will require confirmation on your Keystone 3 Pro device.
                </p>
              </div>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 touch-target"
            disabled={!recipient || !amount || !isValidRecipient || !isValidAmount || isValidating}
          >
            {isValidating ? 'Validating...' : 'Continue to Hardware Wallet'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
