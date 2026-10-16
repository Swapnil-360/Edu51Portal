import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

export interface GlassAiLensProps {
  size?: number;
  isOpen?: boolean;
  onClick?: () => void;
  variant?: "pill" | "orb";
  colorScheme?: "chromatic" | "crimson";
  className?: string;
  isDarkMode?: boolean;
}

/**
 * 4-Point AI Star with softly rounded tips matching Apple Intelligence / modern glass lens emblems
 */
function AiGlassStar({
  size = 17,
  colorScheme = "chromatic",
}: {
  size?: number;
  colorScheme?: "chromatic" | "crimson";
}) {
  const gradId = `ai-glass-star-grad-${colorScheme}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      animate={{
        scale: colorScheme === "crimson" ? [1, 1.09, 1] : [1, 1.05, 1],
        rotate: [0, 2, 0, -2, 0],
      }}
      transition={{
        duration: colorScheme === "crimson" ? 2.6 : 4.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        filter:
          colorScheme === "crimson"
            ? "drop-shadow(0 0 6px rgba(255,255,255,0.85)) drop-shadow(0 0 14px rgba(239,68,68,0.75)) drop-shadow(0 0 22px rgba(220,38,38,0.4))"
            : "drop-shadow(0 0 6px rgba(255,255,255,0.75)) drop-shadow(0 0 12px rgba(244,63,94,0.4))",
      }}
    >
      <defs>
        {colorScheme === "chromatic" ? (
          // Exact Apple Intelligence / Reference chromatic prism: Coral-Red top, White center, Azure-Blue bottom
          <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ff453a" />
            <stop offset="28%" stopColor="#fb7185" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        ) : (
          // Edu51 Pure Crimson/Red theme: Flame-Red top, Pure White center, Deep Crimson bottom
          <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="30%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
        )}
      </defs>

      {/* Smooth Concave Star with Soft Rounded Tips */}
      <path
        d="M12 2.6 C12 7.2 7.2 12 2.6 12 C7.2 12 12 16.8 12 21.4 C12 16.8 16.8 12 21.4 12 C16.8 12 12 7.2 12 2.6 Z"
        fill={`url(#${gradId})`}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

/**
 * Liquid Glass Orb with Anisotropic Chrome Bezel and Caustic Reflections
 */
export function LiquidGlassOrb({
  size = 36,
  isOpen = false,
  colorScheme = "chromatic",
}: {
  size?: number;
  isOpen?: boolean;
  colorScheme?: "chromatic" | "crimson";
}) {
  return (
    <div
      className="relative rounded-full flex items-center justify-center select-none flex-shrink-0"
      style={{
        width: size,
        height: size,
        // Anisotropic Liquid Metal Chrome Bezel
        background: `conic-gradient(
          from 215deg at 50% 50%,
          #ffffff 0deg,
          #94a3b8 35deg,
          #334155 70deg,
          #0f172a 110deg,
          #cbd5e1 155deg,
          #ffffff 195deg,
          #94a3b8 230deg,
          #334155 265deg,
          #0f172a 305deg,
          #e2e8f0 340deg,
          #ffffff 360deg
        )`,
        padding: Math.max(2, Math.round(size * 0.055)),
        boxShadow: `
          0 8px 20px -2px rgba(0,0,0,0.65),
          0 2px 6px rgba(0,0,0,0.4),
          inset 0 1px 1.5px rgba(255,255,255,0.9),
          inset 0 -1px 2px rgba(0,0,0,0.8)
        `,
      }}
    >
      {/* Dark Obsidian Optical Glass Cavity */}
      <div
        className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 45% 40%, #1e2229 0%, #111317 55%, #050608 100%)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.9), inset 0 -1px 2px rgba(255,255,255,0.18)",
        }}
      >
        {/* Diffuse Core Color Glow with Pulsing Breathing Animation */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            opacity: colorScheme === "crimson" ? [0.75, 1, 0.75] : [0.7, 0.85, 0.7],
            scale: colorScheme === "crimson" ? [0.95, 1.05, 0.95] : [1, 1.02, 1],
          }}
          transition={{
            duration: colorScheme === "crimson" ? 2.6 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background:
              colorScheme === "crimson"
                ? "radial-gradient(circle at 50% 45%, rgba(239,68,68,0.55) 0%, rgba(220,38,38,0.28) 48%, transparent 72%)"
                : "radial-gradient(circle at 50% 45%, rgba(244,63,94,0.35) 0%, rgba(56,189,248,0.2) 48%, transparent 72%)",
          }}
        />

        {/* Top Caustic Glass Refraction Arc */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 6%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.18) 32%, transparent 60%)",
          }}
        />

        {/* Bottom Secondary Caustic Reflection */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 94%, rgba(255,255,255,0.28) 0%, transparent 45%)",
          }}
        />

        {/* Center Content: Chromatic 4-Point Star OR Close 'X' */}
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close-x"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-10 flex items-center justify-center"
            >
              <X
                style={{ width: Math.round(size * 0.44), height: Math.round(size * 0.44) }}
                className="text-white stroke-[2.4] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
              />
            </motion.div>
          ) : (
            <motion.div
              key="star"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-10 flex items-center justify-center"
            >
              <AiGlassStar size={Math.round(size * 0.46)} colorScheme={colorScheme} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Front Convex Specular Glass Glint */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 35% 18%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.12) 30%, transparent 52%)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Frosted Glass Capsule Pill Button with Animated Glowing Outline Beam
 */
