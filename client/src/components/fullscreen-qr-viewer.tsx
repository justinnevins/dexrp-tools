import { X } from 'lucide-react';

interface FullscreenQRViewerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ isOpen, onClose, children }: FullscreenQRViewerProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
      onClick={onClose}
      data-testid="fullscreen-qr-viewer"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors z-10"
        aria-label="Close fullscreen view"
        data-testid="close-fullscreen-qr"
      >
        <X className="w-6 h-6 text-black" />
      </button>
      
      <div 
        className="w-[min(100vw,100vh)] h-[min(100vw,100vh)] p-4 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
