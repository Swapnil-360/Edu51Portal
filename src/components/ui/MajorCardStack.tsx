import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MajorCardItem {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  tags: { label: string; color?: string }[];
  accentGradient: string;
  glowColor?: string;      // hex for the active-card glow ring
  locked?: boolean;
  isUserMajor?: boolean;
  onClick: () => void;
}

interface MajorCardStackProps {
  items: MajorCardItem[];
  initialIndex?: number;
  isDarkMode?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapIndex(n: number, len: number) {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

function signedOffset(i: number, active: number, len: number) {
  const raw = i - active;
  const alt = raw > 0 ? raw - len : raw + len;
  return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

// ── Card visual ───────────────────────────────────────────────────────────────

function MajorCard({ item, active }: { item: MajorCardItem; active: boolean }) {
  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {/* Full-bleed cover image */}
      <img
        src={item.imageSrc}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        loading="eager"
      />

      {/* Deep gradient overlay — clear at top, near-black at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/30 to-transparent" />

      {/* Subtle top darkening so badges stay legible */}
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent" />

      {/* ── Top badges ────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        {item.isUserMajor ? (
          <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-2.5 py-[5px] rounded-full shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Your Major
          </div>
        ) : (
          <span />
        )}

        {item.locked && (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 text-white/65 text-[10px] font-semibold px-2.5 py-[5px] rounded-full">
            <Lock size={9} strokeWidth={2.5} />
            Restricted
          </div>
        )}
      </div>

      {/* ── Bottom content ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="px-4 pt-1 pb-3">
          <h3 className="text-[21px] font-black text-white leading-tight tracking-tight drop-shadow-md">
            {item.title}
          </h3>
          <p className="text-[11px] text-white/70 font-semibold mt-0.5 tracking-widest uppercase drop-shadow">
            {item.subtitle}
          </p>

          {/* Tags + arrow */}
          <div className="flex items-center justify-between gap-3 mt-3">
            <div className="flex flex-wrap gap-1.5 min-w-0 overflow-hidden">
              {item.tags.map((tag) => (
                <span
                  key={tag.label}
                  className="text-[10px] font-bold text-white bg-black/35 backdrop-blur-sm border border-white/15 px-2.5 py-[3px] rounded-full tracking-wide whitespace-nowrap drop-shadow"
                >
                  {tag.label}
                </span>
              ))}
            </div>

            {/* CTA arrow */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                item.locked
                  ? "bg-white/8 text-white/20 border border-white/8"
                  : active
                  ? "bg-white text-slate-900"
                  : "bg-white/15 backdrop-blur-sm text-white/55 border border-white/12"
              }`}
            >
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Accent stripe */}
        <div className={`h-[3px] w-full ${item.accentGradient}`} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MajorCardStack({
  items,
  initialIndex = 0,
  isDarkMode = false,
}: MajorCardStackProps) {
  const reduceMotion = useReducedMotion();
  const len = items.length;

  const [active, setActive] = React.useState(() => wrapIndex(initialIndex, len));

  React.useEffect(() => {
    setActive((a) => wrapIndex(a, len));
  }, [len]);

  // Responsive card dimensions
  const [cardWidth, setCardWidth] = React.useState(448);
  const [cardHeight, setCardHeight] = React.useState(280);

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setCardWidth(Math.min(w - 32, 340));
        setCardHeight(230);
      } else if (w < 768) {
        setCardWidth(Math.min(w - 48, 400));
        setCardHeight(255);
      } else {
        setCardWidth(448);
        setCardHeight(280);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxOffset = 1;
  const overlap = 0.50;
  const cardSpacing = Math.round(cardWidth * (1 - overlap));
  const spreadDeg = 13;
  const depthPx = 80;
  const tiltXDeg = 7;
  const activeLiftPx = 20;

  const prev = () => setActive((a) => wrapIndex(a - 1, len));
  const next = () => setActive((a) => wrapIndex(a + 1, len));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  if (!len) return null;

  return (
    <div className="w-full">
      {/* Stage */}
      <div
        className="relative w-full"
        style={{ height: cardHeight + 72 }}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="region"
        aria-label="Major selection cards"
      >
        <div
          className="absolute inset-0 flex items-end justify-center"
          style={{ perspective: "1100px" }}
        >
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const off = signedOffset(i, active, len);
              const abs = Math.abs(off);
              if (abs > maxOffset) return null;

              const isActive = off === 0;
              const rotateZ = off * spreadDeg;
              const x = off * cardSpacing;
              const y = abs * 10;
              const z = -abs * depthPx;
              const scale = isActive ? 1.03 : 0.91;
              const lift = isActive ? -activeLiftPx : 0;
              const rotateX = isActive ? 0 : tiltXDeg;
              const zIndex = 100 - abs;

              const glowColor = item.glowColor ?? "#6366f1";
              const boxShadow = isActive
                ? `0 0 0 1.5px ${glowColor}50, 0 24px 56px -8px ${glowColor}30, 0 8px 24px -4px rgba(0,0,0,0.55)`
                : `0 8px 28px -8px rgba(0,0,0,0.40)`;

              const dragProps = isActive
                ? {
                    drag: "x" as const,
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.15,
                    onDragEnd: (
                      _e: PointerEvent,
                      info: { offset: { x: number }; velocity: { x: number } }
                    ) => {
                      if (reduceMotion) return;
                      const t = info.offset.x;
                      const v = info.velocity.x;
                      const threshold = cardWidth * 0.22;
                      if (t > threshold || v > 500) prev();
                      else if (t < -threshold || v < -500) next();
                    },
                  }
                : {};

              return (
                <motion.div
                  key={item.id}
                  className={`absolute bottom-0 rounded-2xl overflow-hidden will-change-transform ${
                    isActive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                  }`}
                  style={{
                    width: cardWidth,
                    height: cardHeight,
                    zIndex,
                    transformStyle: "preserve-3d",
                    boxShadow,
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: y + 30, x, rotateZ, scale }
                  }
                  animate={{ opacity: 1, x, y: y + lift, rotateZ, rotateX, scale }}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  onClick={() => {
                    if (isActive) item.onClick();
                    else setActive(i);
                  }}
                  {...dragProps}
                >
                  <div
                    style={{
                      transform: `translateZ(${z}px)`,
                      transformStyle: "preserve-3d",
                      height: "100%",
                    }}
                  >
                    <MajorCard item={item} active={isActive} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Dot nav + prev/next arrows */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          onClick={prev}
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
            isDarkMode
              ? "border-[#2f3336] text-slate-400 hover:text-white hover:border-slate-500"
              : "border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400"
          }`}
          aria-label="Previous"
        >
          <ArrowRight size={13} className="rotate-180" />
        </button>

        <div className="flex items-center gap-2">
          {items.map((it, idx) => {
            const on = idx === active;
            return (
              <button
                key={it.id}
                onClick={() => setActive(idx)}
                aria-label={`Select ${it.title}`}
                className="transition-all duration-200"
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    on
                      ? `h-2 w-6 ${isDarkMode ? "bg-white" : "bg-[#17181c]"}`
                      : `h-2 w-2 ${isDarkMode ? "bg-[#38444d] hover:bg-slate-400" : "bg-slate-300 hover:bg-slate-500"}`
                  }`}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={next}
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
            isDarkMode
              ? "border-[#2f3336] text-slate-400 hover:text-white hover:border-slate-500"
              : "border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400"
          }`}
          aria-label="Next"
        >
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Swipe hint */}
      <p
        className={`text-center text-xs mt-2 ${
          isDarkMode ? "text-slate-500" : "text-slate-400"
        }`}
      >
        Tap the front card to enter · swipe to browse
      </p>
    </div>
  );
}
