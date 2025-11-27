import { createPortal } from 'react-dom';
import { useCallback } from 'react';

interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  const handleQRPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
      data-testid="fullscreen-qr-viewer"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="flex items-center justify-center p-4 cursor-pointer"
        style={{
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
        }}
        onPointerDown={handleQRPointerDown}
        data-testid="qr-close-target"
      >
        <div 
          className="w-full h-full [&>*]:!w-full [&>*]:!h-full [&_img]:!w-full [&_img]:!h-full pointer-events-none"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
