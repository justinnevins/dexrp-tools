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
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors z-10"
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
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex items-center justify-center [&>*]:!w-full [&>*]:!h-full [&>*]:!max-w-full [&>*]:!max-h-full [&_img]:!w-full [&_img]:!h-full [&_canvas]:!w-full [&_canvas]:!h-full [&_svg]:!w-full [&_svg]:!h-full"
          style={{ width: '100%', height: '100%' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
