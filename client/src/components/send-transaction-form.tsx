import { useState, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { hardwareWalletService } from '@/lib/hardware-wallet';
import { useWallet } from '@/hooks/use-wallet';
import { useAccountInfo, useAccountLines } from '@/hooks/use-xrpl';
import { xrplClient } from '@/lib/xrpl-client';
import { KeystoneQRScanner } from '@/components/keystone-qr-scanner';
import { SimpleQRScanner } from '@/components/simple-qr-scanner';
import { encode } from 'ripple-binary-codec';
import { AnimatedQRCode } from '@keystonehq/animated-qr';
import { AmountPresetButtons } from '@/components/amount-preset-buttons';
import { calculateAvailableBalance, getTokenBalance } from '@/lib/xrp-account';

const transactionSchema = z.object({
  destination: z.string().min(1, 'Destination address is required').regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/, 'Invalid XRP address format'),
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a valid positive number'),
  currency: z.string().min(1, 'Currency is required'),
  issuer: z.string().optional(),
  destinationTag: z.string().optional(),
  memo: z.string().max(1000, 'Memo cannot exceed 1000 characters').optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface SendTransactionFormProps {
  onSuccess?: () => void;
}

async function encodeKeystoneUR(transactionTemplate: any): Promise<{ type: string; cbor: string }> {
  console.log('=== USING KEYSTONE SDK (CLIENT-SIDE) ===');
  console.log('Transaction object:', transactionTemplate);
  
  try {
    // Use client-side Keystone SDK (no server dependency)
    const { prepareXrpSignRequest } = await import('@/lib/keystone-client');
    const result = prepareXrpSignRequest(transactionTemplate);
    
    console.log('✓ SDK generated type:', result.type);
    console.log('✓ CBOR hex length:', result.cbor.length);
    
    return { type: result.type, cbor: result.cbor };
    
  } catch (error) {
    console.error('❌ Keystone encoding failed:', error);
    throw new Error('Failed to encode transaction. Please try again.');
  }
}

// Simplified decoder for Keystone UR content
function decodeBase32Like(urContent: string): Uint8Array {
  // This is a simplified decoder based on the BC-UR bytewords specification
  // Convert the UR content to bytes using a basic mapping
  const bytes: number[] = [];
  
  // Try to parse as hex first (some Keystone formats use direct hex)
  if (/^[0-9A-Fa-f]+$/.test(urContent)) {
    for (let i = 0; i < urContent.length; i += 2) {
      const hex = urContent.substring(i, i + 2);
      bytes.push(parseInt(hex, 16));
    }
  } else {
    // For non-hex content, use a character-to-byte mapping
    for (let i = 0; i < urContent.length; i++) {
      const char = urContent.charAt(i);
      const charCode = char.charCodeAt(0);
      // Map characters to bytes in a predictable way
      if (charCode >= 65 && charCode <= 90) { // A-Z
        bytes.push(charCode - 65);
      } else if (charCode >= 97 && charCode <= 122) { // a-z
        bytes.push(charCode - 97 + 26);
      } else {
        bytes.push(charCode % 256);
      }
    }
  }
  
  return new Uint8Array(bytes);
}

export function SendTransactionForm({ onSuccess }: SendTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showSignedQRScanner, setShowSignedQRScanner] = useState(false);
  const [showAddressScanner, setShowAddressScanner] = useState(false);
  const [keystoneUR, setKeystoneUR] = useState<{ type: string; cbor: string } | null>(null);
  const [currentStep, setCurrentStep] = useState<'form' | 'qr-display' | 'signing' | 'submitting' | 'complete'>('form');
  const [pendingTransactionData, setPendingTransactionData] = useState<TransactionFormData | null>(null);
  const [pendingUnsignedTx, setPendingUnsignedTx] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingSignatureRef = useRef(false);
  
  const { toast } = useToast();
  const { currentWallet } = useWallet();
  const network = currentWallet?.network ?? 'mainnet';
  const { data: accountInfo, isLoading: isAccountInfoLoading } = useAccountInfo(currentWallet?.address || null, network);
  const { data: accountLines } = useAccountLines(currentWallet?.address || null, network);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      destination: '',
      amount: '',
      currency: 'XRP',
      issuer: '',
      destinationTag: '',
      memo: '',
    },
  });

  const getAvailableBalance = (currency?: string, issuer?: string) => {
    // For XRP, use dynamic reserve calculation
    if (!currency || currency === 'XRP') {
      const balanceInfo = calculateAvailableBalance(accountInfo);
      return balanceInfo.availableMinusFees;
    }
    
    // For tokens, get trustline balance
    if (currency && issuer) {
      return getTokenBalance(accountLines, currency, issuer);
    }
    
    return 0;
  };

  const handleAddressQRScan = (scannedAddress: string) => {
    console.log('Scanned address:', scannedAddress);
    
    // Extract XRP address from QR code data
    // QR codes might contain formats like: ripple:rAddress or just rAddress
    let address = scannedAddress.trim();
    
    if (address.toLowerCase().startsWith('ripple:')) {
      address = address.substring(7);
    }
    
    // Extract just the address if there are additional parameters
    const addressMatch = address.match(/^(r[1-9A-HJ-NP-Za-km-z]{25,34})/);
    if (addressMatch) {
      address = addressMatch[1];
    }
    
    form.setValue('destination', address);
    setShowAddressScanner(false);
    
    toast({
      title: "Address Scanned",
      description: `Destination set to ${address.substring(0, 8)}...${address.substring(address.length - 6)}`,
    });
  };

  const createTransactionQR = async (txData: TransactionFormData) => {
    if (!currentWallet || !accountInfo || 'account_not_found' in accountInfo) {
      throw new Error('Wallet or account information not available');
    }

    // Create amount field based on currency type
    let amount: string | { currency: string; value: string; issuer: string };
    
    if (txData.currency === 'XRP') {
      // XRP amount in drops (string)
      amount = (parseFloat(txData.amount) * 1000000).toString();
    } else {
      // Token amount (object with currency, value, issuer)
      if (!txData.issuer) {
        throw new Error('Issuer is required for token payments');
      }
      amount = {
        currency: txData.currency,
        value: txData.amount,
        issuer: txData.issuer
      };
    }
    
    // Get current sequence number
    const sequence = ('account_data' in accountInfo && accountInfo.account_data?.Sequence) || 1;

    // Try to use real XRPL network data, but allow transaction creation for testing
    let transactionSequence = 1;
    let transactionLedger = 1000;
    
    if (accountInfo && 'account_data' in accountInfo && accountInfo.account_data) {
      // Use real network data when available
      transactionSequence = accountInfo.account_data.Sequence || 1;
      // Check both possible ledger index fields (current or validated ledger)
      transactionLedger = accountInfo.ledger_current_index || accountInfo.ledger_index || 1000;
      
      console.log('Using real XRPL network data:', {
        sequence: transactionSequence,
        currentLedger: transactionLedger,
        accountBalance: accountInfo.account_data.Balance
      });
    }
    
    // Create transaction for Keystone 3 Pro using actual form data
    const xrpTransaction = {
      Account: currentWallet.address,
      Amount: amount,
      Destination: txData.destination,
      Fee: "12",
      Flags: 2147483648,
      LastLedgerSequence: transactionLedger + 1000, // Current ledger + buffer
      Sequence: transactionSequence,
      SigningPubKey: currentWallet.publicKey || "03402C1D75D247CEB2297449F1AD9CE0D313139385EE3D64AA1BCE5B0463283421",
      TransactionType: "Payment"
    };

    // Add optional fields
    if (txData.destinationTag) {
      (xrpTransaction as any).DestinationTag = parseInt(txData.destinationTag);
    }
    
    if (txData.memo) {
      (xrpTransaction as any).Memos = [{
        Memo: {
          MemoData: new TextEncoder().encode(txData.memo).reduce((hex, byte) => 
            hex + byte.toString(16).padStart(2, '0'), '').toUpperCase()
        }
      }];
    }

    console.log('Creating Keystone transaction object:', xrpTransaction);

    try {
      console.log('=== USING KEYSTONE-COMPATIBLE UR ENCODER ===');
      
      // Keep SigningPubKey as shown in the working example
      console.log('Transaction for Keystone:', xrpTransaction);
      
      // Create proper transaction JSON template with actual form data
      const transactionTemplate = {
        Account: currentWallet.address,
        Amount: amount,
        Destination: txData.destination,
        Fee: "12",
        Flags: 2147483648,
        LastLedgerSequence: xrpTransaction.LastLedgerSequence,
        Sequence: transactionSequence,
        SigningPubKey: currentWallet.publicKey || "03402C1D75D247CEB2297449F1AD9CE0D313139385EE3D64AA1BCE5B0463283421",
        TransactionType: "Payment"
      };
      
      // Add optional fields if provided
      if (txData.destinationTag) {
        (transactionTemplate as any).DestinationTag = parseInt(txData.destinationTag);
      }
      
      // Convert to formatted JSON string for Keystone
      const txStr = JSON.stringify(transactionTemplate, null, 2);
      
      console.log('=== TRANSACTION JSON TEMPLATE ===');
      console.log('Template object:', transactionTemplate);
      console.log('Formatted JSON for Keystone:', txStr);
      console.log('Amount in drops:', transactionTemplate.Amount);
      console.log('Original XRP amount:', txData.amount);
      
      // Generate Keystone UR using SDK
      const urResult = await encodeKeystoneUR(transactionTemplate);
      
      console.log('Keystone UR type:', urResult.type);
      console.log('CBOR length:', urResult.cbor.length);
      
      // Store the unsigned transaction so we can combine it with the signature later
      setPendingUnsignedTx(transactionTemplate);
      
      return urResult;
      
    } catch (error) {
      console.error('Keystone encoding failed:', error);
      throw new Error('Failed to encode transaction for Keystone 3 Pro');
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!currentWallet?.hardwareWalletType || currentWallet.hardwareWalletType !== 'Keystone 3 Pro') {
      toast({
        title: "Hardware Wallet Required",
        description: "Please connect your Keystone 3 Pro device first",
        variant: "destructive",
      });
      return;
    }

    // Wait for account info to be loaded before checking balance
    if (isAccountInfoLoading) {
      toast({
        title: "Loading Account Data",
        description: "Please wait for your account balance to load",
        variant: "destructive",
      });
      return;
    }

    // Check if account info is available
    if (!accountInfo || 'account_not_found' in accountInfo) {
      toast({
        title: "Account Not Found",
        description: "Unable to fetch your account balance. Please check your connection.",
        variant: "destructive",
      });
      return;
    }

    const availableBalance = getAvailableBalance(data.currency, data.issuer);
    const amount = parseFloat(data.amount);
    
    if (amount > availableBalance) {
      const currencyName = data.currency === 'XRP' ? 'XRP' : xrplClient.decodeCurrency(data.currency);
      toast({
        title: "Insufficient Balance",
        description: `You can send up to ${availableBalance.toFixed(6)} ${currencyName}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setCurrentStep('qr-display');

    try {
      // Create QR code data for Keystone 3 Pro
      const urData = await createTransactionQR(data);
      setKeystoneUR(urData);
      setShowQRDialog(true);

      toast({
        title: "QR Code Generated",
        description: "Scan the QR code with your Keystone 3 Pro to sign the transaction",
      });

      // Wait for user to scan QR code and sign with Keystone device
      setCurrentStep('signing');
      
      console.log('QR code displayed for Keystone 3 Pro signing');
      
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
    console.log('=== HANDLE SIGNED QR SCAN STARTED ===');
    console.log('Current wallet:', !!currentWallet);
    console.log('Pending transaction data:', !!pendingTransactionData);
    
    if (!currentWallet || !pendingTransactionData) {
      console.error('Missing current wallet or pending transaction data');
      return;
    }

    // Prevent duplicate processing using ref for immediate feedback
    if (processingSignatureRef.current) {
      console.log('Already processing a signed transaction (ref check), ignoring...');
      return;
    }

    try {
      console.log('Setting processing flag and closing scanner...');
      processingSignatureRef.current = true;
      setCurrentStep('submitting');
      setIsSubmitting(true);
      setShowSignedQRScanner(false);

      console.log('Processing signed QR from Keystone:', signedQRData.substring(0, 50) + '...');

      // Parse the signed transaction QR code from Keystone device
      let signedTransaction;
      try {
        console.log('Raw signed QR data:', signedQRData.substring(0, 100) + '...');
        
        // Handle Keystone signed transaction UR format
        if (signedQRData.toUpperCase().startsWith('UR:XRP-SIGNATURE/') || 
            signedQRData.toUpperCase().startsWith('UR:BYTES/')) {
          console.log('Keystone UR format detected');
          
          try {
            // Use client-side Keystone SDK to decode signature (no server dependency)
            console.log('Decoding signature using client-side Keystone SDK...');
            const { parseKeystoneSignature } = await import('@/lib/keystone-client');
            const result = parseKeystoneSignature(signedQRData);
            console.log('Client decoded signature:', result);
            
            // Combine the unsigned transaction with the signature
            if (!pendingUnsignedTx) {
              throw new Error('Original transaction not found');
            }
            
            // Create the signed transaction by adding the signature
            const signedTx = {
              ...pendingUnsignedTx,
              TxnSignature: result.signature
            };
            
            console.log('Combining transaction with signature:', signedTx);
            
            // Encode the signed transaction to get the final blob
            const txBlob = encode(signedTx);
            console.log('Final signed transaction blob:', txBlob);
            
            signedTransaction = {
              txBlob: txBlob,
              txHash: result.requestId || ''
            };
            
          } catch (error) {
            console.error('Keystone signature decoding failed:', error);
            throw error;
          }
          
        } else if (false) {  // Disabled - all Keystone QRs should be handled above
          console.log('Keystone BC-UR bytes format detected');
          
          const urContent = signedQRData.substring(9); // Remove 'UR:BYTES/'
          
          try {
            // Keystone 3 Pro uses CBOR-encoded signed transactions in UR format
            console.log('Attempting CBOR-based decoding for Keystone signed transaction...');
            
            // Import CBOR decoder
            const { decode: cborDecode } = await import('cbor-web');
            
            // Try to decode the UR content using base32 decoding (simplified approach)
            // Keystone encodes the CBOR data in the UR content
            const urBytes = decodeBase32Like(urContent);
            
            console.log('Decoded UR bytes length:', urBytes.length);
            console.log('UR bytes preview:', Array.from(urBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // Decode CBOR data
            const decodedData = cborDecode(urBytes);
            console.log('CBOR decoded data:', decodedData);
            
            // Extract the signed transaction blob
            let txBlob = null;
            if (typeof decodedData === 'object' && decodedData !== null) {
              // Look for common Keystone signature fields
              txBlob = decodedData.signature || decodedData.signedTransaction || decodedData.txBlob || decodedData.blob;
              
              // If it's nested, check deeper
              if (!txBlob && decodedData.request) {
                txBlob = decodedData.request.signature || decodedData.request.signedTransaction;
              }
            } else if (typeof decodedData === 'string') {
              txBlob = decodedData;
            }
            
            if (txBlob && typeof txBlob === 'string' && /^[0-9A-Fa-f]+$/i.test(txBlob)) {
              console.log('Valid signed transaction blob extracted:', txBlob.substring(0, 50) + '...');
              signedTransaction = {
                txBlob: txBlob.toUpperCase(),
                txHash: null
              };
            } else {
              throw new Error('No valid transaction blob found in decoded CBOR data');
            }
            
          } catch (cborError) {
            console.error('CBOR decoding failed:', cborError);
            
            // Enhanced direct pattern extraction for Keystone UR format
            try {
              console.log('Attempting enhanced Keystone UR pattern extraction...');
              console.log('Raw UR content length:', urContent.length);
              
              // The issue is that Keystone's UR format contains CBOR-encoded data
              // but the current decoding produces invalid XRPL transaction format
              
              // Method 1: Look for embedded hex patterns that could be XRPL transactions
              // XRPL Payment transactions typically start with 0x12 (18 decimal)
              let extractedTx = '';
              
              // Try to find valid XRPL transaction patterns in different ways
              const patterns = [
                /12[0-9A-Fa-f]{40,}/g,  // Payment transactions (type 0x12)
                /00[0-9A-Fa-f]{40,}/g,  // Payment transactions (type 0x00) 
                /01[0-9A-Fa-f]{40,}/g,  // EscrowCreate transactions
                /02[0-9A-Fa-f]{40,}/g,  // EscrowFinish transactions
              ];
              
              for (const pattern of patterns) {
                const matches = urContent.match(pattern);
                if (matches && matches.length > 0) {
                  for (const match of matches) {
                    if (match.length >= 60) { // Minimum reasonable transaction length
                      console.log(`Found potential XRPL transaction (pattern ${pattern}):`, match.substring(0, 50) + '...');
                      extractedTx = match;
                      break;
                    }
                  }
                  if (extractedTx) break;
                }
              }
              
              // Method 2: If no direct hex pattern found, try decoding the UR content differently
              if (!extractedTx) {
                console.log('No direct hex pattern found, attempting alternative decoding...');
                
                // The UR content might need different interpretation
                // Try converting character pairs to hex bytes
                let alternativeHex = '';
                for (let i = 0; i < urContent.length - 1; i += 2) {
                  const pair = urContent.substring(i, i + 2);
                  // Map character pairs to hex values based on Keystone's encoding
                  const charSum = pair.charCodeAt(0) + pair.charCodeAt(1);
                  const hexByte = (charSum % 256).toString(16).padStart(2, '0');
                  alternativeHex += hexByte;
                }
                
                // Look for XRPL patterns in the alternative hex
                const altPattern = alternativeHex.match(/(12[0-9A-Fa-f]{60,})/);
                if (altPattern) {
                  extractedTx = altPattern[1];
                  console.log('Found XRPL transaction via alternative decoding:', extractedTx.substring(0, 50) + '...');
                }
              }
              
              if (extractedTx && extractedTx.length >= 60) {
                signedTransaction = {
                  txBlob: extractedTx.toUpperCase(),
                  txHash: null
                };
                console.log('Successfully extracted transaction blob');
              } else {
                throw new Error('Unable to extract valid XRPL transaction from Keystone UR data');
              }
              
            } catch (enhancedError) {
              console.error('Enhanced pattern extraction failed:', enhancedError);
              throw new Error('Keystone signed transaction format is not compatible. Please ensure your device is using the latest firmware and XRPL app version.');
            }
          }
          
        } else if (signedQRData.startsWith('{')) {
          // Handle JSON format
          console.log('JSON format detected');
          signedTransaction = JSON.parse(signedQRData);
          
        } else if (/^[0-9A-Fa-f]+$/.test(signedQRData)) {
          // Handle raw hex transaction blob
          console.log('Raw hex transaction blob detected');
          signedTransaction = {
            txBlob: signedQRData,
            txHash: null
          };
          
        } else {
          throw new Error('Unrecognized signed transaction format. Expected UR:XRP-SIGNATURE/, UR:BYTES/, JSON, or hex data.');
        }
        
        // Validate we have the required fields
        if (!signedTransaction.txBlob) {
          throw new Error('Signed transaction missing transaction blob');
        }
        
        // Validate transaction blob format for XRPL
        const txBlob = signedTransaction.txBlob.toUpperCase();
        console.log('Validating transaction blob format:', txBlob.substring(0, 50) + '...');
        
        if (!txBlob || txBlob.length < 20 || !/^[0-9A-F]+$/.test(txBlob)) {
          throw new Error('Invalid transaction blob format. Must be valid hex.');
        }
        
        // Check if this looks like a valid XRPL transaction
        // XRPL transactions should start with valid transaction type codes
        const firstByte = txBlob.substring(0, 2);
        if (firstByte === '30' || firstByte === '31' || firstByte === '32') {
          // This appears to be incorrectly decoded - try to find the actual transaction
          console.warn('Transaction blob appears to be incorrectly decoded. Attempting to extract valid XRPL transaction...');
          
          // Look for common XRPL payment transaction patterns (type 0x00 = Payment)
          const paymentPattern = txBlob.match(/(12[0-9A-F]{40,})/);
          if (paymentPattern) {
            console.log('Found payment transaction pattern:', paymentPattern[1].substring(0, 50) + '...');
            signedTransaction.txBlob = paymentPattern[1];
          } else {
            throw new Error('Unable to extract valid XRPL transaction from Keystone signed data. The device may be using an incompatible encoding format.');
          }
        }
        
        console.log('Parsed signed transaction:', signedTransaction);
        
      } catch (parseError) {
        console.error('Failed to parse signed QR:', parseError);
        throw new Error('Invalid signed transaction QR code format. Please ensure you scanned the signed transaction from your Keystone device.');
      }

      // Get current network from wallet
      const submissionNetwork = currentWallet?.network || 'mainnet';
      
      // Get the custom endpoint configured for this network
      const customEndpoint = xrplClient.getEndpoint(submissionNetwork);
      
      console.log('Submitting transaction to network:', submissionNetwork);
      console.log('Using XRPL endpoint:', customEndpoint);
      console.log('Transaction blob:', signedTransaction.txBlob);
      
      // Submit directly to XRPL using client-side connection (no server dependency)
      const txBlob = signedTransaction.txBlob || signedTransaction.signedTransaction;
      const submitResult = await xrplClient.submitTransaction(txBlob, submissionNetwork);
      console.log('Transaction submitted:', submitResult);
      
      if (!submitResult.success) {
        throw new Error(submitResult.engineResultMessage || 'Failed to submit transaction to network');
      }

      setCurrentStep('complete');
      
      toast({
        title: "Transaction Sent",
        description: `Successfully sent ${pendingTransactionData.amount} ${pendingTransactionData.currency} to ${pendingTransactionData.destination}`,
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
    } finally {
      setIsSubmitting(false);
      processingSignatureRef.current = false;
    }
  };

  const handleQRDialogClose = () => {
    setShowQRDialog(false);
    setCurrentStep('form');
    setKeystoneUR(null);
    setPendingTransactionData(null);
    setPendingUnsignedTx(null);
  };

  const availableBalance = getAvailableBalance();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <span>Send Payment</span>
          </CardTitle>
          <CardDescription>
            Send XRP or tokens using your Keystone 3 Pro hardware wallet
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
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input 
                          placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
                          {...field}
                          data-testid="input-destination"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowAddressScanner(true)}
                        data-testid="button-scan-address"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      The XRP address to send funds to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => {
                  // Create a combined value for the select (currency|issuer or just XRP)
                  const selectValue = field.value === 'XRP' 
                    ? 'XRP' 
                    : `${field.value}|${form.watch('issuer')}`;
                  
                  // Get display name for selected currency
                  const displayValue = field.value ? xrplClient.decodeCurrency(field.value) : undefined;
                  
                  return (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          console.log('Currency selection changed:', value);
                          const [currency, issuer] = value.split('|');
                          field.onChange(currency);
                          form.setValue('issuer', issuer || '');
                        }} 
                        value={selectValue}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder="Select currency">
                              {displayValue}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="XRP">XRP</SelectItem>
                          {accountLines?.lines?.map((line: any) => {
                            const displayCurrency = xrplClient.decodeCurrency(line.currency);
                            return (
                              <SelectItem 
                                key={`${line.currency}-${line.account}`} 
                                value={`${line.currency}|${line.account}`}
                              >
                                {displayCurrency}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select XRP or a token you hold
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.000001"
                          placeholder="0.000000" 
                          {...field}
                          data-testid="input-amount"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                          {form.watch('currency') ? xrplClient.decodeCurrency(form.watch('currency')) : 'XRP'}
                        </span>
                      </div>
                    </FormControl>
                    <div className="mt-2">
                      <AmountPresetButtons
                        availableAmount={getAvailableBalance(form.watch('currency'), form.watch('issuer'))}
                        onSelect={(amount) => form.setValue('amount', amount)}
                        disabled={isLoading}
                      />
                    </div>
                    <FormDescription>
                      {(() => {
                        const currency = form.watch('currency');
                        const issuer = form.watch('issuer');
                        const balance = getAvailableBalance(currency, issuer);
                        const displayCurrency = currency === 'XRP' ? 'XRP' : xrplClient.decodeCurrency(currency);
                        return balance > 0 ? `Available: ${balance.toFixed(6)} ${displayCurrency}` : '';
                      })()}
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
                  <span>Connect your Keystone 3 Pro device to send transactions</span>
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
              Scan this QR code with your Keystone 3 Pro device to sign the transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4">
            {keystoneUR && (
              <div className="border-2 border-border rounded-lg p-4 bg-white">
                <AnimatedQRCode 
                  type={keystoneUR.type} 
                  cbor={keystoneUR.cbor}
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
        <KeystoneQRScanner
          onScan={handleSignedQRScan}
          onClose={() => setShowSignedQRScanner(false)}
          title="Scan Signed Transaction"
          description="Scan the signed transaction QR code from your Keystone 3 Pro device"
        />
      )}

      {/* QR Scanner for Destination Address */}
      {showAddressScanner && (
        <SimpleQRScanner
          onScan={handleAddressQRScan}
          onClose={() => setShowAddressScanner(false)}
          title="Scan Destination Address"
          description="Scan the QR code containing the destination XRP address"
        />
      )}
    </>
  );
}