import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ExternalLink, ArrowRight } from "lucide-react";

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export type CardStackItem = {
  id: string | number;
  title: string;
  description?: string;
  imageSrc?: string;
  href?: string;
  ctaLabel?: string;
  tag?: string;
};

export type CardStackProps<T extends CardStackItem> = {
  items: T[];

  /** Selected index on mount */
  initialIndex?: number;

  /** How many cards are visible around the active (odd recommended) */
  maxVisible?: number;

  /** Card sizing */
  cardWidth?: number;
  cardHeight?: number;

  /** How much cards overlap each other (0..0.8). Higher = more overlap */
  overlap?: number;

  /** Total fan angle (deg). Higher = wider arc */
  spreadDeg?: number;

  /** 3D / depth feel */
  perspectivePx?: number;
  depthPx?: number;
  tiltXDeg?: number;

  /** Active emphasis */
  activeLiftPx?: number;
  activeScale?: number;
  inactiveScale?: number;

  /** Motion */
  springStiffness?: number;
  springDamping?: number;

  /** Behavior */
  loop?: boolean;
  autoAdvance?: boolean;
  intervalMs?: number;
  pauseOnHover?: boolean;

  /** UI */
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
  isDarkMode?: boolean;

  /** Hooks */
  onChangeIndex?: (index: number, item: T) => void;

  /** Custom renderer (optional) */
  renderCard?: (item: T, state: { active: boolean }) => React.ReactNode;
};

