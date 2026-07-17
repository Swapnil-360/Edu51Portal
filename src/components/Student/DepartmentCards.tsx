import { Lock, Clock, Cpu, Zap, Shirt, Building2, Database, Briefcase, BookOpen, TrendingUp, Scale, ArrowRight, LucideIcon } from "lucide-react";
import { CardStack, CardStackItem } from "../ui/card-stack";

const ICONS: Record<string, LucideIcon> = { Cpu, Zap, Shirt, Building2, Database, Briefcase, BookOpen, TrendingUp, Scale };

export interface DepartmentCardItem extends CardStackItem {
  subtitle: string;
  icon: keyof typeof ICONS;
  tags: { label: string }[];
  accentGradient: string;
  glowColor: string;
  videoSrc?: string;
  locked: boolean;
  isOwn: boolean;
  comingSoon: boolean;
  onClick: () => void;
}

interface DepartmentCardsProps {
  items: DepartmentCardItem[];
  initialIndex?: number;
  isDarkMode?: boolean;
}

function cls(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

/** Card face for a department — shows a banner image once one is provided
 * (item.imageSrc), otherwise falls back to a gradient + icon so the carousel
 * looks complete before real department photos/videos exist. */
function DepartmentCardFace({ item, active }: { item: DepartmentCardItem; active: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {item.videoSrc ? (
        <video
          src={item.videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : item.imageSrc ? (
        <img src={item.imageSrc} alt={item.title} className="absolute inset-0 w-full h-full object-cover" draggable={false} loading="eager" />
      ) : (
        <div className={`absolute inset-0 ${item.accentGradient}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
      {!item.imageSrc && !item.videoSrc && (
        <Icon className="absolute -right-6 -bottom-6 opacity-15" style={{ width: 170, height: 170, color: "#fff" }} strokeWidth={1.25} />
      )}

      {/* ── Top badges ────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        {item.isOwn ? (
          <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-2.5 py-[5px] rounded-full shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Your Department
          </div>
        ) : (
          <span />
        )}

        {item.comingSoon ? (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 text-white/75 text-[10px] font-semibold px-2.5 py-[5px] rounded-full">
            <Clock size={9} strokeWidth={2.5} />
            Coming Soon
          </div>
        ) : item.locked ? (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 text-white/65 text-[10px] font-semibold px-2.5 py-[5px] rounded-full">
            <Lock size={9} strokeWidth={2.5} />
            Restricted
          </div>
        ) : null}
      </div>

      {/* ── Bottom content ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0">
        <button
          type="button"
          onClick={() => { if (active) item.onClick(); }}
          className="w-full text-left px-4 pt-1 pb-3"
        >
          <h3 className="text-[19px] sm:text-[21px] font-black text-white leading-tight tracking-tight drop-shadow-md">
            {item.title}
          </h3>
          <p className="text-[11px] text-white/70 font-semibold mt-0.5 tracking-widest uppercase drop-shadow">
            {item.subtitle}
          </p>

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

            <div
              className={cls(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
                item.comingSoon || item.locked
                  ? "bg-white/8 text-white/20 border border-white/8"
                  : active
                  ? "bg-white text-slate-900"
                  : "bg-white/15 backdrop-blur-sm text-white/55 border border-white/12",
              )}
            >
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </button>

        <div className={`h-[3px] w-full ${item.accentGradient}`} />
      </div>
    </div>
  );
}

/** Department picker — a swipeable stacked-card carousel (built on the generic
 * CardStack primitive), one card per BUBT program. */
export function DepartmentCards({ items, initialIndex = 0, isDarkMode = false }: DepartmentCardsProps) {
  return (
    <CardStack
      items={items}
      initialIndex={initialIndex}
      isDarkMode={isDarkMode}
      maxVisible={3}
      overlap={0.5}
      spreadDeg={13}
      showDots
      renderCard={(item, state) => <DepartmentCardFace item={item} active={state.active} />}
    />
  );
}
