import { useState, useEffect, ImgHTMLAttributes } from "react";

interface PlaceholderOptions {
  type?: "site" | "shop" | "asset" | "map";
  number?: string;
  size?: string;
  powered?: boolean;
  label?: string;
}

interface ImageWithFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  src: string | null | undefined;
  fallbackText?: string;
  containerClassName?: string;
  placeholder?: PlaceholderOptions;
}

/**
 * Build a placeholder image URL from options
 */
function buildPlaceholderUrl(options: PlaceholderOptions): string {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.number) params.set("number", options.number);
  if (options.size) params.set("size", options.size);
  if (options.powered !== undefined) params.set("powered", String(options.powered));
  if (options.label) params.set("label", options.label);
  return `/api/placeholder?${params.toString()}`;
}

/**
 * Image component with graceful fallback.
 * 1. First tries to load the direct URL
 * 2. If that fails (403, etc.), tries the proxy endpoint
 * 3. If proxy also fails, shows a generated placeholder image
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackText = "Image coming soon",
  containerClassName = "",
  className = "",
  placeholder,
  ...props
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [stage, setStage] = useState<"direct" | "proxy" | "placeholder" | "error">("direct");

  useEffect(() => {
    if (src) {
      setCurrentSrc(src);
      setStage("direct");
    } else {
      // No src provided, go straight to placeholder
      if (placeholder) {
        setCurrentSrc(buildPlaceholderUrl(placeholder));
        setStage("placeholder");
      } else {
        setCurrentSrc(null);
        setStage("error");
      }
    }
  }, [src, placeholder?.type, placeholder?.number, placeholder?.size, placeholder?.powered, placeholder?.label]);

  const handleError = () => {
    if (stage === "direct" && currentSrc && currentSrc.includes("cloudfront.net")) {
      // Try the proxy endpoint
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(currentSrc)}`;
      setCurrentSrc(proxyUrl);
      setStage("proxy");
    } else if ((stage === "direct" || stage === "proxy") && placeholder) {
      // Proxy failed or no cloudfront URL, use placeholder
      setCurrentSrc(buildPlaceholderUrl(placeholder));
      setStage("placeholder");
    } else {
      // All attempts failed
      setStage("error");
    }
  };

  if (stage === "error" || !currentSrc) {
    return (
      <div className={`flex items-center justify-center text-xs text-gray-400 text-center p-2 bg-gray-100 ${containerClassName}`}>
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}

/**
 * Hook for getting an image URL with fallback support.
 * Useful for background images or other non-img use cases.
 */
export function useImageWithFallback(
  src: string | null | undefined,
  placeholder?: PlaceholderOptions
): {
  url: string | null;
  isLoading: boolean;
  hasError: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      if (placeholder) {
        setUrl(buildPlaceholderUrl(placeholder));
        setIsLoading(false);
        setHasError(false);
      } else {
        setUrl(null);
        setIsLoading(false);
        setHasError(true);
      }
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Try direct URL first
    const img = new Image();
    img.onload = () => {
      setUrl(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      // Try proxy
      if (src.includes("cloudfront.net")) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        const proxyImg = new Image();
        proxyImg.onload = () => {
          setUrl(proxyUrl);
          setIsLoading(false);
        };
        proxyImg.onerror = () => {
          // Use placeholder
          if (placeholder) {
            setUrl(buildPlaceholderUrl(placeholder));
            setIsLoading(false);
            setHasError(false);
          } else {
            setUrl(null);
            setIsLoading(false);
            setHasError(true);
          }
        };
        proxyImg.src = proxyUrl;
      } else if (placeholder) {
        setUrl(buildPlaceholderUrl(placeholder));
        setIsLoading(false);
        setHasError(false);
      } else {
        setUrl(null);
        setIsLoading(false);
        setHasError(true);
      }
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, placeholder?.type, placeholder?.number, placeholder?.size, placeholder?.powered, placeholder?.label]);

  return { url, isLoading, hasError };
}
