import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";

export type WC26Tab = "pick" | "leaderboard" | "matches";

interface WC26HeroBannerProps {
  subtitle?: string;
  /** Kickoff time of the next non-live, non-finished match. Null when there's none left. */
  targetDate: Date | null;
  /** True when a match is currently in play — swaps the countdown for a live indicator. */
  isLive?: boolean;
  liveLabel?: string;
  isDarkMode: boolean;

  /** Optional background video (mp4). Falls back to posterSrc, then to the gradient+logo backdrop. */
  videoSrc?: string;
  /** Optional background image, used as the video poster or as a static backdrop when no video is given. */
  posterSrc?: string;

  pickedTeamName?: string | null;
  pickedTeamLogo?: string | null;
  myPoints?: number;
  myRank?: number | null;
  myLiveScoreLabel?: string | null;

  liveCount: number;
  syncing: boolean;
  onRefresh: () => void;

  tab: WC26Tab;
  onTabChange: (t: WC26Tab) => void;
}

type TimeParts = { days: number; hours: number; minutes: number; seconds: number };

function getTimeParts(target: number): TimeParts {
  const diff = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

function Countdown({ target, isDarkMode }: { target: number; isDarkMode: boolean }) {
  const [parts, setParts] = useState<TimeParts>(() => getTimeParts(target));

  useEffect(() => {
    setParts(getTimeParts(target));
    const id = window.setInterval(() => setParts(getTimeParts(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const segments = [
    { value: parts.days, label: "DD" },
    { value: parts.hours, label: "HH" },
    { value: parts.minutes, label: "MM" },
    { value: parts.seconds, label: "SS" },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 font-mono tabular-nums">
      {segments.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={`flex flex-col items-center rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 backdrop-blur-sm ${
              isDarkMode ? "bg-white/10 text-white" : "bg-black/10 text-black"
            }`}
          >
            <span className="text-base sm:text-lg font-bold leading-none">{pad(s.value)}</span>
            <span className={`text-[9px] mt-0.5 ${isDarkMode ? "text-white/55" : "text-black/50"}`}>{s.label}</span>
          </span>
          {i < segments.length - 1 && (
            <span className={isDarkMode ? "text-white/30" : "text-black/25"}>:</span>
          )}
        </span>
      ))}
    </div>
  );
}

const TABS: { key: WC26Tab; label: string }[] = [
  { key: "pick", label: "Pick Team" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "matches", label: "Matches" },
];

export function WC26HeroBanner({
  subtitle = "Pick your team, track live scores, and climb the leaderboard with your batchmates.",
  targetDate,
  isLive = false,
  liveLabel,
  isDarkMode,
  videoSrc,
  posterSrc,
  pickedTeamName,
  pickedTeamLogo,
  myPoints = 0,
  myRank,
  myLiveScoreLabel,
  liveCount,
  syncing,
  onRefresh,
  tab,
  onTabChange,
}: WC26HeroBannerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
      <div className={`relative max-w-4xl mx-auto overflow-hidden rounded-2xl border ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
      <div className="relative w-full min-h-[190px] sm:min-h-[210px] overflow-hidden">
        {/* Animated backdrop — video > poster image > gradient+logo fallback, all with a slow Ken Burns zoom */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1 }}
          animate={reduceMotion ? { scale: 1 } : { scale: 1.08 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          {videoSrc ? (
            <video
              className="h-full w-full object-cover"
              src={videoSrc}
              poster={posterSrc}
              autoPlay={!reduceMotion}
              muted
              loop
              playsInline
            />
          ) : posterSrc ? (
            <img
              src={posterSrc}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: isDarkMode
                    ? "radial-gradient(circle at 78% 32%, #0a3d62 0%, #061622 45%, #000000 78%)"
                    : "radial-gradient(circle at 78% 32%, #cfe8fb 0%, #eaf5fd 45%, #ffffff 78%)",
                }}
              />
              <img
                src="/FIFA-World-Cup-Logo-2026.png"
                alt=""
                aria-hidden="true"
                className="absolute -right-6 top-1/2 -translate-y-1/2 h-[135%] w-auto object-contain opacity-[0.16] pointer-events-none select-none"
              />
            </>
          )}
        </motion.div>

        {/* Gradient overlay — solid on the text side, fading into the backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: isDarkMode
              ? "linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 42%, transparent 100%)"
              : "linear-gradient(to right, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 42%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col gap-2.5 px-4 sm:px-6 py-4 sm:py-5">
          {/* Top row: logo + title + personal stats  ·  refresh */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/FIFA-World-Cup-Logo-2026.png"
                alt="FIFA World Cup 2026"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`font-bold text-lg sm:text-xl leading-tight ${isDarkMode ? "text-white" : "text-[#0f1419]"}`}>
                    World Cup 2026
                  </h1>
                  {isLive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                      ● LIVE {liveCount > 1 ? liveCount : ""}
                    </span>
                  )}
                </div>
                {pickedTeamName && (
                  <p className={`text-xs flex items-center gap-1.5 ${isDarkMode ? "text-white/60" : "text-black/55"}`}>
                    {pickedTeamLogo && <img src={pickedTeamLogo} alt="" className="w-5 h-4 object-contain inline" />}
                    {pickedTeamName} · {myPoints} pts
                    {myRank ? ` · #${myRank}` : ""}
                    {myLiveScoreLabel && (
                      <span className="text-red-400 font-bold animate-pulse">· {myLiveScoreLabel} LIVE</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {syncing ? (
              <Loader2 className={`w-4 h-4 animate-spin mt-1 ${isDarkMode ? "text-[#1e9df1]" : "text-[#1677cc]"}`} />
            ) : (
              <button
                onClick={onRefresh}
                title="Refresh scores"
                className={`p-1.5 rounded-full transition-colors ${
                  isDarkMode ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black/70"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-[#1e9df1] text-white"
                    : isDarkMode
                    ? "text-white/60 hover:text-white hover:bg-white/5"
                    : "text-black/55 hover:text-black hover:bg-black/5"
                }`}
              >
                {t.label}
                {t.key === "matches" && liveCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {liveCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bottom row: tagline/live info  ·  countdown */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pt-1 mt-auto">
            <motion.p
              className={`max-w-md text-sm leading-relaxed ${isDarkMode ? "text-white/65" : "text-[#0f1419]/65"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {isLive && liveLabel ? liveLabel : subtitle}
            </motion.p>

            {targetDate && !isLive && (
              <motion.div
                className="flex flex-col items-start sm:items-end gap-1.5"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-white/50" : "text-black/45"}`}>
                  Next match in
                </span>
                <Countdown target={targetDate.getTime()} isDarkMode={isDarkMode} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
