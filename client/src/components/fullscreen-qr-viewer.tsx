import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown, { capture: true });
      document.addEventListener('touchstart', handleTouch, { capture: true });
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleMouseDown, { capture: true });
      document.removeEventListener('touchstart', handleTouch, { capture: true });
    };
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
      data-testid="fullscreen-qr-viewer"
    >
      <div 
        className="flex items-center justify-center p-4 pointer-events-none"
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
