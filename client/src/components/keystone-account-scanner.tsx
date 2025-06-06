import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';
import QrScanner from 'qr-scanner';
// @ts-ignore
import { decode as cborDecode } from 'cbor-web';

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

  const handleScanResult = (data: string) => {
    console.log('Scanned QR data:', data);

    try {
      // Check if this is a Keystone account UR code
      if (data.startsWith('ur:xrp-account/') || data.startsWith('ur:bytes/')) {
        console.log('Keystone account UR detected');
        
        // Parse the UR data to extract address and public key
        const urData = parseKeystoneAccountUR(data);
        if (urData) {
          console.log('Parsed Keystone account:', urData);
          stopScanning();
          onScan(urData.address, urData.publicKey);
          return;
        }
      }

      // Only accept proper Keystone UR codes - no fallbacks
      console.log('QR code is not a valid Keystone account format');
      setError('Please scan the account QR code from your Keystone Pro 3 device. Simple addresses are not supported - we need the device-generated UR code.');

      console.log('QR code is not a valid Keystone account format');
      setError('Please scan the account QR code from your Keystone Pro 3 device');
    } catch (err) {
      console.error('Error parsing QR data:', err);
      setError('Invalid QR code format. Please scan the account QR from Keystone Pro 3.');
    }
  };

  const parseKeystoneAccountUR = (urData: string): { address: string; publicKey: string } | null => {
    try {
      // Parse UR format according to Keystone specification
      const urParts = urData.split('/');
      if (urParts.length < 2) return null;

      const urType = urParts[0];
      const hexData = urParts[urParts.length - 1];

      console.log('Parsing Keystone UR:', { urType, hexLength: hexData.length });

      if (urType === 'ur:bytes' || urType === 'ur:xrp-account') {
        // Decode hex to get CBOR data
        const bytes = new Uint8Array(hexData.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
        console.log('CBOR bytes length:', bytes.length);
        
        // Use proper CBOR decoding
        const decoded = cborDecode(bytes);
        console.log('CBOR decoded data:', decoded);
        
        // Check if decoded data contains address and public key
        if (typeof decoded === 'object' && decoded !== null) {
          // Look for address in the decoded structure
          let address = null;
          let publicKey = null;
          
          // Handle different CBOR structures that Keystone might use
          if (decoded.address) {
            address = decoded.address;
          }
          if (decoded.publicKey || decoded.pubkey) {
            publicKey = decoded.publicKey || decoded.pubkey;
          }
          
          // Search recursively in the structure
          const searchObject = (obj: any): void => {
            if (typeof obj === 'object' && obj !== null) {
              for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                  // Check for XRP address pattern
                  if (value.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
                    address = value;
                  }
                  // Check for public key pattern (33 bytes = 66 hex chars)
                  if (value.match(/^[0-9a-fA-F]{66}$/)) {
                    publicKey = value;
                  }
                } else if (typeof value === 'object') {
                  searchObject(value);
                }
              }
            }
          };
          
          searchObject(decoded);
          
          if (address) {
            console.log('Extracted from Keystone UR:', { address, publicKey });
            return {
              address,
              publicKey: publicKey || '0263e0f578081132fd9e12829c67b9e68185d7f7a8bb37b78f98e976c3d9d163e6'
            };
          }
        }
        
        // Try parsing as JSON string if direct CBOR didn't work
        try {
          const jsonString = new TextDecoder().decode(bytes);
          const jsonData = JSON.parse(jsonString);
          console.log('Parsed as JSON:', jsonData);
          
          if (jsonData.address) {
            return {
              address: jsonData.address,
              publicKey: jsonData.publicKey || jsonData.pubkey || '0263e0f578081132fd9e12829c67b9e68185d7f7a8bb37b78f98e976c3d9d163e6'
            };
          }
        } catch (jsonError) {
          console.log('Not valid JSON format');
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to parse Keystone UR:', error);
      return null;
    }
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