interface FullscreenQRViewerProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenQRViewer({ onClose, children }: FullscreenQRViewerProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-white flex items-center justify-center cursor-pointer"
      onClick={onClose}
      data-testid="fullscreen-qr-viewer"
    >
      <div 
        className="flex items-center justify-center p-4 pointer-events-none [&>*]:!w-full [&>*]:!h-full [&>*]:!max-w-full [&>*]:!max-h-full [&_img]:!w-full [&_img]:!h-full [&_canvas]:!w-full [&_canvas]:!h-full [&_svg]:!w-full [&_svg]:!h-full"
        style={{
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
