import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Bug, Lightbulb, Sparkles, MessageSquare, Send, Loader2 } from "lucide-react";
import { submitFeedback } from "../lib/api/feedbackApi";
import type { FeedbackCategory } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserEmail?: string;
  /** Show a toast after submit */
  onResult?: (type: "success" | "error", message: string) => void;
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: typeof Bug; color: string }[] = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "red" },
  { value: "improvement", label: "Need Improvement", icon: Lightbulb, color: "amber" },
  { value: "feature", label: "Feature Request", icon: Sparkles, color: "violet" },
  { value: "custom", label: "Custom / Other", icon: MessageSquare, color: "blue" },
];

const MAX = 4000;

export function FeedbackModal({
  isOpen,
  onClose,
  isDarkMode,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onResult,
}: Props) {
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prefill identity when logged in (reset each open)
  useEffect(() => {
    if (isOpen) {
      setName(currentUserName || "");
      setEmail(currentUserEmail || "");
      setCategory("bug");
      setSubject("");
      setMessage("");
    }
  }, [isOpen, currentUserName, currentUserEmail]);

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
    onResult?.("success", "Thanks! Your feedback was sent to the admins.");
    onClose();
  };

  const card = isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200";
  const label = isDarkMode ? "text-[#8b98a5]" : "text-slate-700";
  const input = isDarkMode
    ? "bg-[#16181c] border-[#2f3336] text-[#e7e9ea] placeholder-[#71767b] focus:border-blue-500"
    : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-blue-500";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl ${card}`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? "border-[#2f3336] bg-[#17181c]" : "border-slate-200 bg-white"}`}>
          <div>
            <h2 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Send Feedback</h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Help us improve Edu51Portal</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-full ${isDarkMode ? "text-slate-400 hover:bg-[#16181c]" : "text-slate-500 hover:bg-slate-100"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Category */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${label}`}>What's this about?</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : isDarkMode
                          ? "border-[#2f3336] text-[#8b98a5] hover:border-[#38444d]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${label}`}>Subject <span className="font-normal opacity-60">(optional)</span></label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary"
              maxLength={120}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none ${input}`}
            />
          </div>

          {/* Message */}
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${label}`}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
              placeholder="Describe the bug, idea, or request in detail…"
              rows={5}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none resize-none ${input}`}
            />
            <p className={`mt-1 text-[11px] text-right ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{message.length}/{MAX}</p>
          </div>

          {/* Contact (so admin can reply) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${label}`}>Your name <span className="font-normal opacity-60">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none ${input}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${label}`}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none ${input}`}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || message.trim().length < 3}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
