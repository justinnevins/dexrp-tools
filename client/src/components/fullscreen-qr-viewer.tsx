import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
      data-testid="fullscreen-qr-viewer"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 rounded-full bg-black/10 hover:bg-black/20 active:bg-black/30 transition-colors z-10"
        style={{ top: 'max(16px, env(safe-area-inset-top))' }}
        aria-label="Close fullscreen view"
        data-testid="close-fullscreen-qr"
      >
        <X className="w-6 h-6 text-black" />
      </button>
      
      <div 
        className="flex items-center justify-center p-4"
        style={{
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
        }}
      >
        <div className="w-full h-full [&>*]:!w-full [&>*]:!h-full [&_img]:!w-full [&_img]:!h-full">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