export function GlassAiPillButton({
  isOpen = false,
  onClick,
  isDarkMode = true,
  colorScheme = "crimson",
  label = "Ask EVA",
  className = "",
}: {
  isOpen?: boolean;
  onClick?: () => void;
  isDarkMode?: boolean;
  colorScheme?: "chromatic" | "crimson";
  label?: string;
  className?: string;
}) {
  return (
    <div className="relative group select-none">
      {/* ── Layer 1: Ambient Refracted Edge Glow (Diffused Aura that follows the beam) ── */}
      <div className="absolute -inset-[2px] rounded-full overflow-hidden pointer-events-none opacity-55 group-hover:opacity-90 transition-opacity duration-300">
        <motion.div
          className="absolute -inset-[140%]"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              colorScheme === "chromatic"
                ? `conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    transparent 60deg,
                    rgba(255, 69, 58, 0.5) 100deg,
                    rgba(255, 255, 255, 0.95) 130deg,
                    rgba(56, 189, 248, 0.7) 160deg,
                    transparent 200deg,
                    transparent 360deg
                  )`
                : `conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    transparent 60deg,
                    rgba(239, 68, 68, 0.5) 100deg,
                    rgba(255, 255, 255, 0.95) 130deg,
                    rgba(220, 38, 38, 0.7) 160deg,
                    transparent 200deg,
                    transparent 360deg
                  )`,
            filter: "blur(7px)",
          }}
        />
      </div>

      {/* ── Layer 2: Razor-Sharp Animated Glass Glowing Outline (1.2px optical beam) ── */}
      <div className="absolute -inset-[1px] rounded-full overflow-hidden pointer-events-none p-[1.2px]">
        <motion.div
          className="absolute -inset-[140%]"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              colorScheme === "chromatic"
                ? `conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    transparent 70deg,
                    rgba(255, 69, 58, 0.75) 105deg,
                    rgba(255, 255, 255, 1) 130deg,
                    rgba(56, 189, 248, 0.9) 155deg,
                    transparent 190deg,
                    transparent 360deg
                  )`
                : `conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    transparent 70deg,
                    rgba(239, 68, 68, 0.8) 105deg,
                    rgba(255, 255, 255, 1) 130deg,
                    rgba(220, 38, 38, 0.9) 155deg,
                    transparent 190deg,
                    transparent 360deg
                  )`,
          }}
        />
      </div>

      {/* ── Layer 3: Main Frosted Glass Pill (Resized to golden 44px height) ── */}
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Ask AI Assistant"
        className={[
          "relative z-10 flex items-center gap-2 pl-1 pr-3.5 rounded-full cursor-pointer outline-none transition-shadow",
          isDarkMode
            ? "text-white shadow-[0_12px_28px_rgba(0,0,0,0.65)]"
            : "text-slate-800 shadow-[0_12px_24px_rgba(0,0,0,0.1)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          height: 44,
          background: isDarkMode
            ? "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)"
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.72) 100%)",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          border: isDarkMode
            ? "1px solid rgba(255, 255, 255, 0.16)"
            : "1px solid rgba(255, 255, 255, 0.82)",
          boxShadow: isDarkMode
            ? "inset 0 1px 1px 0 rgba(255,255,255,0.28), inset 0 -1px 1px 0 rgba(0,0,0,0.45)"
            : "inset 0 1px 1px 0 rgba(255,255,255,0.95), inset 0 -1px 1px 0 rgba(0,0,0,0.06)",
        }}
      >
        {/* Top Convex Specular Highlight */}
        <div
          className="absolute inset-x-3 top-0 h-1/2 rounded-t-full pointer-events-none opacity-50"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%)",
          }}
        />

        {/* The Liquid Glass Orb (36px fitted inside 44px pill with 4px padding) */}
        <LiquidGlassOrb size={36} isOpen={isOpen} colorScheme={colorScheme} />

        {/* Typography & Dynamic Chevron */}
        <div className="flex items-center gap-1.5 font-medium tracking-tight pr-0.5">
          <span className="font-semibold text-[13px] tracking-[-0.015em] select-none">
            {isOpen ? "Close" : label}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 stroke-[2.2] ${
              isOpen ? "rotate-180 opacity-90" : "opacity-75 group-hover:translate-y-0.5"
            }`}
          />
        </div>
      </motion.button>
    </div>
  );
}

export default GlassAiPillButton;
