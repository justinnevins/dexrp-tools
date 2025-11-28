import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { isNativeApp } from './platform';

export interface QRScanResult {
  data: string;
}

export async function scanQRCode(): Promise<QRScanResult | null> {
  if (isNativeApp()) {
    try {
      // Request camera permissions
      await BarcodeScanner.requestPermissions();
      
      // Start scanning
      const result = await BarcodeScanner.scan();
      
      if (result.barcodes && result.barcodes.length > 0) {
        const barcode = result.barcodes[0];
        return {
          data: barcode.rawValue || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('[QRScanner] Native QR scan failed:', error);
      throw error;
    }
  } else {
    // For web, the components will handle scanning using getUserMedia
    // This function is only for native apps
    throw new Error('Web scanning should use CameraScanner component');
  }
}

export async function checkScannerAvailability(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { supported } = await BarcodeScanner.isSupported();
      return supported;
    } catch {
      return false;
    }
  }
  return false;
}
