import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      onClose();
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick, { capture: true });
      document.addEventListener('touchend', handleTouch, { capture: true });
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('touchend', handleTouch, { capture: true });
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
