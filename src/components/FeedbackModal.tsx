import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bug,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  FileText,
  Radio
} from "lucide-react";
import { submitFeedback } from "../lib/api/feedbackApi";
import type { FeedbackCategory } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserEmail?: string;
  initialCategory?: FeedbackCategory;
  /** Show a toast after submit */
  onResult?: (type: "success" | "error", message: string) => void;
}

const CATEGORIES: {
  value: FeedbackCategory;
  label: string;
  subtitle: string;
  icon: typeof Bug;
  activeGlow: string;
  activeBorder: string;
  activeBg: string;
  activeText: string;
  badge: string;
  badgeColor: string;
}[] = [
  {
    value: "bug",
    label: "Bug Report",
    subtitle: "Something broken or glitching",
    icon: Bug,
    activeGlow: "shadow-[0_0_22px_rgba(244,63,94,0.3)]",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-500/10",
    activeText: "text-rose-400",
    badge: "Fix",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
  {
    value: "improvement",
    label: "Improvement",
    subtitle: "UI, speed or experience refinement",
    icon: Lightbulb,
    activeGlow: "shadow-[0_0_22px_rgba(245,158,11,0.3)]",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-500/10",
    activeText: "text-amber-400",
    badge: "Enhance",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    value: "feature",
    label: "Feature Request",
    subtitle: "New capability or creative idea",
    icon: Sparkles,
    activeGlow: "shadow-[0_0_22px_rgba(168,85,247,0.3)]",
    activeBorder: "border-purple-500",
    activeBg: "bg-purple-500/10",
    activeText: "text-purple-400",
    badge: "Vision",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    value: "custom",
    label: "Direct Message",
    subtitle: "General thought, inquiry or praise",
    icon: MessageSquare,
    activeGlow: "shadow-[0_0_22px_rgba(6,182,212,0.3)]",
    activeBorder: "border-cyan-500",
    activeBg: "bg-cyan-500/10",
    activeText: "text-cyan-400",
    badge: "Direct",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
];

const MAX = 4000;

export function FeedbackModal({
  isOpen,
  onClose,
  isDarkMode,
  currentUserId,
  currentUserName,
  currentUserEmail,
  initialCategory = "improvement",
  onResult,
}: Props) {
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Prefill identity when opened
  useEffect(() => {
    if (isOpen) {
      setName(currentUserName || "");
      setEmail(currentUserEmail || "");
      setCategory(initialCategory || "improvement");
      setSubject("");
      setMessage("");
      setSubmitted(false);
    }
  }, [isOpen, currentUserName, currentUserEmail, initialCategory]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!email.trim()) {
      onResult?.("error", "Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      onResult?.("error", "Please enter a valid email address.");
      return;
    }
    if (message.trim().length < 3) {
      onResult?.("error", "Please write a bit more detail (min 3 characters).");
      return;
    }
    setSubmitting(true);
    const { error } = await submitFeedback({
      user_id: currentUserId || null,
      name: name.trim() || null,
      email: email.trim() || null,
      category,
      subject: subject.trim() || null,
      message: message.trim(),
      page_url: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setSubmitting(false);
    if (error) {
      onResult?.("error", "Could not send feedback. Please try again.");
      return;
    }
    setSubmitted(true);
    onResult?.("success", "Thank you! Your feedback has been received.");
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const cardBg = isDarkMode
    ? "bg-[#0b0e17]/95 border-[#1e293b] text-slate-100 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.8),0_0_35px_rgba(30,157,241,0.15)]"
    : "bg-white/95 border-slate-200 text-slate-900 shadow-2xl";

  const inputBg = isDarkMode
    ? "bg-[#0f1320] border-[#222a3d] text-slate-100 placeholder-[#64748b] focus:border-[#1e9df1] focus:ring-2 focus:ring-[#1e9df1]/25"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  const labelColor = isDarkMode ? "text-slate-300" : "text-slate-700";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Glow halo */}
        <div className="absolute -inset-1 sm:max-w-lg pointer-events-none rounded-3xl bg-gradient-to-r from-cyan-500/15 via-blue-500/20 to-purple-600/20 blur-2xl opacity-75" />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border backdrop-blur-xl transition-all ${cardBg}`}
        >
          {/* Top accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-[#1e9df1] to-indigo-500" />

          {/* Header */}
          <div
            className={`sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md ${
              isDarkMode ? "border-[#1e293b]/70 bg-[#0b0e17]/85" : "border-slate-100 bg-white/85"
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  FEEDBACK
                </span>
                <span className={`text-[10px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Direct to CoreWe5 &amp; Founder Swapnil
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                Share Platform Feedback
              </h2>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isDarkMode ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold">Feedback Transmitted</h3>
                <p className={`text-xs max-w-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Your suggestions have been recorded and sent directly to Md. Miftahur Rahman Swapnil and the CoreWe5 engineering workspace.
                </p>
              </motion.div>
            ) : (
              <>
                {/* 1. Category Pill Matrix */}
                <div className="space-y-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${labelColor}`}>
                    Select Transmission Stream
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      const active = category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setCategory(c.value)}
                          className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer outline-none ${
                            active
                              ? `${c.activeBorder} ${c.activeBg} ${c.activeGlow} ring-1 ring-inset ${c.activeBorder}`
                              : isDarkMode
                              ? "border-[#1e293b] bg-[#0f1320]/60 text-slate-400 hover:border-[#334155] hover:bg-[#131929]"
                              : "border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                              active
                                ? `${c.activeBg} ${c.activeText}`
                                : isDarkMode
                                ? "bg-white/5 text-slate-400"
                                : "bg-white text-slate-500 shadow-xs"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-xs font-bold truncate ${active ? (isDarkMode ? "text-white" : "text-slate-900") : ""}`}>
                                {c.label}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono uppercase font-bold border ${c.badgeColor}`}>
                                {c.badge}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-70 truncate mt-0.5">{c.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Subject */}
                <div className="space-y-1.5">
                  <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${labelColor}`}>
                    <FileText className="w-3.5 h-3.5 text-[#1e9df1]" />
                    <span>Summary Subject</span>
                    <span className="text-[10px] font-normal opacity-50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Alumni mentorship filter suggestion or dashboard bug"
                    maxLength={120}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${inputBg}`}
                  />
                </div>

                {/* 3. Detailed Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${labelColor}`}>
                      <Radio className="w-3.5 h-3.5 text-[#1e9df1]" />
                      <span>Message / Technical Details</span>
                    </label>
                    <span className={`text-[10px] font-mono ${message.length > 3500 ? "text-rose-400" : isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {message.length} / {MAX}
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                    placeholder="Describe what happened, what should be improved, or share your creative idea in detail…"
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none resize-none ${inputBg}`}
                  />
                </div>

                {/* 4. Identity & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${labelColor}`}>
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Sender Name</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${labelColor}`}>
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      <span>BUBT / Contact Email *</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. 22235103xxx@cse.bubt.edu.bd"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || message.trim().length < 3}
                    className="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white bg-[#1e9df1] hover:bg-[#1a8cd8] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Feedback...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>

                  <p className={`text-[11px] text-center mt-2.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Your feedback goes directly to Founder Swapnil and the CoreWe5 team.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
export default FeedbackModal;
