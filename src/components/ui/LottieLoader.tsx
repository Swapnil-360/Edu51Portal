import React from 'react';

interface Props {
  className?: string;
  size?: number; // Size in pixels
}

export default function LottieLoader({ className = "", size = 120 }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] w-full gap-4 ${className}`}>
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
        {/* Outer glowing pulsing circle */}
        <div className="absolute inset-0 rounded-full border-2 border-[#ef4444]/20 animate-ping" />
        
        {/* Inner rotating gradient ring */}
        <div className="w-16 h-16 rounded-full border-4 border-t-[#ef4444] border-r-transparent border-b-[#8b5cf6] border-l-transparent animate-spin" />
        
        {/* Tiny core logo highlight */}
        <div className="absolute text-[#ef4444] font-extrabold text-lg select-none">
          51
        </div>
      </div>
      <p className="text-sm font-semibold tracking-wide text-slate-400 animate-pulse">
        Loading Edu51Portal...
      </p>
    </div>
  );
}
