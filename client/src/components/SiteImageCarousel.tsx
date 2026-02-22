import { useState } from 'react';
import { ImageWithFallback } from './ImageWithFallback';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SiteImageCarouselProps {
  images: (string | null)[];
  siteNumber: string;
  size?: string;
  powered?: boolean;
  className?: string;
}

export function SiteImageCarousel({ images, siteNumber, size, powered, className = "w-32 h-32" }: SiteImageCarouselProps) {
  const validImages = images.filter(Boolean) as string[];
  const [currentIndex, setCurrentIndex] = useState(0);

  if (validImages.length === 0) {
    return (
      <div className={`${className} flex-shrink-0 rounded-lg overflow-hidden bg-gray-100`}>
        <ImageWithFallback
          src=""
          alt={`Site ${siteNumber}`}
          className="w-full h-full object-cover"
          containerClassName="w-full h-full"
          placeholder={{ type: "site", number: siteNumber, size: size || "", powered }}
        />
      </div>
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  return (
    <div className={`${className} flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative group`}>
      <ImageWithFallback
        src={validImages[currentIndex]}
        alt={`Site ${siteNumber} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        containerClassName="w-full h-full"
        placeholder={{ type: "site", number: siteNumber, size: size || "", powered }}
      />
      
      {validImages.length > 1 && (
        <>
          {/* Navigation Arrows */}
          <button
            onClick={prevImage}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-white w-3' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}