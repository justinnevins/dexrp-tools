import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function QRScanner({ onScan, onClose, title = "Scan QR Code", description = "Position the QR code within the camera view" }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Add a small delay to ensure the video element is ready
    timeoutId = setTimeout(() => {
      initScanner();
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopScanning();
    };
  }, [onScan]);

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const requestPermission = async () => {
    try {
      console.log('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setError(null);
      
      // Try to initialize scanner again
      initScanner();
    } catch (err) {
      console.error('Permission request failed:', err);
      setError('Camera permission denied. Please allow camera access in your browser settings.');
      setHasPermission(false);
    }
  };

  const initScanner = async () => {
    if (!videoRef.current) {
      setError('Camera element not ready');
      return;
    }

    try {
      console.log('Starting QR scanner...');
      
      // Create scanner instance
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          onScan(result.data);
          stopScanning();
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 5
        }
      );

      // Start scanning
      await scannerRef.current.start();
      setIsScanning(true);
      setError(null);
      console.log('QR scanner started successfully');

    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
          setHasPermission(false);
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please check your camera permissions.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              {hasPermission === false && (
                <Button onClick={requestPermission} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Grant Camera Permission
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg object-cover"
                  playsInline
                  muted
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <div className="text-white text-center">
                      <CameraOff className="h-8 w-8 mx-auto mb-2" />
                      <div className="text-sm">Initializing camera...</div>
                    </div>
                  </div>
                )}
              </div>
              
              {isScanning && (
                <div className="text-center text-sm text-muted-foreground">
                  Position the QR code within the camera view to scan
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