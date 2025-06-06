import { useState } from 'react';
import { X, Copy, Share2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { currentWallet } = useWallet();
  const { toast } = useToast();

  const copyAddress = async () => {
    if (!currentWallet?.address) return;
    
    try {
      await navigator.clipboard.writeText(currentWallet.address);
      toast({
        title: "Address Copied",
        description: "Your XRP address has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareAddress = async () => {
    if (!currentWallet?.address) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My XRP Address',
          text: `Send XRP to this address: ${currentWallet.address}`,
        });
      } catch (error) {
        // User cancelled sharing or error occurred
        copyAddress(); // Fallback to copy
      }
    } else {
      copyAddress(); // Fallback for browsers without Web Share API
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bottom-0 translate-y-0 rounded-t-3xl data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Receive XRP</DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="pt-4 text-center pb-6">
          {/* QR Code Placeholder */}
          <div className="w-48 h-48 mx-auto bg-muted rounded-xl mb-4 flex items-center justify-center">
            <QrCode className="w-16 h-16 text-muted-foreground" />
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">Your XRP Address</p>
          
          <div className="bg-muted rounded-xl p-4 mb-4">
            <p className="font-mono text-sm break-all">
              {currentWallet?.address || 'No wallet connected'}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={copyAddress}
              variant="outline"
              className="flex-1 py-3 touch-target"
              disabled={!currentWallet?.address}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
            <Button
              onClick={shareAddress}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 touch-target"
              disabled={!currentWallet?.address}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
