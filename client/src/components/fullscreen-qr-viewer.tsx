import { createPortal } from 'react-dom';
import { useEffect } from 'react';

interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  useEffect(() => {
    const handleClose = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('touchend', handleClose, { capture: true, once: true });
      document.addEventListener('click', handleClose, { capture: true, once: true });
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('touchend', handleClose, { capture: true });
      document.removeEventListener('click', handleClose, { capture: true });
    };
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
      data-testid="fullscreen-qr-viewer"
    >
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
