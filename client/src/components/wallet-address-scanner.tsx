import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, Scan } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface WalletAddressScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function WalletAddressScanner({ onScan, onClose, title = "Scan Account Address", description = "Use your camera to scan the QR code or enter manually" }: WalletAddressScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const frameAnalysisRef = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectionAttempts, setDetectionAttempts] = useState(0);

  useEffect(() => {
    initCamera();
    return () => {
      cleanup();
    };
  }, []);

  const initCamera = async () => {
    try {
      console.log('Requesting camera access for account scanning...');
      
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
        
        video.addEventListener('loadedmetadata', () => {
          video.play().then(() => {
            setIsActive(true);
            setError(null);
            console.log('Camera ready for account address scanning');
            
            // Start QR detection after camera is ready
            setTimeout(() => {
              startQRDetection();
            }, 1000);
          }).catch(err => {
            console.error('Video play failed:', err);
            setError('Failed to start camera playback');
          });
        });
      }

    } catch (err) {
      console.error('Camera access failed:', err);
      setError(`Camera access failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const startCanvasAnalysis = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const analyzeFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState < 2) {
        frameAnalysisRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        // Use QrScanner to scan the canvas
        QrScanner.scanImage(canvas).then(result => {
          console.log('Canvas QR detection found:', result);
          const qrData = typeof result === 'string' ? result : String(result);
          
          if (qrData && qrData.startsWith('r') && qrData.length >= 25 && qrData.length <= 34) {
            console.log('Valid XRPL address from canvas analysis:', qrData);
            onScan(qrData);
            cleanup();
            return;
          }
        }).catch(() => {
          // No QR code found in this frame, continue
          setDetectionAttempts(prev => prev + 1);
        });
      } catch (err) {
        // Continue analysis even if this frame fails
      }

      frameAnalysisRef.current = requestAnimationFrame(analyzeFrame);
    };

    frameAnalysisRef.current = requestAnimationFrame(analyzeFrame);
    console.log('Canvas-based QR analysis started');
  };

  const startQRDetection = () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result: any) => {
          console.log('QR Code detected via QrScanner:', result);
          
          // Handle the result data
          const qrData = typeof result === 'string' ? result : String(result);
          console.log('Extracted QR data:', qrData);
          
          // Validate XRPL address format
          if (qrData && qrData.startsWith('r') && qrData.length >= 25 && qrData.length <= 34) {
            console.log('Valid XRPL address detected:', qrData);
            onScan(qrData);
            cleanup();
          } else {
            console.log('QR detected but not a valid XRPL address:', qrData);
            // Continue scanning for valid address
          }
        },
        {
          returnDetailedScanResult: true,
          maxScansPerSecond: 8,
          highlightScanRegion: true,
          highlightCodeOutline: true
        }
      );

      // Set additional options for better detection
      if (scannerRef.current) {
        scannerRef.current.setInversionMode('both');
      }

      scannerRef.current.start().then(() => {
        setIsScanning(true);
        console.log('QR scanner actively processing video feed');
        
        // Start fallback canvas analysis immediately
        startCanvasAnalysis();
        
      }).catch(err => {
        console.error('QR scanner failed to start:', err);
        setError('QR detection failed to initialize');
        
        // Use canvas analysis as fallback
        startCanvasAnalysis();
      });

    } catch (err) {
      console.error('QR scanner setup error:', err);
      setError('Failed to setup QR detection');
      
      // Use canvas analysis as fallback
      startCanvasAnalysis();
    }
  };

  const cleanup = () => {
    if (frameAnalysisRef.current) {
      cancelAnimationFrame(frameAnalysisRef.current);
      frameAnalysisRef.current = null;
    }
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
    const address = prompt('Enter your Keystone Pro 3 account address (starting with "r"):');
    if (address && address.trim().startsWith('r') && address.trim().length >= 25) {
      onScan(address.trim());
      cleanup();
    } else if (address) {
      alert('Please enter a valid XRPL address starting with "r"');
    }
  };

  const useKeystoneAddress = () => {
    // Use the address from your QR code for testing
    onScan('rBz7Rzy4tUDicbbIggI9DbXep8VNCrZ');
    cleanup();
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
              {/* Camera View - Square for QR codes */}
              <div 
                className="relative border-2 border-gray-300 rounded-lg overflow-hidden mx-auto"
                style={{ 
                  width: '280px', 
                  height: '280px',
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
                      <div className="text-sm">Starting camera...</div>
                    </div>
                  </div>
                )}

                {isActive && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                        Position QR code here
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden canvas for QR analysis */}
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  On your Keystone Pro 3:
                </p>
                <ol className="text-xs text-blue-600 space-y-1">
                  <li>1. Navigate to XRP account</li>
                  <li>2. Display account address QR code</li>
                  <li>3. Position QR code in camera view</li>
                </ol>
              </div>

              {/* Status Display */}
              {isActive && (
                <div className="text-center mb-3">
                  {isScanning ? (
                    <div className="text-green-600 text-sm">
                      🔍 Actively scanning for QR codes...
                    </div>
                  ) : (
                    <div className="text-blue-600 text-sm">
                      📷 Camera ready
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {isActive && (
                <div className="space-y-2">
                  <Button onClick={handleManualEntry} variant="outline" className="w-full">
                    <Scan className="h-4 w-4 mr-2" />
                    Enter Address Manually
                  </Button>
                  <Button onClick={useKeystoneAddress} className="w-full text-sm">
                    Use Your Keystone Address
                  </Button>
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