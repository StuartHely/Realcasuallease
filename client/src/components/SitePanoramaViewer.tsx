import { useEffect, useRef } from 'react';

interface SitePanoramaViewerProps {
  imageUrl: string;
  siteNumber?: string;
}

export default function SitePanoramaViewer({ imageUrl, siteNumber }: SitePanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Pannellum from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    script.async = true;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';

    script.onload = () => {
      // @ts-ignore
      if (window.pannellum && containerRef.current) {
        // @ts-ignore
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: 'equirectangular',
          panorama: imageUrl,
          autoLoad: true,
          showZoomCtrl: true,
          mouseZoom: true,
          showFullscreenCtrl: true,
          autoRotate: 0, // Disable auto-rotate
          pitch: 180, // Flip to correct orientation
          yaw: 0,
          hfov: 100,
        });
      }
    };

    document.head.appendChild(link);
    document.head.appendChild(script);

    return () => {
      if (viewerRef.current && viewerRef.current.destroy) {
        viewerRef.current.destroy();
      }
      document.head.removeChild(script);
      document.head.removeChild(link);
    };
  }, [imageUrl]);

  return (
    <div 
      className="w-full mb-6"
      onClick={(e) => e.stopPropagation()} // Prevent click from bubbling up
      onMouseDown={(e) => e.stopPropagation()} // Prevent mousedown from bubbling
    >
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-blue-900">
            📷 360° Panorama View {siteNumber && `- Site ${siteNumber}`}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Click and drag to look around • Scroll to zoom • Fullscreen icon for better view
          </p>
        </div>
        <div 
          ref={containerRef} 
          style={{ width: '100%', height: '400px' }}
        />
      </div>
    </div>
  );
}