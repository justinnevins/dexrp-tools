import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle, Camera, Loader2 } from 'lucide-react';
import { AnimatedQRCode } from '@keystonehq/animated-qr';
import { KeystoneQRScanner } from '@/components/keystone-qr-scanner';
import { useToast } from '@/hooks/use-toast';
import { decode as cborDecode } from 'cbor-web';

interface KeystoneTransactionSignerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
  transactionUR: { type: string; cbor: string } | null;
  unsignedTransaction: any;
  transactionType: 'Payment' | 'TrustSet';
  walletId: number;
}

type SigningStep = 'qr-display' | 'signing' | 'submitting' | 'complete';

export function KeystoneTransactionSigner({
  isOpen,
  onClose,
  onSuccess,
  transactionUR,
  unsignedTransaction,
  transactionType,
  walletId
}: KeystoneTransactionSignerProps) {
  const [currentStep, setCurrentStep] = useState<SigningStep>('qr-display');
  const [showSignedQRScanner, setShowSignedQRScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQRDialogClose = () => {
    if (currentStep !== 'submitting') {
      setCurrentStep('qr-display');
      setShowSignedQRScanner(false);
      onClose();
    }
  };

  const handleSignedQRScan = async (signedQRData: string) => {
    console.log('=== HANDLE SIGNED QR SCAN STARTED ===');
    console.log('Transaction type:', transactionType);
    
    if (!unsignedTransaction) {
      console.error('Missing unsigned transaction data');
      return;
    }

    if (currentStep === 'submitting' || isSubmitting) {
      console.log('Already processing a signed transaction, ignoring...');
      return;
    }

    try {
      console.log('Setting step to submitting and closing scanner...');
      setCurrentStep('submitting');
      setIsSubmitting(true);
      setShowSignedQRScanner(false);

      console.log('Processing signed QR from Keystone:', signedQRData.substring(0, 50) + '...');

      let signedTransaction;
      try {
        console.log('Raw signed QR data:', signedQRData.substring(0, 100) + '...');
        
        if (signedQRData.toUpperCase().startsWith('UR:XRP-SIGNATURE/') || 
            signedQRData.toUpperCase().startsWith('UR:BYTES/')) {
          console.log('Keystone UR format detected');
          
          try {
            const response = await fetch('/api/keystone/xrp/decode-signature', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ur: signedQRData
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              console.error('Backend decode error:', error);
              throw new Error(error.details || 'Failed to decode signature');
            }
            
            const result = await response.json();
            console.log('Backend decoded signature:', result);
            
            if (!unsignedTransaction) {
              throw new Error('Original transaction not found');
            }
            
            const signedTx = {
              ...unsignedTransaction,
              TxnSignature: result.signature
            };
            
            console.log('Signed transaction assembled:', signedTx);
            
            const { encode } = await import('ripple-binary-codec');
            const txBlob = encode(signedTx);
            
            signedTransaction = {
              txBlob: txBlob,
              txHash: result.txHash || null
            };
            
          } catch (backendError) {
            console.error('Backend decoding failed:', backendError);
            throw new Error('Failed to decode Keystone signature. Please try again.');
          }
          
        } else {
          throw new Error('Invalid QR code format. Please scan the signed transaction from your Keystone device.');
        }
      } catch (parseError) {
        console.error('Failed to parse signed transaction:', parseError);
        throw parseError;
      }

      if (!signedTransaction || !signedTransaction.txBlob) {
        throw new Error('No valid transaction blob found in signed data');
      }

      console.log('Submitting signed transaction to XRPL...');
      console.log('Transaction blob:', signedTransaction.txBlob);

      // Prepare transaction data based on type
      const transactionData = transactionType === 'Payment' 
        ? {
            type: 'payment',
            amount: unsignedTransaction.Amount || '0',
            currency: 'XRP',
            fromAddress: unsignedTransaction.Account,
            toAddress: unsignedTransaction.Destination,
            destinationTag: unsignedTransaction.DestinationTag
          }
        : {
            type: 'trustline',
            amount: '0',
            currency: unsignedTransaction.LimitAmount?.currency || 'Unknown',
            fromAddress: unsignedTransaction.Account,
            toAddress: unsignedTransaction.LimitAmount?.issuer || '',
            destinationTag: undefined
          };

      const submitResponse = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: walletId,
          txBlob: signedTransaction.txBlob,
          txHash: signedTransaction.txHash || null,
          transactionData
        })
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        console.error('Transaction submission failed:', errorData);
        throw new Error(errorData.details || 'Failed to submit transaction to XRPL');
      }

      const submitResult = await submitResponse.json();
      console.log('✓ Transaction submitted successfully:', submitResult);

      setCurrentStep('complete');

      toast({
        title: "Transaction Successful",
        description: transactionType === 'Payment' 
          ? "Your payment has been sent successfully" 
          : "Trustline created successfully",
      });

      setTimeout(() => {
        onSuccess?.(submitResult.hash || submitResult.tx_json?.hash || '');
        handleQRDialogClose();
      }, 2000);

    } catch (error) {
      console.error('Transaction signing/submission failed:', error);
      setCurrentStep('signing');
      setIsSubmitting(false);
      
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the transaction",
        variant: "destructive",
      });
    }
  };

  const handleMarkSigned = () => {
    console.log('User marked transaction as signed on Keystone');
    setCurrentStep('signing');
    
    toast({
      title: "Waiting for Signature",
      description: "After signing on your Keystone device, scan the signed transaction QR code",
    });
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
              <div className="border-2 border-border rounded-lg p-4 bg-white">
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
              
              {currentStep === 'signing' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                    <p className="text-sm font-medium">Transaction Signed</p>
                    <p className="text-sm text-muted-foreground">
                      Now scan the signed transaction QR code from your Keystone 3 Pro
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowSignedQRScanner(true)}
                    className="w-full mb-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Signed Transaction
                  </Button>
                </div>
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
    </>
  );
}