function wrapIndex(n: number, len: number) {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/** Minimal signed offset from active index to i, with wrapping (for loop behavior). */
function signedOffset(i: number, active: number, len: number, loop: boolean) {
  const raw = i - active;
  if (!loop || len <= 1) return raw;

  const alt = raw > 0 ? raw - len : raw + len;
  return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

export function CardStack<T extends CardStackItem>({
  items,
  initialIndex = 0,
  maxVisible = 7,

  cardWidth = 448,
  cardHeight = 280,

  overlap = 0.5,
  spreadDeg = 26,

  perspectivePx = 1100,
  depthPx = 80,
  tiltXDeg = 7,

  activeLiftPx = 20,
  activeScale = 1.03,
  inactiveScale = 0.91,

  springStiffness = 280,
  springDamping = 28,

  loop = true,
  autoAdvance = false,
  intervalMs = 2800,
  pauseOnHover = true,

  showDots = true,
  showArrows = true,
  className,
  isDarkMode = false,

  onChangeIndex,
  renderCard,
}: CardStackProps<T>) {
  const reduceMotion = useReducedMotion();
  const len = items.length;

  const [active, setActive] = React.useState(() => wrapIndex(initialIndex, len));
  const [hovering, setHovering] = React.useState(false);

  React.useEffect(() => {
    setActive((a) => wrapIndex(a, len));
  }, [len]);

  React.useEffect(() => {
    if (!len) return;
    onChangeIndex?.(active, items[active]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Responsive scaling — shrink card size and flatten the 3D fan on narrow
  // screens instead of letting a fixed desktop size overflow/crowd the viewport.
  const [viewportWidth, setViewportWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isSmall = viewportWidth < 480;
  const isMedium = viewportWidth < 768;
  const sizeScale = isSmall
    ? Math.min(1, (viewportWidth - 32) / cardWidth)
    : isMedium
    ? Math.min(1, (viewportWidth - 56) / cardWidth)
    : 1;
  const effectiveCardWidth = Math.round(cardWidth * sizeScale);
  const effectiveCardHeight = Math.max(190, Math.round(cardHeight * sizeScale));
  const effectiveSpreadDeg = isSmall ? spreadDeg * 0.55 : isMedium ? spreadDeg * 0.8 : spreadDeg;
  const effectiveDepthPx = isSmall ? depthPx * 0.5 : depthPx;
  const effectiveTiltXDeg = isSmall ? tiltXDeg * 0.5 : tiltXDeg;

  const maxOffset = Math.max(0, Math.floor(maxVisible / 2));
  const cardSpacing = Math.max(10, Math.round(effectiveCardWidth * (1 - overlap)));
  const stepDeg = maxOffset > 0 ? effectiveSpreadDeg / maxOffset : 0;

  const canGoPrev = loop || active > 0;
  const canGoNext = loop || active < len - 1;

  const prev = React.useCallback(() => {
    if (!len || !canGoPrev) return;
    setActive((a) => wrapIndex(a - 1, len));
  }, [canGoPrev, len]);

  const next = React.useCallback(() => {
    if (!len || !canGoNext) return;
    setActive((a) => wrapIndex(a + 1, len));
  }, [canGoNext, len]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  // Desktop mouse-wheel support — scrolling up/down over the stack swaps
  // cards left/right instead of scrolling the page, so PC users don't need
  // to reach for the arrow buttons. React's onWheel prop attaches a passive
  // listener (preventDefault is silently ignored), so this needs a real
  // native listener with { passive: false } to actually stop page scroll.
  const stageRef = React.useRef<HTMLDivElement>(null);
  const lastWheelRef = React.useRef(0);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // let horizontal trackpad scroll pass through
      e.preventDefault();
      if (Math.abs(e.deltaY) < 8) return;
      const now = Date.now();
      if (now - lastWheelRef.current < 350) return;
      lastWheelRef.current = now;
      if (e.deltaY > 0) next();
      else prev();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [next, prev]);

  React.useEffect(() => {
    if (!autoAdvance || reduceMotion || !len) return;
    if (pauseOnHover && hovering) return;

    const id = window.setInterval(() => {
      if (loop || active < len - 1) next();
    }, Math.max(700, intervalMs));

    return () => window.clearInterval(id);
  }, [autoAdvance, intervalMs, hovering, pauseOnHover, reduceMotion, len, loop, active, next]);

  if (!len) return null;

  const activeItem = items[active]!;

  return (
    <div className={cn("w-full", className)} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {/* Stage */}
      <div
        ref={stageRef}
        className="relative w-full"
        style={{ height: Math.max(300, effectiveCardHeight + 96) }}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="region"
        aria-label="Card selector"
      >
        <div className="absolute inset-0 flex items-end justify-center" style={{ perspective: `${perspectivePx}px` }}>
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const off = signedOffset(i, active, len, loop);
              const abs = Math.abs(off);
              const visible = abs <= maxOffset;
              if (!visible) return null;

              const rotateZ = off * stepDeg;
              const x = off * cardSpacing;
              const y = abs * 8;
              const z = -abs * effectiveDepthPx;

              const isActive = off === 0;
              const scale = isActive ? activeScale : inactiveScale;
              const lift = isActive ? -activeLiftPx : 0;
              const rotateX = isActive ? 0 : effectiveTiltXDeg;
              const zIndex = 100 - abs;

              const dragProps = isActive
                ? {
                    drag: "x" as const,
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.15,
                    onDragEnd: (
                      _e: PointerEvent,
                      info: { offset: { x: number }; velocity: { x: number } },
                    ) => {
                      if (reduceMotion) return;
                      const travel = info.offset.x;
                      const v = info.velocity.x;
                      const threshold = Math.min(140, effectiveCardWidth * 0.2);
                      if (travel > threshold || v > 600) prev();
                      else if (travel < -threshold || v < -600) next();
                    },
                  }
                : {};

              return (
                <motion.div
                  key={item.id}
                  className={cn(
                    "absolute bottom-0 rounded-2xl overflow-hidden will-change-transform select-none",
                    isActive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  )}
                  style={{ width: effectiveCardWidth, height: effectiveCardHeight, zIndex, transformStyle: "preserve-3d" }}
                  initial={reduceMotion ? false : { opacity: 0, y: y + 24, x, rotateZ, rotateX, scale }}
                  animate={{ opacity: 1, x, y: y + lift, rotateZ, rotateX, scale }}
                  transition={{ type: "spring", stiffness: springStiffness, damping: springDamping, mass: 0.85 }}
                  onClick={() => {
                    if (isActive) return;
                    setActive(i);
                  }}
                  {...dragProps}
                >
                  <div className="h-full w-full" style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
                    {renderCard ? renderCard(item, { active: isActive }) : <DefaultFanCard item={item} active={isActive} />}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Arrows + dots navigation */}
      <div className="mt-5 flex items-center justify-center gap-4">
        {showArrows && (
          <button
            onClick={prev}
            disabled={!canGoPrev}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
              isDarkMode
                ? "border-[#2f3336] text-slate-300 hover:text-white hover:border-slate-500 hover:bg-white/5"
                : "border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50",
            )}
            aria-label="Previous"
          >
            <ArrowRight size={15} className="rotate-180" />
          </button>
        )}

        {showDots ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {items.map((it, idx) => {
                const on = idx === active;
                return (
                  <button
                    key={it.id}
                    onClick={() => setActive(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      on ? cn("w-6", isDarkMode ? "bg-white" : "bg-[#17181c]") : cn("w-2", isDarkMode ? "bg-[#38444d] hover:bg-slate-400" : "bg-slate-300 hover:bg-slate-500"),
                    )}
                    aria-label={`Go to ${it.title}`}
                  />
                );
              })}
            </div>
            {activeItem.href ? (
              <a
                href={activeItem.href}
                target="_blank"
                rel="noreferrer"
                className={isDarkMode ? "text-slate-400 hover:text-white transition-colors" : "text-slate-500 hover:text-slate-900 transition-colors"}
                aria-label="Open link"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}

        {showArrows && (
          <button
            onClick={next}
            disabled={!canGoNext}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
              isDarkMode
                ? "border-[#2f3336] text-slate-300 hover:text-white hover:border-slate-500 hover:bg-white/5"
                : "border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50",
            )}
            aria-label="Next"
          >
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function DefaultFanCard({ item }: { item: CardStackItem; active: boolean }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        {item.imageSrc ? (
          <img src={item.imageSrc} alt={item.title} className="h-full w-full object-cover" draggable={false} loading="eager" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm text-slate-400">No image</div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-5">
        <div className="truncate text-lg font-semibold text-white">{item.title}</div>
        {item.description ? <div className="mt-1 line-clamp-2 text-sm text-white/80">{item.description}</div> : null}
      </div>
    </div>
  );
}
