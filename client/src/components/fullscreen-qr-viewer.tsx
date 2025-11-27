import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = qrContainerRef.current;
    if (!container) return;

    const handleClose = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };

    const timer = setTimeout(() => {
      container.addEventListener('mousedown', handleClose, { capture: true });
      container.addEventListener('touchstart', handleClose, { capture: true });
    }, 100);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('mousedown', handleClose, { capture: true });
      container.removeEventListener('touchstart', handleClose, { capture: true });
    };
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
      data-testid="fullscreen-qr-viewer"
    >
      <div 
        ref={qrContainerRef}
        className="flex items-center justify-center p-4 cursor-pointer"
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
