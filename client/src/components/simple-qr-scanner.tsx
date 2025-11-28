import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log('[SimpleQR]', ...args);

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
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
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
      log('Requesting camera access...');
      
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
              log('Camera stream active and displaying');
              startQRScanning();
              
              // Force a re-render to ensure video is visible
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.style.opacity = '1';
                  videoRef.current.style.visibility = 'visible';
                }
              }, 100);
            }).catch(err => {
              console.error('[SimpleQR] Video play failed:', err);
              setError('Failed to play video stream');
            });
          }
        };
      }

    } catch (err) {
      console.error('[SimpleQR] Camera access failed:', err);
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

  const startQRScanning = async () => {
    try {
      // Dynamic import of QR scanner
      const QrScanner = (await import('qr-scanner')).default;
      
      if (videoRef.current) {
        log('Starting QR scanner...');
        setIsScanning(true);
        
        // Scan every 500ms
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && !hasScannedRef.current) {
            try {
              const result = await QrScanner.scanImage(videoRef.current, { returnDetailedScanResult: true });
              
              if (result && result.data) {
                const qrData = result.data.trim();
                log('QR code detected');
                
                // Mark as scanned to prevent multiple scans
                hasScannedRef.current = true;
                
                // Stop scanning
                if (scanIntervalRef.current) {
                  clearInterval(scanIntervalRef.current);
                  scanIntervalRef.current = null;
                }
                
                // Call the onScan callback
                onScan(qrData);
              }
            } catch (err) {
              // Ignore scan errors (no QR code in frame)
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('[SimpleQR] Failed to initialize QR scanner:', error);
      setError('Failed to initialize QR scanner');
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

  const manualEntry = () => {
    try {
      log('Manual entry clicked');
      
      // Handle different types of manual entry based on title
      if (title.includes('Signed Transaction')) {
        log('Opening signed transaction prompt...');
        
        // For signed transactions, create a more user-friendly input method
        const signedData = window.prompt(`Paste the signed transaction UR code from your Keystone device:

Format should be: UR:BYTES/[long string]

Example: UR:BYTES/HDRFBGAEAECPLAAEAE...`);
        
        log('User entered data');
        
        if (signedData && signedData.trim()) {
          const trimmedData = signedData.trim();
          log('Processing manual entry data');
          
          if (trimmedData.toUpperCase().startsWith('UR:')) {
            log('Valid UR format, calling onScan...');
            onScan(trimmedData);
          } else {
            log('Invalid format detected');
            alert('Invalid format. Please enter the complete UR code starting with "UR:"');
          }
        } else {
          log('No data entered or empty string');
        }
      } else {
        // For account addresses
        log('Opening address prompt...');
        const address = prompt('Enter XRPL account address (starting with "r"):');
        if (address && address.startsWith('r') && address.length >= 25) {
          onScan(address);
        } else if (address) {
          alert('Invalid XRPL address format');
        }
      }
    } catch (error) {
      console.error('[SimpleQR] Manual entry error:', error);
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
                    <div className="border-2 border-green-400 border-dashed w-48 h-48 rounded-lg flex items-center justify-center">
                      <div className="text-green-400 text-center text-sm font-medium">
                        {isScanning ? 'Scanning for QR code...' : 'Position QR code here'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {isActive && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {isScanning ? 'Hold a QR code in front of the camera' : 'Initializing scanner...'}
                  </p>
                  <Button onClick={manualEntry} variant="outline" className="w-full">
                    {title.includes('Signed Transaction') ? 'Enter Signed Data Manually' : 'Enter Address Manually'}
                  </Button>
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