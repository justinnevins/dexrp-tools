import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface CameraScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function CameraScanner({ onScan, onClose, title = "Scan QR Code", description = "Position the QR code within the camera view" }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initCamera();
    return () => {
      cleanup();
    };
  }, []);

  const initCamera = async () => {
    try {
      console.log('Requesting camera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Wait for video to load and start playing
        video.addEventListener('loadedmetadata', () => {
          video.play().then(() => {
            setIsActive(true);
            setError(null);
            console.log('Video playing successfully');
            
            // Start QR scanner after video is playing
            setTimeout(() => {
              initQRScanner();
            }, 500);
          }).catch(err => {
            console.error('Play failed:', err);
            setError('Failed to start video playback');
          });
        });
      }

    } catch (err) {
      console.error('Camera init failed:', err);
      setError(`Camera access failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const initQRScanner = () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          // Extract address from QR data - it might be a simple address or JSON
          let address = result.data;
          try {
            const parsed = JSON.parse(result.data);
            if (parsed.address) address = parsed.address;
          } catch (e) {
            // Use the raw data if it's not JSON
          }
          onScan(address);
          cleanup();
        },
        {
          highlightScanRegion: false,
          highlightCodeOutline: false,
          maxScansPerSecond: 3,
          returnDetailedScanResult: true
        }
      );

      scannerRef.current.start().then(() => {
        setIsScanning(true);
        console.log('QR scanner active');
      }).catch(err => {
        console.error('QR scanner failed:', err);
        setError('QR scanner initialization failed');
      });

    } catch (err) {
      console.error('QR scanner setup failed:', err);
      setError('Failed to initialize QR scanner');
    }
  };

  const cleanup = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsActive(false);
    setIsScanning(false);
  };

  const handleManualEntry = () => {
    const address = prompt('Enter your XRPL wallet address (starting with "r"):');
    if (address && address.trim().startsWith('r') && address.trim().length >= 25) {
      onScan(address.trim());
    } else if (address) {
      alert('Please enter a valid XRPL address starting with "r"');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {error ? (
            <div className="space-y-4">
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
              <Button onClick={initCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Try Camera Again
              </Button>
              <Button onClick={handleManualEntry} variant="outline" className="w-full">
                Enter Address Manually
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Container */}
              <div 
                className="relative border-2 border-gray-300 rounded-lg overflow-hidden"
                style={{ 
                  width: '100%', 
                  height: '240px',
                  backgroundColor: '#000'
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <div className="text-sm">Initializing camera...</div>
                    </div>
                  </div>
                )}

                {isActive && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                        QR Code Area
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Controls */}
              {isActive ? (
                <div className="space-y-2">
                  <div className="text-center text-sm">
                    {isScanning ? (
                      <span className="text-green-600">✓ Scanning for QR codes...</span>
                    ) : (
                      <span className="text-blue-600">✓ Camera active</span>
                    )}
                  </div>
                  <Button onClick={handleManualEntry} variant="outline" className="w-full">
                    Enter Address Manually Instead
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  Waiting for camera...
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}