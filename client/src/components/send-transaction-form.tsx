import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, QrCode, Loader2, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { hardwareWalletService } from '@/lib/hardware-wallet';
import { useWallet } from '@/hooks/use-wallet';
import { useAccountInfo } from '@/hooks/use-xrpl';
import { SimpleQRScanner } from '@/components/simple-qr-scanner';
import QRCode from 'qrcode';

const transactionSchema = z.object({
  destination: z.string().min(1, 'Destination address is required').regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/, 'Invalid XRP address format'),
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 100000000;
  }, 'Amount must be a valid positive number up to 100,000,000 XRP'),
  destinationTag: z.string().optional(),
  memo: z.string().max(1000, 'Memo cannot exceed 1000 characters').optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface SendTransactionFormProps {
  onSuccess?: () => void;
}

export function SendTransactionForm({ onSuccess }: SendTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showSignedQRScanner, setShowSignedQRScanner] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'form' | 'qr-display' | 'signing' | 'submitting' | 'complete'>('form');
  const [pendingTransactionData, setPendingTransactionData] = useState<TransactionFormData | null>(null);
  
  const { toast } = useToast();
  const { currentWallet } = useWallet();
  const { data: accountInfo } = useAccountInfo(currentWallet?.address || null);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      destination: '',
      amount: '',
      destinationTag: '',
      memo: '',
    },
  });

  const getAvailableBalance = () => {
    if (!accountInfo || 'account_not_found' in accountInfo) return 0;
    if ('account_data' in accountInfo && accountInfo.account_data?.Balance) {
      const balanceInDrops = parseInt(accountInfo.account_data.Balance);
      return (balanceInDrops / 1000000) - 20; // Reserve 20 XRP for account minimum
    }
    return 0;
  };

  const createTransactionQR = async (txData: TransactionFormData) => {
    if (!currentWallet || !accountInfo || 'account_not_found' in accountInfo) {
      throw new Error('Wallet or account information not available');
    }

    // Convert XRP to drops
    const amountInDrops = (parseFloat(txData.amount) * 1000000).toString();
    
    // Get current sequence number
    const sequence = ('account_data' in accountInfo && accountInfo.account_data?.Sequence) || 1;

    // Create XRP transaction object
    const transaction = {
      TransactionType: 'Payment',
      Account: currentWallet.address,
      Destination: txData.destination,
      Amount: amountInDrops,
      Fee: '12', // 12 drops = 0.000012 XRP
      Sequence: sequence,
      NetworkID: 0, // 0 for mainnet, 1 for testnet
      ...(txData.destinationTag && { DestinationTag: parseInt(txData.destinationTag) }),
      ...(txData.memo && { 
        Memos: [{
          Memo: {
            MemoData: new TextEncoder().encode(txData.memo).reduce((hex, byte) => 
              hex + byte.toString(16).padStart(2, '0'), '').toUpperCase()
          }
        }]
      }),
    };

    // Implement the exact CBOR format that Keystone Pro 3 expects
    // Based on successful decoding of their SDK output
    
    const keystoneTransaction: any = {
      TransactionType: 'Payment',
      Account: currentWallet.address,
      Destination: transaction.Destination,
      Amount: transaction.Amount.toString(),
      Fee: transaction.Fee.toString(),
      Sequence: transaction.Sequence,
      Flags: 0,
      SigningPubKey: '',
      TxnSignature: ''
    };
    
    // Add destination tag only if present
    if (transaction.DestinationTag) {
      keystoneTransaction.DestinationTag = transaction.DestinationTag;
    }
    
    // Convert transaction to JSON bytes
    const jsonString = JSON.stringify(keystoneTransaction);
    const jsonBytes = new TextEncoder().encode(jsonString);
    
    // Create CBOR bytes format with proper length encoding
    let cborPayload;
    if (jsonBytes.length <= 255) {
      // Single byte length (0x58 + length byte)
      cborPayload = new Uint8Array(2 + jsonBytes.length);
      cborPayload[0] = 0x58; // CBOR bytes type
      cborPayload[1] = jsonBytes.length; // Length
      cborPayload.set(jsonBytes, 2); // JSON data
    } else {
      // Multi-byte length encoding (0x59 + 2 length bytes)
      cborPayload = new Uint8Array(4 + jsonBytes.length);
      cborPayload[0] = 0x59; // CBOR bytes type with 2-byte length
      cborPayload[1] = (jsonBytes.length >> 8) & 0xFF; // High byte
      cborPayload[2] = jsonBytes.length & 0xFF; // Low byte
      cborPayload.set(jsonBytes, 3); // JSON data
    }
    
    // Convert to hex string for UR
    const hexString = Array.from(cborPayload)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('CBOR payload hex:', hexString);
    console.log('Transaction JSON:', jsonString);
    
    return `ur:bytes/${hexString}`;
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!currentWallet?.hardwareWalletType || currentWallet.hardwareWalletType !== 'Keystone Pro 3') {
      toast({
        title: "Hardware Wallet Required",
        description: "Please connect your Keystone Pro 3 device first",
        variant: "destructive",
      });
      return;
    }

    const availableBalance = getAvailableBalance();
    const amount = parseFloat(data.amount);
    
    if (amount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You can send up to ${availableBalance.toFixed(6)} XRP`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setCurrentStep('qr-display');

    try {
      // Create QR code data for Keystone Pro 3
      const qrData = await createTransactionQR(data);
      setQrCodeData(qrData);

      // Generate QR code image
      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrUrl);
      setShowQRDialog(true);

      toast({
        title: "QR Code Generated",
        description: "Scan the QR code with your Keystone Pro 3 to sign the transaction",
      });

      // Wait for user to scan QR code and sign with Keystone device
      setCurrentStep('signing');
      
      console.log('QR code displayed for Keystone Pro 3 signing');
      
      // Store transaction data and wait for signed QR scan
      setPendingTransactionData(data);
      
      // Update QR dialog to show "Scan Signed Transaction" button
      toast({
        title: "Waiting for Signature",
        description: "After signing on your Keystone device, scan the signed transaction QR code",
      });

    } catch (error) {
      console.error('Failed to send transaction:', error);
      console.error('Transaction data:', data);
      console.error('Current wallet:', currentWallet);
      console.error('Current step:', currentStep);
      
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to send transaction",
        variant: "destructive",
      });
      setCurrentStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignedQRScan = async (signedQRData: string) => {
    if (!currentWallet || !pendingTransactionData) return;

    try {
      setCurrentStep('submitting');
      setShowSignedQRScanner(false);

      // Parse the signed transaction QR code from Keystone device
      let signedTransaction;
      try {
        // Handle different QR formats from Keystone
        if (signedQRData.startsWith('keystone://')) {
          const base64Data = signedQRData.replace('keystone://xrp-signed/', '');
          const decodedData = JSON.parse(atob(base64Data));
          signedTransaction = decodedData;
        } else {
          signedTransaction = JSON.parse(signedQRData);
        }
      } catch (parseError) {
        throw new Error('Invalid signed transaction QR code format');
      }

      // Submit signed transaction to XRPL network
      const response = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: currentWallet.id,
          txBlob: signedTransaction.txBlob || signedTransaction.signedTransaction,
          txHash: signedTransaction.txHash || signedTransaction.hash,
          transactionData: {
            type: 'sent',
            amount: pendingTransactionData.amount,
            toAddress: pendingTransactionData.destination,
            fromAddress: currentWallet.address,
            memo: pendingTransactionData.memo || null,
            destinationTag: pendingTransactionData.destinationTag || null
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to submit transaction to network');
      }

      setCurrentStep('complete');
      
      toast({
        title: "Transaction Sent",
        description: `Successfully sent ${pendingTransactionData.amount} XRP to ${pendingTransactionData.destination}`,
      });

      // Reset form and state
      form.reset();
      setPendingTransactionData(null);
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }

    } catch (error) {
      console.error('Failed to submit signed transaction:', error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to submit signed transaction",
        variant: "destructive",
      });
      setCurrentStep('signing');
    }
  };

  const handleQRDialogClose = () => {
    setShowQRDialog(false);
    setCurrentStep('form');
    setQrCodeData('');
    setQrCodeUrl('');
    setPendingTransactionData(null);
  };

  const availableBalance = getAvailableBalance();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <span>Send XRP</span>
          </CardTitle>
          <CardDescription>
            Send XRP using your Keystone Pro 3 hardware wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      The XRP address to send funds to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (XRP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.000001"
                        placeholder="0.000000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Available balance: {availableBalance.toFixed(6)} XRP
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Tag (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="12345" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Required by some exchanges and services
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Payment description..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional memo for this transaction
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || !currentWallet?.hardwareWalletType}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Transaction...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Transaction
                  </>
                )}
              </Button>

              {!currentWallet?.hardwareWalletType && (
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Connect your Keystone Pro 3 device to send transactions</span>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showQRDialog} onOpenChange={handleQRDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Sign Transaction</span>
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your Keystone Pro 3 device to sign the transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4">
            {qrCodeUrl && (
              <div className="border-2 border-border rounded-lg p-4 bg-white">
                <img 
                  src={qrCodeUrl} 
                  alt="Transaction QR Code" 
                  className="w-64 h-64"
                />
              </div>
            )}
            
            <div className="text-center space-y-2">
              {currentStep === 'qr-display' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    1. Open the XRP app on your Keystone Pro 3
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Scan this QR code with your device
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Verify and sign the transaction
                  </p>
                </>
              )}
              
              {currentStep === 'signing' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                    <p className="text-sm font-medium">Transaction Signed</p>
                    <p className="text-sm text-muted-foreground">
                      Now scan the signed transaction QR code from your Keystone Pro 3
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowSignedQRScanner(true)}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Signed Transaction
                  </Button>
                </div>
              )}
              
              {currentStep === 'submitting' && (
                <div className="space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  <p className="text-sm font-medium">Submitting to XRPL...</p>
                  <p className="text-sm text-muted-foreground">
                    Broadcasting your transaction to the network
                  </p>
                </div>
              )}
              
              {currentStep === 'complete' && (
                <div className="space-y-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-sm font-medium text-green-600">Transaction Sent!</p>
                  <p className="text-sm text-muted-foreground">
                    Your XRP transaction has been submitted successfully
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleQRDialogClose} 
              variant="outline" 
              className="w-full"
              disabled={currentStep === 'signing' || currentStep === 'submitting'}
            >
              {currentStep === 'complete' ? 'Close' : 'Cancel Transaction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner for Signed Transaction Response */}
      {showSignedQRScanner && (
        <SimpleQRScanner
          onScan={handleSignedQRScan}
          onClose={() => setShowSignedQRScanner(false)}
          title="Scan Signed Transaction"
          description="Scan the signed transaction QR code from your Keystone Pro 3 device"
        />
      )}
    </>
  );
}