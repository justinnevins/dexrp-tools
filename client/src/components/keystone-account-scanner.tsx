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
      setError('Please scan the account QR code from your Keystone 3 Pro device. Looking for UR:BYTES/ format.');
    } catch (err) {
      console.error('Error parsing QR data:', err);
      setError('Invalid QR code format. Please scan the account QR from Keystone 3 Pro.');
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
        console.log('Decoding UR using Bytewords minimal format...');
        
        // @ts-ignore - cbor-web doesn't have TypeScript types
        const { decode: cborDecode } = await import('cbor-web');
        
        // BC-UR Bytewords - complete 256-word table (BCR-2020-012 official specification)
        const bytewords = [
          "able", "acid", "also", "apex", "aqua", "arch", "atom", "aunt",  // 0x00-0x07
          "away", "axis", "back", "bald", "barn", "belt", "beta", "bias",  // 0x08-0x0F
          "blue", "body", "brag", "brew", "bulb", "buzz", "calm", "cash",  // 0x10-0x17
          "cats", "chef", "city", "claw", "code", "cola", "cook", "cost",  // 0x18-0x1F
          "crux", "curl", "cusp", "cyan", "dark", "data", "days", "deli",  // 0x20-0x27
          "dice", "diet", "door", "down", "draw", "drop", "drum", "dull",  // 0x28-0x2F
          "duty", "each", "easy", "echo", "edge", "epic", "even", "exam",  // 0x30-0x37
          "exit", "eyes", "fact", "fair", "fern", "figs", "film", "fish",  // 0x38-0x3F
          "fizz", "flap", "flew", "flux", "foxy", "free", "frog", "fuel",  // 0x40-0x47
          "fund", "gala", "game", "gear", "gems", "gift", "girl", "glow",  // 0x48-0x4F
          "good", "gray", "grim", "guru", "gush", "gyro", "half", "hang",  // 0x50-0x57
          "hard", "hawk", "heat", "help", "high", "hill", "holy", "hope",  // 0x58-0x5F
          "horn", "huts", "iced", "idea", "idle", "inch", "inky", "into",  // 0x60-0x67
          "iris", "iron", "item", "jade", "jazz", "join", "jolt", "jowl",  // 0x68-0x6F
          "judo", "jugs", "jump", "junk", "jury", "keep", "keno", "kept",  // 0x70-0x77
          "keys", "kick", "kiln", "king", "kite", "kiwi", "knob", "lamb",  // 0x78-0x7F
          "lava", "lazy", "leaf", "legs", "liar", "limp", "lion", "list",  // 0x80-0x87
          "logo", "loud", "love", "luau", "luck", "lung", "main", "many",  // 0x88-0x8F
          "math", "maze", "memo", "menu", "meow", "mild", "mint", "miss",  // 0x90-0x97
          "monk", "nail", "navy", "need", "news", "next", "noon", "note",  // 0x98-0x9F
          "numb", "obey", "oboe", "omit", "onyx", "open", "oval", "owls",  // 0xA0-0xA7
          "paid", "part", "peck", "play", "plus", "poem", "pool", "pose",  // 0xA8-0xAF
          "puff", "puma", "purr", "quad", "quiz", "race", "ramp", "real",  // 0xB0-0xB7
          "redo", "rich", "road", "rock", "roof", "ruby", "ruin", "runs",  // 0xB8-0xBF
          "rust", "safe", "saga", "scar", "sets", "silk", "skew", "slot",  // 0xC0-0xC7
          "soap", "solo", "song", "stub", "surf", "swan", "taco", "task",  // 0xC8-0xCF
          "taxi", "tent", "tied", "time", "tiny", "toil", "tomb", "toys",  // 0xD0-0xD7
          "trip", "tuna", "twin", "ugly", "undo", "unit", "urge", "user",  // 0xD8-0xDF
          "vast", "very", "veto", "vial", "vibe", "view", "visa", "void",  // 0xE0-0xE7
          "vows", "wall", "wand", "warm", "wasp", "wave", "waxy", "webs",  // 0xE8-0xEF
          "what", "when", "whiz", "wolf", "work", "yank", "yawn", "yell",  // 0xF0-0xF7
          "yoga", "yurt", "zaps", "zero", "zest", "zinc", "zone", "zoom"   // 0xF8-0xFF
        ];
        
        // Build minimal bytewords lookup (first + last letter → byte value)
        const minimalLookup: Record<string, number> = {};
        for (let i = 0; i < bytewords.length; i++) {
          const word = bytewords[i];
          const minimal = word[0] + word[word.length - 1];
          minimalLookup[minimal] = i;
        }
        
        // Decode bytewords minimal format (2 chars per byte)
        const urContentLower = urContent.toLowerCase();
        const bytes: number[] = [];
        
        for (let i = 0; i < urContentLower.length; i += 2) {
          const pair = urContentLower.substring(i, i + 2);
          const byteValue = minimalLookup[pair];
          
          if (byteValue === undefined) {
            console.log('Unknown byteword pair:', pair, 'at position', i);
            continue;
          }
          
          bytes.push(byteValue);
        }
        
        const decodedBytes = new Uint8Array(bytes);
        console.log('Decoded bytes length:', decodedBytes.length);
        console.log('First 20 bytes:', Array.from(decodedBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Strip CRC32 checksum (last 4 bytes) if present
        const dataWithoutCRC = decodedBytes.length >= 4 
          ? decodedBytes.slice(0, -4) 
          : decodedBytes;
        
        console.log('Data without CRC length:', dataWithoutCRC.length);
        
        // First try to decode as UTF-8 JSON (most common for Keystone account QRs)
        try {
          const textDecoder = new TextDecoder();
          let jsonString = textDecoder.decode(dataWithoutCRC);
          console.log('Decoded as UTF-8 text:', jsonString);
          
          // Skip any leading bytes that aren't JSON (like length prefixes)
          // Find the first '{' character which starts JSON
          const jsonStart = jsonString.indexOf('{');
          if (jsonStart > 0) {
            jsonString = jsonString.substring(jsonStart);
            console.log('Trimmed to JSON:', jsonString);
          }
          
          const parsed = JSON.parse(jsonString);
          console.log('Parsed as JSON:', parsed);
          
          // Extract address and public key (try both "pubkey" and "publicKey")
          const address = parsed.address || parsed.Address || parsed.classic_address;
          const publicKey = parsed.pubkey || parsed.publicKey || parsed.PublicKey || parsed.pubKey || parsed.public_key || parsed.key;
          
          if (address && publicKey) {
            console.log('Successfully extracted from JSON:', { address, publicKey });
            return { address, publicKey };
          }
        } catch (jsonError) {
          console.log('Not valid UTF-8 JSON, trying CBOR:', jsonError);
        }
        
        // Try CBOR decoding as fallback
        try {
          const cborData = cborDecode(dataWithoutCRC);
          console.log('CBOR decoded successfully:', cborData);
          console.log('CBOR data type:', typeof cborData, Array.isArray(cborData) ? 'array' : '');
          console.log('CBOR data keys:', cborData && typeof cborData === 'object' ? Object.keys(cborData) : 'N/A');
          
          // Try to extract address and public key from CBOR data
          const extractFromData = (data: any): { address: string; publicKey: string } | null => {
            if (!data) return null;
            
            // Direct properties (check various naming conventions)
            const address = data.address || data.Address || data.addr || data.classic_address;
            const publicKey = data.publicKey || data.PublicKey || data.pubKey || data.key || data.public_key;
            
            // Try to extract from Uint8Array if present
            let addressStr = address;
            let publicKeyStr = publicKey;
            
            if (address instanceof Uint8Array) {
              addressStr = new TextDecoder().decode(address);
            }
            
            if (publicKey instanceof Uint8Array) {
              publicKeyStr = Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            
            if (addressStr && publicKeyStr) {
              return { address: addressStr, publicKey: publicKeyStr };
            }
            
            // Check arrays
            if (Array.isArray(data)) {
              for (const item of data) {
                const result = extractFromData(item);
                if (result) return result;
              }
            }
            
            // Check nested objects
            if (typeof data === 'object') {
              for (const key in data) {
                const result = extractFromData(data[key]);
                if (result) return result;
              }
            }
            
            return null;
          };
          
          const extracted = extractFromData(cborData);
          if (extracted) {
            console.log('Successfully extracted account info:', extracted);
            return extracted;
          }
        } catch (cborError) {
          console.log('CBOR decode also failed:', cborError);
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
          <p><strong>Step 1:</strong> On your Keystone 3 Pro, go to "..." select "Connect Software Wallet"</p>
          <p><strong>Step 2:</strong> Select "XRP Toolkit"</p>
          <p><strong>Step 3:</strong> Select the account/address from the list to display the account QR code</p>
          <p><strong>Step 4:</strong> Scan that QR code with the camera below</p>
          <p className="text-xs mt-2 text-amber-600">Note: You must follow these instructions exactly. The simple account address QR code will not work.</p>
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