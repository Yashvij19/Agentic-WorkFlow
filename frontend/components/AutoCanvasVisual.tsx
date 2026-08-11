'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface AutoCanvasVisualProps {
  totalFrames?: number;
  imageFolder?: string;
  imagePrefix?: string;
  imageExtension?: string;
}

export default function AutoCanvasVisual({
  totalFrames = 120,
  imageFolder = '/frames2',
  imagePrefix = 'ezgif-frame-',
  imageExtension = 'jpg',
}: AutoCanvasVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Animation states
  const currentFrame = useRef(0);
  const direction = useRef(1); // 1 = forward, -1 = backward (ping-pong loop)
  const lastUpdate = useRef(0);
  const frameInterval = 60; // time in ms per frame (approx. 16-18 fps for slow cinematic look)

  // 1. Preload images
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
        setLoadingProgress(Math.round((loadedCount / totalFrames) * 100));
        
        if (loadedCount === totalFrames) {
          imagesRef.current = loadedImages;
          setImagesLoaded(true);
        }
      };
      
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalFrames) {
          imagesRef.current = loadedImages;
          setImagesLoaded(true);
        }
      };

      loadedImages.push(img);
    }
  }, [totalFrames, imageFolder, imagePrefix, imageExtension]);

  // 2. Canvas cover draw
  const drawFrame = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // 3. Animation ticks (Ping-Pong)
  useEffect(() => {
    if (!imagesLoaded) return;

    let animId: number;

    const tick = (timestamp: number) => {
      if (!lastUpdate.current) lastUpdate.current = timestamp;
      const elapsed = timestamp - lastUpdate.current;

      if (elapsed > frameInterval) {
        // Move frame index
        currentFrame.current += direction.current;

        // Ping-pong boundary check
        if (currentFrame.current >= totalFrames - 1) {
          currentFrame.current = totalFrames - 1;
          direction.current = -1; // Reverse play direction
        } else if (currentFrame.current <= 0) {
          currentFrame.current = 0;
          direction.current = 1; // Play forward
        }

        lastUpdate.current = timestamp;
      }

      const activeImage = imagesRef.current[currentFrame.current];
      if (activeImage && activeImage.complete) {
        drawFrame(activeImage);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [imagesLoaded, totalFrames]);

  // Handle resizing canvas
  useEffect(() => {
    const handleResize = () => {
      const activeImage = imagesRef.current[currentFrame.current];
      if (activeImage && activeImage.complete) {
        drawFrame(activeImage);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imagesLoaded]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden glass-panel flex flex-col justify-between p-8 min-h-[400px]">
      {/* Visual Glass Edge Light Effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />
      
      {/* Background canvas */}
      <div className="absolute inset-0 z-0 bg-black/40 pointer-events-none">
        {!imagesLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white z-20">
            <div className="relative flex h-3 w-3 mb-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
              Initializing Grid ({loadingProgress}%)
            </span>
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full object-cover transition-opacity duration-1000 opacity-60" 
            style={{ filter: 'brightness(0.7) contrast(1.1)' }}
          />
        )}
      </div>

      {/* Atmospheric Vignette & Energy wave representations */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_40%,rgba(0,0,0,0.85)_95%] pointer-events-none z-1" />
      
      {/* Top section padding/decoration */}
      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <span className="text-[9px] font-bold tracking-widest text-white/30 uppercase">
          Autonomous Neural Cluster
        </span>
       
      </div>

      {/* Bottom section: Branding and Tagline */}
      <div className="relative z-10 flex flex-col gap-1.5 text-left">
        <Link href="/" className="group/brand flex flex-col gap-1 pointer-events-auto cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white group-hover/brand:text-slate-200 transition-colors">
              FlowAgent
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 group-hover/brand:text-slate-300 transition-colors tracking-wide">
            Where autonomous agents become workflows.
          </span>
        </Link>
      </div>
    </div>
  );
}
