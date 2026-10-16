import React, { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export type AvatarColor =
  | "ruby"
  | "obsidian"
  | "red"
  | "blue"
  | "purple"
  | "green";

export type AvatarSize = "sm" | "md" | "lg" | "fab";
export type AvatarShape = "circle" | "square" | "squircle";

export interface AvatarProps {
  blinking?: boolean;
  color?: AvatarColor;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
  onClick?: () => void;
  isOpen?: boolean;
  children?: React.ReactNode;
}

const BLINK_KEYFRAMES = `
@keyframes av-blink {
  0%, 88%, 100% { transform: scaleY(1); }
  93%            { transform: scaleY(0.07); }
  97%            { transform: scaleY(0.07); }
}
`;

const PRESETS: Record<
  AvatarColor,
  {
    gradient: string;
    boxShadow: string;
    iris: string;
    irisGlow: string;
    shine: string;
  }
> = {
  // Preset 1: Deep Metallic Ruby (Rich jewel crimson, zero milky pink, real 3D glass optics)
  ruby: {
    gradient:
      "radial-gradient(circle at 35% 28%, #ff2d55 0%, #e11d48 24%, #be123c 48%, #881337 72%, #4c0519 90%, #1a0208 100%)",
    boxShadow:
      "0 10px 28px -4px rgba(225, 29, 72, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.7)",
    iris: "linear-gradient(180deg, #ffffff 0%, #ffe4e9 100%)",
    irisGlow: "0 0 6px 1px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(255, 45, 85, 0.45)",
    shine:
      "radial-gradient(ellipse at 32% 20%, rgba(255,255,255,.6) 0%, rgba(255,255,255,.12) 30%, transparent 55%)",
  },
  // Default red aliases to ruby
  red: {
    gradient:
      "radial-gradient(circle at 35% 28%, #ff2d55 0%, #e11d48 24%, #be123c 48%, #881337 72%, #4c0519 90%, #1a0208 100%)",
    boxShadow:
      "0 10px 28px -4px rgba(225, 29, 72, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.7)",
    iris: "linear-gradient(180deg, #ffffff 0%, #ffe4e9 100%)",
    irisGlow: "0 0 6px 1px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(255, 45, 85, 0.45)",
    shine:
      "radial-gradient(ellipse at 32% 20%, rgba(255,255,255,.6) 0%, rgba(255,255,255,.12) 30%, transparent 55%)",
  },
  // Preset 2: Stealth Obsidian (Executive graphite-titanium sphere with glowing neon crimson micro-eyes)
  obsidian: {
    gradient:
      "radial-gradient(circle at 35% 28%, #27272a 0%, #18181b 45%, #09090b 85%, #030303 100%)",
    boxShadow:
      "0 10px 28px -4px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(239, 68, 68, 0.35), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.25), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.8)",
    iris: "linear-gradient(180deg, #ff4d6d 0%, #e11d48 100%)",
    irisGlow: "0 0 8px 2px rgba(255, 45, 85, 0.85), 0 0 16px 4px rgba(225, 29, 72, 0.5)",
    shine:
      "radial-gradient(ellipse at 32% 20%, rgba(255,255,255,.35) 0%, rgba(255,255,255,.06) 30%, transparent 50%)",
  },
  blue: {
    gradient:
      "radial-gradient(circle at 35% 28%, #38bdf8 0%, #0284c7 30%, #0369a1 60%, #082f49 90%, #02131e 100%)",
    boxShadow:
      "0 10px 28px -4px rgba(2, 132, 199, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.7)",
    iris: "linear-gradient(180deg, #ffffff 0%, #e0f2fe 100%)",
    irisGlow: "0 0 6px 1px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(56, 189, 248, 0.45)",
    shine:
      "radial-gradient(ellipse at 32% 20%, rgba(255,255,255,.6) 0%, rgba(255,255,255,.12) 30%, transparent 55%)",
  },
  purple: {
    gradient:
      "radial-gradient(circle at 35% 28%, #c084fc 0%, #9333ea 30%, #6b21a8 60%, #3b0764 90%, #170229 100%)",
    boxShadow:
      "0 10px 28px -4px rgba(147, 51, 234, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.7)",
    iris: "linear-gradient(180deg, #ffffff 0%, #f3e8ff 100%)",
    irisGlow: "0 0 6px 1px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(192, 132, 252, 0.45)",
    shine:
      "radial-gradient(ellipse at 32% 20%, rgba(255,255,255,.6) 0%, rgba(255,255,255,.12) 30%, transparent 55%)",
  },
  green: {
    gradient:
      "radial-gradient(circle at 35% 28%, #4ade80 0%, #16a34a 30%, #15803d 60%, #052e16 90%, #021208 100%)",
    boxShadow:
      "0 10px 28px -4px rgba(22, 163, 74, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.7)",
    iris: "linear-gradient(180deg, #ffffff 0%, #dcfce7 100%)",
    irisGlow: "0 0 6px 1px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(74, 222, 128, 0.45)",
    shine:
      "radial-gradient(ellipse at 32% 20%, rgba(255,255,255,.6) 0%, rgba(255,255,255,.12) 30%, transparent 55%)",
  },
};

const SIZE: Record<
  AvatarSize,
  {
    orb: string;
    eye: string;
    eyeGap: string;
    eyeY: string;
    closeSize: string;
  }
> = {
  sm: {
    orb: "w-8 h-8",
    eye: "w-[3px] h-[5px]",
    eyeGap: "gap-1",
    eyeY: "-translate-y-0.5",
    closeSize: "w-3.5 h-3.5",
  },
  md: {
    orb: "w-12 h-12",
    eye: "w-[4px] h-[7px]",
    eyeGap: "gap-2",
    eyeY: "-translate-y-0.5",
    closeSize: "w-4 h-4",
  },
  lg: {
    orb: "w-16 h-16",
    eye: "w-[5px] h-[9px]",
    eyeGap: "gap-2.5",
    eyeY: "-translate-y-1",
    closeSize: "w-5 h-5",
  },
  fab: {
    orb: "w-[52px] h-[52px]",
    eye: "w-[4.5px] h-[8px]",
    eyeGap: "gap-[8px]",
    eyeY: "-translate-y-[1.5px]",
    closeSize: "w-5 h-5",
  },
};

const SHAPE_RADIUS: Record<AvatarShape, string> = {
  circle: "rounded-full",
  square: "rounded-[0%]",
  squircle: "rounded-[40%]",
};

interface EyeProps {
  blinking: boolean;
  delayMs?: number;
  irisGradient: string;
  irisGlow: string;
  sizeClass: string;
}

export function Eye({ blinking, delayMs = 0, irisGradient, irisGlow, sizeClass }: EyeProps) {
  return (
    <div
      className={["rounded-full", sizeClass].filter(Boolean).join(" ")}
      style={{
        background: irisGradient,
        boxShadow: irisGlow,
        ...(blinking
          ? { animation: `av-blink 3.8s ease-in-out ${delayMs}ms infinite` }
          : {}),
      }}
    />
  );
}

export function Avatar({
  blinking = true,
  color = "ruby",
  size = "md",
  shape = "circle",
  className = "",
  onClick,
  isOpen = false,
  children,
}: AvatarProps) {
  const uid = useId();
  const noiseId = `av-n${uid.replace(/\W/g, "")}`;
  const preset = PRESETS[color] ?? PRESETS.ruby;
  const dims = SIZE[size] ?? SIZE.md;

  return (
    <>
      <style>{BLINK_KEYFRAMES}</style>
      <motion.div
        aria-label="Edu51 AI Assistant"
        role={onClick ? "button" : "img"}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        whileTap={{ scaleX: 1.1, scaleY: 0.9 }}
        transition={{
          type: "tween",
          duration: 0.3,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className={[
          "relative flex items-center justify-center overflow-hidden select-none outline-none",
          dims.orb,
          SHAPE_RADIUS[shape],
          onClick ? "cursor-pointer" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          background: preset.gradient,
          boxShadow: preset.boxShadow,
        }}
      >
        {/* Subtle Matte Micro-Texture (0.04 opacity - strictly eliminates chalky grey noise) */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id={noiseId} x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.75"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
        </svg>

        {/* Crisp Focused Specular Glass Glint (top-left realistic light reflection) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: preset.shine }}
        />

        {/* 3D Deep Grounding Shadow on Bottom-Right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 68% 75%, rgba(0,0,0,0.45) 0%, transparent 58%)",
            filter: "blur(2.5px)",
          }}
        />

        {/* Content: Close Icon when open, Luminous Micro-Optic Eyes when closed */}
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="relative z-10 flex items-center justify-center"
            >
              {children || (
                <X className={`${dims.closeSize} text-white stroke-[2.4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="eyes"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={[
                "relative z-10 flex items-center",
                dims.eyeGap,
                dims.eyeY,
              ].join(" ")}
            >
              <Eye
                blinking={blinking}
                delayMs={0}
                irisGradient={preset.iris}
                irisGlow={preset.irisGlow}
                sizeClass={dims.eye}
              />
              <Eye
                blinking={blinking}
                delayMs={80}
                irisGradient={preset.iris}
                irisGlow={preset.irisGlow}
                sizeClass={dims.eye}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default Avatar;
