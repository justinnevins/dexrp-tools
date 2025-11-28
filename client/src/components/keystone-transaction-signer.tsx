import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle, Camera, Loader2 } from 'lucide-react';
import { AnimatedQRCode } from '@keystonehq/animated-qr';
import { KeystoneQRScanner } from '@/components/keystone-qr-scanner';
import { FullscreenQRViewer } from '@/components/fullscreen-qr-viewer';
import { useToast } from '@/hooks/use-toast';
import { xrplClient } from '@/lib/xrpl-client';
import { parseKeystoneSignature } from '@/lib/keystone-client';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log('[KeystoneSigner]', ...args);

interface KeystoneTransactionSignerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
  transactionUR: { type: string; cbor: string } | null;
  unsignedTransaction: any;
  transactionType: 'Payment' | 'TrustSet' | 'OfferCreate' | 'OfferCancel';
  walletId: number;
  network: 'mainnet' | 'testnet'; // Required to ensure correct custom endpoint
}

type SigningStep = 'qr-display' | 'signing' | 'submitting' | 'complete';

export function KeystoneTransactionSigner({
  isOpen,
  onClose,
  onSuccess,
  transactionUR,
  unsignedTransaction,
  transactionType,
  walletId,
  network
}: KeystoneTransactionSignerProps) {
  const [currentStep, setCurrentStep] = useState<SigningStep>('qr-display');
  const [showSignedQRScanner, setShowSignedQRScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const closeTimestampRef = useRef<number>(0);
  const { toast } = useToast();

  const handleOpenFullscreen = () => {
    if (Date.now() - closeTimestampRef.current < 300) return;
    if (transactionUR) setShowFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    closeTimestampRef.current = Date.now();
    setShowFullscreen(false);
  };

  const handleQRDialogClose = () => {
    if (currentStep !== 'submitting') {
      setCurrentStep('qr-display');
      setShowSignedQRScanner(false);
      onClose();
    }
  };

  const handleSignedQRScan = async (signedQRData: string) => {
    log('Handle signed QR scan started, type:', transactionType);
    
    if (!unsignedTransaction) {
      console.error('[KeystoneSigner] Missing unsigned transaction data');
      return;
    }

    if (currentStep === 'submitting' || isSubmitting) {
      log('Already processing a signed transaction, ignoring...');
      return;
    }

    try {
      log('Setting step to submitting and closing scanner...');
      setCurrentStep('submitting');
      setIsSubmitting(true);
      setShowSignedQRScanner(false);

      log('Processing signed QR from Keystone');

      let signedTransaction;
      try {
        if (signedQRData.toUpperCase().startsWith('UR:XRP-SIGNATURE/') || 
            signedQRData.toUpperCase().startsWith('UR:BYTES/')) {
          log('Keystone UR format detected');
          
          try {
            const result = parseKeystoneSignature(signedQRData);
            log('Client decoded signature, length:', result.signature?.length);
            
            if (!unsignedTransaction) {
              throw new Error('Original transaction not found');
            }
            
            const { encode } = await import('ripple-binary-codec');
            
            // Check if Keystone returned a full signed transaction blob or just a signature
            // A full signed tx blob starts with "1200" (Payment), "1400" (TrustSet), etc.
            // and is much longer than a bare signature (which is typically 140-144 hex chars)
            const signatureData = result.signature;
            log('Signature data length:', signatureData.length);
            
            let txBlob: string;
            
            // Check if this is a full XRPL serialized transaction (starts with transaction type)
            // XRPL serialized transactions start with field type codes like 1200 (Payment), 1400 (TrustSet), etc.
            if (signatureData.length > 200 && /^1[0-9a-f]00/i.test(signatureData)) {
              // This is a full signed transaction blob from Keystone - use it directly
              log('Keystone returned full signed transaction blob, using directly');
              txBlob = signatureData.toUpperCase();
            } else {
              // This is just a signature - combine with unsigned transaction
              const signedTx = {
                ...unsignedTransaction,
                TxnSignature: signatureData
              };
              log('Signed transaction assembled');
              txBlob = encode(signedTx);
            }
            
            signedTransaction = {
              txBlob: txBlob,
              txHash: null
            };
            
          } catch (decodeError: any) {
            console.error('[KeystoneSigner] Client-side decoding failed:', decodeError?.message || decodeError);
            throw new Error('Failed to decode Keystone signature. Please try again.');
          }
          
        } else {
          throw new Error('Invalid QR code format. Please scan the signed transaction from your Keystone device.');
        }
      } catch (parseError) {
        console.error('[KeystoneSigner] Failed to parse signed transaction:', parseError);
        throw parseError;
      }

      if (!signedTransaction || !signedTransaction.txBlob) {
        throw new Error('No valid transaction blob found in signed data');
      }

      log('Submitting signed transaction to XRPL...');

      const customEndpoint = xrplClient.getEndpoint(network);
      log(`Transaction will be submitted to: ${customEndpoint} (${network})`);

      const submitResult = await xrplClient.submitTransaction(signedTransaction.txBlob, network);
      log('Transaction submitted successfully');
      
      if (!submitResult.success) {
        throw new Error(submitResult.engineResultMessage || 'Transaction submission failed');
      }

      setCurrentStep('complete');

      toast({
        title: "Transaction Successful",
        description: transactionType === 'Payment' 
          ? "Your payment has been sent successfully" 
          : transactionType === 'TrustSet'
          ? "Trustline updated successfully"
          : "Transaction completed successfully",
      });

      log('Calling onSuccess callback');
      onSuccess?.(submitResult.hash || '');
      
      setTimeout(() => {
        log('Closing dialog after success');
        handleQRDialogClose();
      }, 1500);

    } catch (error) {
      console.error('[KeystoneSigner] Transaction signing/submission failed:', error);
      setCurrentStep('qr-display');
      setIsSubmitting(false);
      
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the transaction",
        variant: "destructive",
      });
    }
  };

  const handleMarkSigned = () => {
    log('User ready to scan signed transaction from Keystone');
    setShowSignedQRScanner(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleQRDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Sign Transaction</span>
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your Keystone 3 Pro device to sign the transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4">
            {transactionUR && (
              <div 
                className="border-2 border-border rounded-lg p-4 bg-white cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={handleOpenFullscreen}
                title="Tap to view fullscreen"
              >
                <AnimatedQRCode 
                  type={transactionUR.type} 
                  cbor={transactionUR.cbor}
                />
              </div>
            )}
            
            <div className="text-center space-y-2">
              {currentStep === 'qr-display' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    1. Open the XRP app on your Keystone 3 Pro
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Scan this QR code with your device
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Verify and sign the transaction
                  </p>
                  
                  <Button 
                    onClick={handleMarkSigned}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    I've Signed on Device
                  </Button>
                </>
              )}
              
              
              {currentStep === 'submitting' && (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm font-medium">Submitting Transaction...</p>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we submit your transaction to the XRPL network
                  </p>
                </div>
              )}
              
              {currentStep === 'complete' && (
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="text-sm font-medium text-green-600">Transaction Complete!</p>
                  <p className="text-xs text-muted-foreground">
                    Your transaction has been successfully processed
                  </p>
                </div>
              )}
            </div>
            
            {currentStep !== 'submitting' && currentStep !== 'complete' && (
              <Button 
                onClick={handleQRDialogClose}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showSignedQRScanner && (
        <KeystoneQRScanner
          onScan={handleSignedQRScan}
          onClose={() => setShowSignedQRScanner(false)}
          title="Scan Signed Transaction"
          description="Scan the signed transaction QR code displayed on your Keystone 3 Pro"
        />
      )}

      {showFullscreen && transactionUR && (
        <FullscreenQRViewer onClose={handleCloseFullscreen}>
          <AnimatedQRCode 
            type={transactionUR.type} 
            cbor={transactionUR.cbor}
          />
        </FullscreenQRViewer>
      )}
    </>
  );
}
