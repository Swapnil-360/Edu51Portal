import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface Props {
  className?: string;
  size?: number; // Size in pixels
}

export default function LottieLoader({ className = "", size = 240 }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] w-full ${className}`}>
      <div style={{ width: size, height: size }} className="relative">
        <DotLottieReact
          src="https://lottie.host/dd34a517-88f5-4b0e-a830-5d2bc6937f48/xwg4J7GxG9.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
}
