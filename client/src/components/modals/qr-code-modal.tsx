import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, X } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData?: string;
  title: string;
  description: string;
  onScanComplete?: (data: string) => void;
}

export function QRCodeModal({ 
  isOpen, 
  onClose, 
  qrData, 
  title, 
  description,
  onScanComplete 
}: QRCodeModalProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startScanner = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowScanner(true);
    } catch (error) {
      console.error('[QRCode] Camera access failed:', error);
    }
  };

  const stopScanner = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowScanner(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-6 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          {qrData && !showScanner && (
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-muted-foreground/30">
              <div className="w-48 h-48 mx-auto bg-black/5 rounded-lg flex items-center justify-center">
                <QrCode className="w-24 h-24 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                QR Code would be displayed here in production
              </p>
            </div>
          )}

          {showScanner && (
            <div className="bg-black rounded-xl p-4">
              <div className="w-48 h-48 mx-auto bg-black/50 rounded-lg flex items-center justify-center">
                <Camera className="w-24 h-24 text-white/60" />
              </div>
              <p className="text-xs text-white/80 mt-2">
                Camera scanner would be active here
              </p>
            </div>
          )}

          <div className="space-y-2">
            {!showScanner && onScanComplete && (
              <Button
                onClick={startScanner}
                className="w-full"
                variant="outline"
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Response QR Code
              </Button>
            )}

            {showScanner && (
              <Button
                onClick={stopScanner}
                className="w-full"
                variant="destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Scanner
              </Button>
            )}

            <Button
              onClick={onClose}
              className="w-full"
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}