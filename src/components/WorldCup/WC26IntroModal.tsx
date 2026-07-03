import { useEffect, useState } from "react";
import { X, Trophy, Zap, Users, ArrowRight } from "lucide-react";
import { WC26_TEAMS, teamLogoUrl } from "../../lib/wc26Teams";

interface Props {
  isOpen: boolean;
  onPickTeam: () => void;
  onDismiss: () => void;
  isDarkMode: boolean;
}

// Featured teams to preview (spread across groups)
const PREVIEW_TEAMS = ["BRA","ARG","ESP","FRA","GER","ENG","POR","USA","MAR","JPN","KOR","MEX"];

export function WC26IntroModal({ isOpen, onPickTeam, onDismiss, isDarkMode }: Props) {
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setTimeout(() => setAnimIn(true), 30);
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible) return null;

  const previewTeams = PREVIEW_TEAMS.map(code => WC26_TEAMS.find(t => t.code === code)).filter(Boolean);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-400 ${
        animIn ? "bg-black/70 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={onDismiss}
    >
      <style>{`
        @keyframes introSlideUp { from{transform:translateY(40px) scale(0.95);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes logoBounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes teamFloat    { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-4px) rotate(3deg)} }
        @keyframes glowPulse    { 0%,100%{box-shadow:0 0 20px 4px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 40px 10px rgba(34,197,94,0.6)} }
        @keyframes scrollLogos  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl transition-all duration-400 ${
          animIn ? "opacity-100" : "opacity-0 translate-y-8"
        }`}
        style={{ animation: animIn ? "introSlideUp 0.4s ease forwards" : "none" }}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 ${isDarkMode
          ? "bg-gradient-to-b from-slate-900 via-slate-900 to-green-950"
          : "bg-gradient-to-b from-white via-white to-green-50"
        }`} />

        {/* Top green accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-yellow-400 to-green-400" />

        {/* Close */}
        <button
          onClick={onDismiss}
          className={`absolute top-4 right-4 z-10 p-1.5 rounded-full transition-colors ${
            isDarkMode ? "text-slate-500 hover:text-white hover:bg-[#2f3336]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative px-6 pt-8 pb-6">
          {/* FIFA Logo + headline */}
          <div className="flex flex-col items-center text-center mb-5">
            <img
              src="/FIFA-World-Cup-Logo-2026.png"
              alt="FIFA World Cup 2026"
              className="w-24 h-24 object-contain mb-3"
              style={{ animation: "logoBounce 2.5s ease-in-out infinite" }}
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-bold text-green-400 uppercase tracking-widest">Live Event</span>
            </div>
            <h2 className={`text-2xl font-black leading-tight mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              World Cup 2026<br />
              <span className="text-green-500">is happening now!</span>
            </h2>
            <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Pick your favourite team, earn points as they win and score goals, and compete with your classmates on the leaderboard!
            </p>
          </div>

          {/* Scrolling team logos */}
          <div className="overflow-hidden mb-5 -mx-2">
            <div
              className="flex gap-3 w-max"
              style={{ animation: "scrollLogos 18s linear infinite" }}
            >
              {[...previewTeams, ...previewTeams].map((team, i) => team && (
                <div
                  key={`${team.code}-${i}`}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border ${
                    isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-slate-200"
                  }`}
                  style={{ animation: `teamFloat ${1.8 + (i % 4) * 0.3}s ease-in-out infinite` }}
                >
                  <img src={teamLogoUrl(team.logo)} alt={team.name} className="w-10 h-7 object-contain" />
                  <span className={`text-[8px] font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {team.code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Points system */}
          <div className={`flex items-center justify-center gap-4 mb-5 py-3 px-4 rounded-2xl ${
            isDarkMode ? "bg-[#16181c]/60" : "bg-slate-100"
          }`}>
            <div className="flex items-center gap-1.5 text-center">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <div>
                <p className={`text-base font-black text-green-500`}>+3</p>
                <p className={`text-[9px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Win</p>
              </div>
            </div>
            <div className={`w-px h-8 ${isDarkMode ? "bg-[#2f3336]" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5 text-center">
              <Zap className="w-4 h-4 text-blue-400" />
              <div>
                <p className={`text-base font-black text-blue-400`}>+1</p>
                <p className={`text-[9px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Draw</p>
              </div>
            </div>
            <div className={`w-px h-8 ${isDarkMode ? "bg-[#2f3336]" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5 text-center">
              <span className="text-lg">⚽</span>
              <div>
                <p className={`text-base font-black text-orange-400`}>+1</p>
                <p className={`text-[9px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Per goal</p>
              </div>
            </div>
            <div className={`w-px h-8 ${isDarkMode ? "bg-[#2f3336]" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5 text-center">
              <Users className="w-4 h-4 text-purple-400" />
              <div>
                <p className={`text-base font-black text-purple-400`}>#1</p>
                <p className={`text-[9px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Leaderboard</p>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <button
            onClick={onPickTeam}
            className="w-full py-3.5 rounded-2xl font-semibold text-white tracking-wide uppercase text-[13px] flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{ animation: "glowPulse 2s ease-in-out infinite", background: "linear-gradient(135deg, #16a34a, #15803d)", letterSpacing: "0.08em" }}
          >
            Pick My Team & Join the Leaderboard
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onDismiss}
            className={`w-full mt-2.5 py-2 text-xs font-medium transition-colors ${
              isDarkMode ? "text-slate-500 hover:text-[#8b98a5]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
