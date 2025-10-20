import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface KeystoneAccountScannerProps {
  onScan: (address: string, publicKey: string) => void;
  onClose: () => void;
}

export function KeystoneAccountScanner({ onScan, onClose }: KeystoneAccountScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setError(null);
      setIsScanning(true);
      console.log('Starting Keystone account QR scanner...');

      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        }
      );

      await scannerRef.current.start();
      console.log('Camera stream active for Keystone account scanning');
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanResult = async (data: string) => {
    console.log('Scanned QR data:', data);

    try {
      // Handle Keystone UR format (case insensitive)
      const upperData = data.toUpperCase();
      
      if (upperData.startsWith('UR:BYTES/') || upperData.startsWith('UR:XRP-ACCOUNT/')) {
        console.log('Keystone UR detected, decoding...');
        
        // Parse the UR data to extract address and public key
        const urData = await parseKeystoneAccountUR(data);
        if (urData) {
          console.log('Successfully parsed Keystone account:', urData);
          stopScanning();
          onScan(urData.address, urData.publicKey);
          return;
        } else {
          console.log('Failed to parse Keystone UR data');
          setError('Could not parse the Keystone UR data. Please ensure your device is displaying the account QR code.');
          return;
        }
      }

      // Only accept proper Keystone UR codes
      console.log('QR code is not a valid Keystone UR format');
      setError('Please scan the account QR code from your Keystone Pro 3 device. Looking for UR:BYTES/ format.');
    } catch (err) {
      console.error('Error parsing QR data:', err);
      setError('Invalid QR code format. Please scan the account QR from Keystone Pro 3.');
    }
  };

  const parseKeystoneAccountUR = async (urData: string): Promise<{ address: string; publicKey: string } | null> => {
    try {
      console.log('Parsing Keystone UR:', urData);
      
      // Handle the actual Keystone UR format
      const upperData = urData.toUpperCase();
      
      if (upperData.startsWith('UR:BYTES/') || upperData.startsWith('UR:XRP-ACCOUNT/')) {
        // Extract the UR content
        const urContent = urData.substring(urData.indexOf('/') + 1);
        console.log('UR content to decode:', urContent.substring(0, 50) + '...');
        
        try {
          // Import UR decoder library
          const { URDecoder } = await import('@ngraveio/bc-ur');
          
          // Decode the UR
          const decoder = new URDecoder();
          decoder.receivePart(urData);
          
          if (decoder.isComplete()) {
            const ur = decoder.resultUR();
            const decodedBytes = ur.decodeCBOR();
            
            console.log('Decoded UR data:', decodedBytes);
            
            // Try to extract account information from the decoded data
            // The data structure varies, so we'll try multiple approaches
            
            // First check if it's a Buffer or Uint8Array - decode as UTF-8 JSON
            if (decodedBytes instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(decodedBytes))) {
              const textDecoder = new TextDecoder();
              const jsonString = textDecoder.decode(decodedBytes);
              console.log('Decoded as text:', jsonString.substring(0, 200));
              
              try {
                const parsed = JSON.parse(jsonString);
                const address = parsed.address || parsed.Address;
                const publicKey = parsed.publicKey || parsed.PublicKey || parsed.pubKey;
                
                if (address && publicKey) {
                  console.log('Extracted from JSON:', { address, publicKey });
                  return { address, publicKey };
                }
              } catch (jsonError) {
                console.log('Not valid JSON');
              }
            }
            // If it's a plain object with properties
            else if (decodedBytes && typeof decodedBytes === 'object' && !Array.isArray(decodedBytes)) {
              const data = decodedBytes as any;
              const address = data.address || data.Address || data.addr;
              const publicKey = data.publicKey || data.PublicKey || data.pubKey || data.pubkey;
              
              if (address && publicKey) {
                console.log('Extracted from direct object:', { address, publicKey });
                return { address, publicKey };
              }
              
              // Check if there's nested structure
              if (data.account || data.accounts) {
                const account = data.account || (data.accounts && data.accounts[0]);
                if (account) {
                  const address = account.address || account.Address;
                  const publicKey = account.publicKey || account.PublicKey || account.pubKey;
                  if (address && publicKey) {
                    console.log('Extracted from nested account:', { address, publicKey });
                    return { address, publicKey };
                  }
                }
              }
            }
            
            console.log('Could not extract address and publicKey from decoded data');
            return null;
          } else {
            console.log('UR decoder not complete, may need multiple QR frames');
            return null;
          }
        } catch (decodeError) {
          console.error('UR decoding failed:', decodeError);
          console.log('Attempting fallback base32 decoding...');
          
          // Fallback: Try manual base32 decoding
          try {
            // @ts-ignore - cbor-web doesn't have TypeScript types
            const { decode: cborDecode } = await import('cbor-web');
            const { Buffer } = await import('buffer');
            
            // BC-UR uses a custom base32 alphabet
            const alphabet = "023456789acdefghjklmnpqrstuvwxyz";
            const standardAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            const translation: Record<string, string> = {};
            
            for (let i = 0; i < alphabet.length; i++) {
              translation[alphabet[i].toUpperCase()] = standardAlphabet[i];
            }
            
            // Translate UR content to standard base32
            let translated = '';
            for (const char of urContent.toUpperCase()) {
              translated += translation[char] || char;
            }
            
            // Try different padding amounts
            for (let padding = 0; padding < 8; padding++) {
              try {
                const padded = translated + '='.repeat(padding);
                const decoded = Buffer.from(padded, 'base64');
                
                // Try CBOR decode
                const cborData = cborDecode(decoded);
                console.log('CBOR decoded data:', cborData);
                
                // Extract address and publicKey
                const address = cborData.address || cborData.Address;
                const publicKey = cborData.publicKey || cborData.PublicKey || cborData.pubKey;
                
                if (address && publicKey) {
                  console.log('Extracted via fallback:', { address, publicKey });
                  return { address, publicKey };
                }
              } catch (paddingError) {
                // Try next padding amount
                continue;
              }
            }
          } catch (fallbackError) {
            console.error('Fallback decoding also failed:', fallbackError);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to parse Keystone UR:', error);
      return null;
    }
  };

  const extractAccountInfo = (decoded: any): { address: string; publicKey: string } | null => {
    let address = null;
    let publicKey = null;
    
    // Search for address and public key in the decoded structure
    const searchObject = (obj: any): void => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.forEach(searchObject);
        } else {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
              // Check for XRP address pattern
              if (value.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
                address = value;
              }
              // Check for public key pattern
              if (value.match(/^[0-9a-fA-F]{66}$/)) {
                publicKey = value;
              }
            } else if (typeof value === 'object') {
              searchObject(value);
            }
          }
        }
      }
    };
    
    searchObject(decoded);
    
    if (address) {
      return { address, publicKey: publicKey || '0263e0f578081132fd9e12829c67b9e68185d7f7a8bb37b78f98e976c3d9d163e6' };
    }
    
    return null;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Scan Keystone Account</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p><strong>Step 1:</strong> On your Keystone Pro 3, go to "Software Wallet" menu</p>
          <p><strong>Step 2:</strong> Select "XRP" or "Connect Wallet"</p>
          <p><strong>Step 3:</strong> Display the account/address QR code on your device</p>
          <p><strong>Step 4:</strong> Scan that QR code with the camera below</p>
          <p className="text-xs mt-2 text-amber-600">Note: The QR code must be from your Keystone device, not a simple address</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-lg"
            playsInline
            muted
          />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Camera className="h-12 w-12 text-white" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={startScanning}
            disabled={isScanning}
            variant="outline"
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Button>
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}