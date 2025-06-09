import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

interface KeystoneQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function KeystoneQRScanner({ onScan, onClose, title = "Scan Signed Transaction", description = "Scan the signed transaction QR code from your Keystone Pro 3" }: KeystoneQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('Starting camera for Keystone QR scanning...');
      
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
              setError(null);
              console.log('Camera active, starting QR scanning...');
              startQRScanning();
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
    }
  };

  const startQRScanning = async () => {
    try {
      // Dynamic import of QR scanner
      const QrScanner = (await import('qr-scanner')).default;
      
      if (videoRef.current) {
        console.log('Initializing QR scanner...');
        setIsScanning(true);
        
        // Scan every 500ms
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && canvasRef.current) {
            try {
              const result = await QrScanner.scanImage(videoRef.current, { returnDetailedScanResult: true });
              
              if (result && result.data) {
                console.log('QR code detected:', result.data.substring(0, 50) + '...');
                
                // Check if it's a valid QR code
                if (result.data && result.data.length > 10) {
                  console.log('QR code detected, processing...');
                  
                  // Check if it's a Keystone signed transaction
                  if (result.data.toUpperCase().startsWith('UR:BYTES/') || 
                      result.data.toUpperCase().startsWith('UR:XRP-SIGNATURE/') ||
                      result.data.toUpperCase().startsWith('UR:')) {
                    console.log('Keystone signed transaction QR detected!');
                    stopCamera();
                    onScan(result.data);
                    return;
                  } else {
                    console.log('Non-Keystone QR detected:', result.data.substring(0, 30));
                  }
                }
              }
            } catch (scanError) {
              // No QR code found, continue scanning
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('QR Scanner initialization failed:', error);
      setError('QR scanning not available. Please ensure you have a modern browser.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
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
                    backgroundColor: '#000'
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
                    <div className="border-2 border-green-400 border-dashed w-48 h-48 rounded-lg flex items-center justify-center">
                      <div className="text-green-400 text-center text-sm font-medium">
                        {isScanning ? 'Scanning for QR code...' : 'Position QR code here'}
                      </div>
                    </div>
                    
                    {/* Scanning indicator */}
                    {isScanning && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded text-xs">
                        🔍 Scanning...
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {isActive && (
                <div className="text-center space-y-2">
                  <div className="text-sm text-green-600 font-medium">
                    Camera is active and scanning for QR codes
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hold your Keystone device's screen steady in front of the camera
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