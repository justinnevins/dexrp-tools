import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

interface SimpleQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function SimpleQRScanner({ onScan, onClose, title = "Scan QR Code", description = "Position the QR code within the camera view" }: SimpleQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsActive(true);
              setPermissionGranted(true);
              setError(null);
              console.log('Camera stream active and displaying');
              
              // Force a re-render to ensure video is visible
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.style.opacity = '1';
                  videoRef.current.style.visibility = 'visible';
                }
              }, 100);
            }).catch(err => {
              console.error('Video play failed:', err);
              setError('Failed to play video stream');
            });
          }
        };
      }

    } catch (err) {
      console.error('Camera access failed:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera.');
      }
      setPermissionGranted(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const manualEntry = () => {
    try {
      console.log('Manual entry clicked, title:', title);
      
      // Handle different types of manual entry based on title
      if (title.includes('Signed Transaction')) {
        console.log('Opening signed transaction prompt...');
        
        // For signed transactions, create a more user-friendly input method
        const signedData = window.prompt(`Paste the signed transaction UR code from your Keystone device:

Format should be: UR:BYTES/[long string]

Example: UR:BYTES/HDRFBGAEAECPLAAEAE...`);
        
        console.log('User entered data:', signedData ? 'data provided' : 'no data');
        
        if (signedData && signedData.trim()) {
          const trimmedData = signedData.trim();
          console.log('Trimmed data starts with:', trimmedData.substring(0, 20));
          
          if (trimmedData.toUpperCase().startsWith('UR:')) {
            console.log('Valid UR format, calling onScan...');
            onScan(trimmedData);
          } else {
            console.log('Invalid format detected');
            alert('Invalid format. Please enter the complete UR code starting with "UR:"');
          }
        } else {
          console.log('No data entered or empty string');
        }
      } else {
        // For wallet addresses
        console.log('Opening address prompt...');
        const address = prompt('Enter XRPL wallet address (starting with "r"):');
        if (address && address.startsWith('r') && address.length >= 25) {
          onScan(address);
        } else if (address) {
          alert('Invalid XRPL address format');
        }
      }
    } catch (error) {
      console.error('Manual entry error:', error);
      alert('Error opening input dialog. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <div className="text-red-600 text-sm">{error}</div>
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ width: '100%', height: '256px' }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: '#000',
                    border: 'none',
                    outline: 'none'
                  }}
                />
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <div className="text-sm">Starting camera...</div>
                    </div>
                  </div>
                )}
                
                {/* Scanning overlay */}
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg flex items-center justify-center">
                      <div className="text-white text-center text-sm">
                        Position QR code here
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {isActive && (
                <div className="text-center space-y-2">
                  <Button onClick={manualEntry} variant="outline" className="w-full">
                    {title.includes('Signed Transaction') ? 'Enter Signed Data Manually' : 'Enter Address Manually'}
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('Test button clicked');
                      const testData = 'UR:BYTES/HDRFBGAEAECPLAAEAEAEDKAHRLZSQDCXCWAHSRLTDRHSFZAEAEAEAEBSFWFZISFZAEAEAEAEAEAEBNJKCLAXFZDWCAKPTDFLTOPRDTJYGAWNPMNSVTTEBWBWMULPWYFSIEPKCWTOHPAAIADEEECLJYFGDYFYAOCXKIWSSTWNJTLNTSHLCPYNDLGALPTSBYLRWECYFWWNOXCFTKBGLRZCTSPELNPFBEGWAOCXJYTEZTENTSGWNENTIONYYALRMYPKIEEMFNSRFXSAEMHYZTASATDLDWEYDMYTWMETLYBBKSMYUTPMISPKYNPFMHUEMUBYGMLEZTGOMKZOKIKPLSBBAXDNHSPKHPBZCAMSDKFSMKDNQDRNREWYQDNLVORPFXFESFVY';
                      console.log('Calling onScan with test data...');
                      onScan(testData);
                    }}
                    variant="default" 
                    className="w-full"
                  >
                    Test With Your Keystone Data
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {title.includes('Signed Transaction') 
                      ? 'Camera feed is active. You can also copy/paste the signed transaction data manually.'
                      : 'Camera feed is active. Use manual entry for now.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}