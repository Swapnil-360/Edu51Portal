import { useState } from "react";
import { GraduationCap, Users, Network, CalendarClock, Bot, Rocket, ChevronRight, ChevronLeft, X } from "lucide-react";

export const ONBOARDING_SEEN_KEY = "edu51_onboarding_seen_v1";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: <Rocket size={26} strokeWidth={1.75} />,
    title: "Welcome to Edu51Portal",
    description: "A quick tour of what you can do here — takes about 20 seconds.",
    accent: "#ef4444",
  },
  {
    icon: <GraduationCap size={26} strokeWidth={1.75} />,
    title: "Study Materials",
    description: "Browse course materials organized by department, semester, and course — always up to date.",
    accent: "#1e9df1",
  },
  {
    icon: <Users size={26} strokeWidth={1.75} />,
    title: "Teams",
    description: "Build a team with classmates for projects — shared tasks, chat, and files in one place.",
    accent: "#10b981",
  },
  {
    icon: <Network size={26} strokeWidth={1.75} />,
    title: "Network & Alumni",
    description: "Connect with classmates, and reach out to alumni mentors for guidance on courses and careers.",
    accent: "#f59e0b",
  },
  {
    icon: <CalendarClock size={26} strokeWidth={1.75} />,
    title: "Custom Routine",
    description: "Build your own class schedule and keep track of exam routines and academic notices.",
    accent: "#8b5cf6",
  },
  {
    icon: <Bot size={26} strokeWidth={1.75} />,
    title: "AI Study Assistant",
    description: "Stuck on something? Ask the AI assistant anytime — look for its icon in the corner.",
    accent: "#ec4899",
  },
];

interface Props {
  isDarkMode: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ isDarkMode, onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_SEEN_KEY, "1"); } catch { /* ignore */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={finish} />
      <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden ${isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-slate-200"}`}>
        <button
          onClick={finish}
          aria-label="Skip"
          className={`absolute top-3 right-3 p-1.5 rounded-md transition-colors z-10 ${isDarkMode ? "text-slate-500 hover:text-white hover:bg-[#2f3336]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-10 pb-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white"
            style={{
              background: `linear-gradient(135deg, ${current.accent}, ${current.accent}cc)`,
              boxShadow: `0 10px 24px -8px ${current.accent}66`,
            }}
          >
            {current.icon}
          </div>
          <h2 className={`text-lg font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{current.title}</h2>
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{current.description}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                background: i === step ? current.accent : isDarkMode ? "#38444d" : "#cbd5e1",
              }}
            />
          ))}
        </div>

        <div className={`flex items-center justify-between gap-3 px-5 py-4 border-t ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          {isLast ? (
            <button
              onClick={finish}
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-xl text-white transition-colors"
              style={{ background: current.accent }}
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className={`flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${isDarkMode ? "bg-[#2f3336] text-white hover:bg-[#38444d]" : "bg-slate-900 text-white hover:bg-slate-800"}`}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
