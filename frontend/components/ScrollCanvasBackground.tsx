'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollCanvasBackgroundProps {
  totalFrames?: number;
  imageFolder?: string;
  imagePrefix?: string;
  imageExtension?: string;
}

export default function ScrollCanvasBackground({
  totalFrames = 120,
  imageFolder = '/frames',
  imagePrefix = 'ezgif-frame-',
  imageExtension = 'jpg',
}: ScrollCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Targets for interpolation (Lerping) to ensure ultra-smooth transitions
  const scrollProgress = useRef(0); // actual scroll progress (0 to 1)
  const currentProgress = useRef(0);  // lerped scroll progress (0 to 1)

  // 1. Preload sequence images into cache
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    const padZero = (num: number, size: number) => {
      let s = num.toString();
      while (s.length < size) s = '0' + s;
      return s;
    };

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      const fileName = `${imagePrefix}${padZero(i, 3)}.${imageExtension}`;
      img.src = `${imageFolder}/${fileName}`;
      
      img.onload = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / totalFrames) * 100);
        setLoadingProgress(percent);
        
        if (loadedCount === totalFrames) {
          imagesRef.current = loadedImages;
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        // Fallback for errors to keep progress moving
        loadedCount++;
        if (loadedCount === totalFrames) {
          imagesRef.current = loadedImages;
          setImagesLoaded(true);
        }
      };
      
      loadedImages.push(img);
    }
  }, [totalFrames, imageFolder, imagePrefix, imageExtension]);

  // 2. Canvas drawing with "object-fit: cover" calculation
  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adapt to display size
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    // Cover algorithm
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    
    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    } else {
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, width, height);
    
    // Smooth scaling setting
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // 3. Scroll tracking handler
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight <= 0) return;
      
      const pct = Math.max(0, Math.min(1, scrollY / docHeight));
      scrollProgress.current = pct;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [imagesLoaded]);

  // 4. RequestAnimationFrame rendering loop with Lerping
  useEffect(() => {
    if (!imagesLoaded) return;

    let animId: number;

    const tick = () => {
      // Lerp ease factor: 0.08 produces an elegant, slow-scrub glide
      const ease = 0.08;
      const diff = scrollProgress.current - currentProgress.current;
      
      // Stop animating if difference is negligible
      if (Math.abs(diff) > 0.0001) {
        currentProgress.current += diff * ease;
      } else {
        currentProgress.current = scrollProgress.current;
      }

      const frameIndex = Math.floor(currentProgress.current * (totalFrames - 1));
      const frameImg = imagesRef.current[frameIndex];

      if (frameImg && frameImg.complete) {
        drawImage(frameImg);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [imagesLoaded, totalFrames]);

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden pointer-events-none z-0">
      {/* Visual Loader Overlay */}
      {!imagesLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-500 z-50 pointer-events-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-semibold tracking-wider uppercase text-slate-300">
              Initializing Spatial Grid
            </span>
          </div>
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-out" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 mt-2 font-mono">{loadingProgress}% Loaded</span>
        </div>
      )}
      
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full object-cover transition-opacity duration-1000 ${
          imagesLoaded ? 'opacity-40' : 'opacity-0'
        }`}
        style={{
          filter: 'brightness(0.65) contrast(1.1)',
        }}
      />
      
      {/* Neutral black depth overlays (no blue slate tint) */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_30%,rgba(0,0,0,0.85)_95%] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
