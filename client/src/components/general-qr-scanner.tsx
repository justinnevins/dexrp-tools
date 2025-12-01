import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, Scan } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { xrplClient } from '@/lib/xrpl-client';

type ScanMode = 'address' | 'generic' | 'ur-code';

interface GeneralQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  mode?: ScanMode;
  title?: string;
  description?: string;
  showKeystoneInstructions?: boolean;
}

/**
 * Extracts an XRPL address from QR data, supporting:
 * - Raw classic addresses (rXXX...)
 * - JSON-wrapped addresses ({ address: 'rXXX...' })
 * - Ripple URI scheme (ripple:rXXX... or ripple:rXXX?param=value)
 * 
 * @param data - Raw QR scan data
 * @returns Extracted address or null if not found
 */
function extractAddressFromQRData(data: string): string | null {
  let trimmed = data.trim();
  
  if (trimmed.toLowerCase().startsWith('ripple:')) {
    trimmed = trimmed.substring(7);
    const questionMarkIndex = trimmed.indexOf('?');
    if (questionMarkIndex > 0) {
      trimmed = trimmed.substring(0, questionMarkIndex);
    }
  }
  
  if (trimmed.startsWith('r') && trimmed.length >= 25 && trimmed.length <= 35) {
    return trimmed;
  }
  
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.address && typeof parsed.address === 'string' && parsed.address.startsWith('r')) {
        return parsed.address;
      }
    } catch {
    }
  }
  
  return null;
}

/**
 * Validates an XRPL address using the xrplClient checksum validation.
 * This ensures full address validation including base58 checksum.
 * 
 * @param address - XRPL address to validate
 * @returns true if valid with correct checksum
 */
function validateXrplAddress(address: string): boolean {
  return xrplClient.isValidAddress(address);
}

const MODE_CONFIG: Record<ScanMode, {
  defaultTitle: string;
  defaultDescription: string;
  manualEntryLabel: string;
  manualEntryPrompt: string;
  errorMessage: string;
}> = {
  address: {
    defaultTitle: 'Scan Account Address',
    defaultDescription: 'Use your camera to scan the QR code or enter manually',
    manualEntryLabel: 'Enter Address Manually',
    manualEntryPrompt: 'Enter XRPL account address (starting with "r"):',
    errorMessage: 'Please enter a valid XRPL address starting with "r"'
  },
  generic: {
    defaultTitle: 'Scan QR Code',
    defaultDescription: 'Position the QR code within the camera view',
    manualEntryLabel: 'Enter Data Manually',
    manualEntryPrompt: 'Enter the QR code data:',
    errorMessage: 'Invalid data'
  },
  'ur-code': {
    defaultTitle: 'Scan Signed Transaction',
    defaultDescription: 'Scan the signed transaction QR from your hardware wallet',
    manualEntryLabel: 'Enter Signed Data Manually',
    manualEntryPrompt: 'Paste the signed transaction UR code (format: UR:BYTES/...):',
    errorMessage: 'Invalid format. Please enter the complete UR code starting with "UR:"'
  }
};

export function GeneralQRScanner({ 
  onScan, 
  onClose, 
  mode = 'generic',
  title,
  description,
  showKeystoneInstructions = false
}: GeneralQRScannerProps) {
  const config = MODE_CONFIG[mode];
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  /**
   * Validates and processes scanned data based on the current mode.
   * For address mode: Extracts address from raw/JSON data and validates checksum.
   * For generic mode: Passes through unchanged.
   * For ur-code mode: Validates UR format.
   * 
   * @param data - Raw scanned QR data
   * @returns Processed/validated data or null if invalid
   */
  const validateAndProcessData = useCallback((data: string): string | null => {
    if (mode === 'address') {
      const address = extractAddressFromQRData(data);
      if (address && validateXrplAddress(address)) {
        return address;
      }
      return null;
    }
    
    if (mode === 'ur-code') {
      if (data.toUpperCase().startsWith('UR:')) {
        return data;
      }
      return null;
    }
    
    return data;
  }, [mode]);

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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
            
            setTimeout(() => {
              startQRDetection();
            }, 500);
          }).catch(() => {
            setError('Failed to start camera playback');
          });
        });
      }

    } catch (err) {
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

  const startQRDetection = () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result: any) => {
          const qrData = (typeof result === 'string' ? result : (result.data || String(result))).trim();
          
          const validatedData = validateAndProcessData(qrData);
          if (validatedData) {
            onScan(validatedData);
            cleanup();
          }
        },
        {
          returnDetailedScanResult: true,
          maxScansPerSecond: 5,
          highlightScanRegion: true,
          highlightCodeOutline: true
        }
      );

      if (scannerRef.current) {
        scannerRef.current.setInversionMode('both');
      }

      scannerRef.current.start().then(() => {
        setIsScanning(true);
      }).catch((err) => {
        setError('Failed to start QR scanner');
      });

    } catch (err) {
      setError('Failed to setup QR detection');
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
    const input = prompt(config.manualEntryPrompt);
    if (input && input.trim()) {
      const validatedData = validateAndProcessData(input.trim());
      if (validatedData) {
        onScan(validatedData);
        cleanup();
      } else {
        alert(config.errorMessage);
      }
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">{displayTitle}</CardTitle>
            <CardDescription className="text-sm">{displayDescription}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-scanner">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {error ? (
            <div className="space-y-4">
              <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">{error}</div>
              <Button onClick={initCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Try Camera Again
              </Button>
              <Button onClick={handleManualEntry} variant="outline" className="w-full">
                {config.manualEntryLabel}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden mx-auto"
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
                    <div className="absolute inset-4 border-2 border-green-400 border-dashed rounded-lg flex items-center justify-center">
                      <span className="text-green-400 text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                        {isScanning ? 'Scanning...' : 'Position QR code here'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {showKeystoneInstructions && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    On your Keystone Pro 3:
                  </p>
                  <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <li>1. Navigate to XRP account</li>
                    <li>2. Display account address QR code</li>
                    <li>3. Position QR code in camera view</li>
                  </ol>
                </div>
              )}

              {isActive && (
                <div className="text-center mb-3">
                  {isScanning ? (
                    <div className="text-green-600 dark:text-green-400 text-sm">
                      Actively scanning for QR codes...
                    </div>
                  ) : (
                    <div className="text-blue-600 dark:text-blue-400 text-sm">
                      Camera ready
                    </div>
                  )}
                </div>
              )}

              {isActive && (
                <Button onClick={handleManualEntry} variant="outline" className="w-full">
                  <Scan className="h-4 w-4 mr-2" />
                  {config.manualEntryLabel}
                </Button>
              )}
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1" data-testid="button-cancel-scanner">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
