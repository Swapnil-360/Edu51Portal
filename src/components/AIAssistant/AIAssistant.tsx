import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  X,
  RotateCcw,
  Mic,
  ChevronDown,
} from "lucide-react";
import { GlassAiPillButton, LiquidGlassOrb } from "../ui/glass-ai-lens";
import { sendChatMessage, getRemainingMessagesToday, type ChatTurn } from "../../lib/api/aiChatApi";

function getPortalRoot(): HTMLElement {
  let el = document.getElementById("ai-assistant-portal");
  if (!el) {
    el = document.createElement("div");
    el.id = "ai-assistant-portal";
    el.style.cssText = [
      "position:fixed",
      "top:0", "left:0", "right:0", "bottom:0",
      "width:100%", "height:100%",
      "z-index:9999",
      "pointer-events:none",
      "overflow:hidden",
    ].join(";");
    document.documentElement.appendChild(el);
  }
  return el;
}

interface Props {
  isDarkMode: boolean;
  userId: string;
}

interface Message {
  role: "user" | "model";
  text: string;
}

const STORAGE_PREFIX = "edu51five_eva51_chat_";
const LEGACY_STORAGE_PREFIX = "edu51five_ai_chat_";
const MAX_HISTORY_TURNS = 10;
const AGENT_CODE = "EVA51";
const AGENT_NAME = "EVA";
const AGENT_TITLE = "Edu Virtual Assistant 51";
const VOICE_PROMPT = "Hey EVA";

const WELCOME: Message = {
  role: "model",
  text: `Hello! I'm ${AGENT_NAME} (${AGENT_CODE}), your ${AGENT_TITLE}. Ask me anything about BUBT faculty contacts, course question archives, intake routines, or the Alumni Hub — or say "${VOICE_PROMPT}"!`,
};

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}_${getTodayString()}`;
}

/**
 * Lightweight inline markdown renderer for model messages
 */
function FormattedMessage({ text, dk }: { text: string; dk: boolean }) {
  const lines = text.split("\n");

  const renderInline = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className={dk ? "text-white font-semibold" : "text-slate-900 font-semibold"}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bullet item
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
              <span className="flex-1">{renderInline(content)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

/**
 * Pulsing Red Dots for EVA51 Bubble Indicator
 */
const TypingIndicator = ({ dk }: { dk: boolean }) => (
  <div
    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-sm w-fit border backdrop-blur-md shadow-sm ${
      dk
        ? "bg-white/[0.06] border-white/[0.1] text-slate-300"
        : "bg-white/80 border-slate-200/80 text-slate-600"
    }`}
  >
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d]"
        animate={{ scale: [1, 1.45, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.85, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-[#ffffff]"
        animate={{ scale: [1, 1.45, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.85, repeat: Infinity, delay: 0.17 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"
        animate={{ scale: [1, 1.45, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.85, repeat: Infinity, delay: 0.34 }}
      />
    </div>
  </div>
);

export function AIAssistant({ isDarkMode: dk, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Monitor window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Daily Reset & Storage Logic
  useEffect(() => {
    if (!userId) return;
    const today = getTodayString();
    const currentKey = getDailyStorageKey(userId);

    // 1. Purge older days' chat storage to enforce daily reset
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (
          k &&
          (k.startsWith(STORAGE_PREFIX) || k.startsWith(LEGACY_STORAGE_PREFIX)) &&
          !k.endsWith(today)
        ) {
          sessionStorage.removeItem(k);
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith(STORAGE_PREFIX) || k.startsWith(LEGACY_STORAGE_PREFIX)) &&
          !k.endsWith(today)
        ) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore storage access errors */
    }

    // 2. Load today's chat if existing
    try {
      const saved = sessionStorage.getItem(currentKey);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always ensure the first message uses current EVA51 branding
          if (parsed[0]?.role === "model") parsed[0] = WELCOME;
          setMessages(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    // Default to clean fresh state for today
    setMessages([WELCOME]);
  }, [userId]);

  // Persist current day's messages
  useEffect(() => {
    if (!userId) return;
    const currentKey = getDailyStorageKey(userId);
    try {
      sessionStorage.setItem(currentKey, JSON.stringify(messages));
    } catch {
      /* storage full */
    }
  }, [messages, userId]);

  // Track scroll position to show 'jump to bottom' button
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceToBottom > 120);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => scrollToBottom("instant"), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!userId) return;
    getRemainingMessagesToday(userId).then(setRemaining).catch(() => {});
  }, [userId]);

  const handleResetChat = () => {
    setMessages([WELCOME]);
    if (!userId) return;
    try {
      sessionStorage.removeItem(getDailyStorageKey(userId));
    } catch {
      /* ignore */
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const history: ChatTurn[] = messages
      .filter((m) => m !== WELCOME)
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setTimeout(() => scrollToBottom("smooth"), 30);

    try {
      const res = await sendChatMessage(text, history);

      // Sanitize output to guarantee EVA51 identity even if edge function was cached
      const sanitizedReply = res.reply
        .replace(/\bEdu51\s*Assistant\b/gi, "EVA (EVA51)")
        .replace(/\bedu51\s*assistant\b/gi, "EVA")
        .replace(/\bEdu51Portal\s*Assistant\b/gi, "EVA51")
        .replace(/\bEdu51Portal\b/gi, "Edu51");

      setMessages((prev) => [...prev, { role: "model", text: sanitizedReply }]);
      setRemaining(res.remaining);
      setDailyLimit(res.limit);
    } catch (err) {
      const isLimit = err instanceof Error && err.message === "daily_limit";
      if (isLimit) setRemaining(0);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: isLimit
            ? `You've reached today's limit of ${dailyLimit} messages. Come back tomorrow!`
            : "Something went wrong on my end. Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom("smooth"), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Responsive Dimensions
  const BTN_SIZE = 44;
  const BTN_RIGHT = isMobile ? 14 : 24;
  const BTN_BOTTOM = isMobile ? 14 : 24;

  const modalStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: BTN_BOTTOM + BTN_SIZE + 10,
        left: 10,
        right: 10,
        width: "calc(100vw - 20px)",
        maxWidth: "calc(100vw - 20px)",
        height: "min(530px, calc(100dvh - 86px))",
        maxHeight: "calc(100dvh - 86px)",
        pointerEvents: "auto",
        zIndex: 9999,
      }
    : {
        position: "fixed",
        bottom: BTN_BOTTOM + BTN_SIZE + 12,
        right: BTN_RIGHT,
        width: 384,
        maxWidth: "calc(100vw - 48px)",
        height: 540,
        maxHeight: "calc(100vh - 120px)",
        pointerEvents: "auto",
        zIndex: 9999,
      };

  return createPortal(
    <>
      {/* ── Frosted Liquid Glass Chat Modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={modalStyle}
          >
            {/* Ambient Pulsing Red Optical Aura Behind Modal */}
            <div
              className="absolute -inset-3 rounded-[32px] pointer-events-none opacity-45"
              style={{
                background: dk
                  ? "radial-gradient(circle at 85% 90%, rgba(239, 68, 68, 0.32) 0%, rgba(220, 38, 38, 0.16) 45%, transparent 75%)"
                  : "radial-gradient(circle at 85% 90%, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 45%, transparent 75%)",
                filter: "blur(22px)",
              }}
            />

            {/* Top Razor-Sharp Optical Red & Chrome Crown Line */}
            <div
              className="absolute top-0 inset-x-8 h-[1px] pointer-events-none z-20"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.85), rgba(255, 255, 255, 0.95), rgba(220, 38, 38, 0.85), transparent)",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.6)",
              }}
            />

            {/* Liquid Frosted Glass Body */}
            <div
              className="relative w-full h-full rounded-[24px] sm:rounded-[24px] flex flex-col overflow-hidden select-text"
              style={{
                background: dk
                  ? "linear-gradient(165deg, rgba(22, 25, 33, 0.94) 0%, rgba(13, 15, 20, 0.97) 50%, rgba(8, 9, 13, 0.99) 100%)"
                  : "linear-gradient(165deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 248, 252, 0.92) 50%, rgba(238, 242, 248, 0.97) 100%)",
                backdropFilter: "blur(32px) saturate(210%)",
                WebkitBackdropFilter: "blur(32px) saturate(210%)",
                border: dk
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
                boxShadow: dk
                  ? "0 24px 64px -12px rgba(0, 0, 0, 0.75), 0 8px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.6)"
                  : "0 24px 60px -12px rgba(15, 23, 42, 0.16), 0 8px 20px -4px rgba(15, 23, 42, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* ── Modal Header ── */}
              <div
                className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b flex-shrink-0 select-none"
                style={{
                  borderColor: dk ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                  background: dk ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.4)",
                }}
              >
                {/* Agent Identity */}
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <LiquidGlassOrb size={isMobile ? 32 : 34} colorScheme="crimson" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2"
                      style={{ borderColor: dk ? "#12141a" : "#ffffff" }}
                      title={`${AGENT_CODE} is online`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13.5px] font-bold tracking-tight ${dk ? "text-white" : "text-slate-900"}`}>
                        {AGENT_NAME}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                          dk
                            ? "bg-red-500/15 text-red-400 border-red-500/25"
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}
                      >
                        {AGENT_CODE}
                      </span>
                    </div>
                    <p className={`text-[10px] sm:text-[10.5px] tracking-normal ${dk ? "text-slate-400" : "text-slate-500"}`}>
                      {AGENT_TITLE}
                    </p>
                  </div>
                </div>

                {/* Controls (Quota, Reset, Close) */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {remaining !== null && (
                    <span
                      title={`${remaining} of ${dailyLimit} daily messages left`}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                        remaining <= 5
                          ? dk
                            ? "text-red-400 bg-red-500/15 border-red-500/30"
                            : "text-red-600 bg-red-50 border-red-200"
                          : dk
                          ? "text-slate-400 bg-white/5 border-white/10"
                          : "text-slate-600 bg-slate-100 border-slate-200"
                      }`}
                    >
                      {remaining}/{dailyLimit} left
                    </span>
                  )}

                  {messages.length > 1 && (
                    <button
                      type="button"
                      onClick={handleResetChat}
                      title="New conversation"
                      aria-label="Reset conversation"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        dk
                          ? "text-slate-400 hover:text-white hover:bg-white/10"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    title="Close"
                    aria-label="Close assistant"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      dk
                        ? "text-slate-400 hover:text-white hover:bg-white/10"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable Chat Messages Area (Fully scrollable to view all past chats) ── */}
              <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto min-h-0 px-3.5 py-3.5 space-y-3.5 overscroll-contain relative"
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  scrollbarColor: dk ? "rgba(255, 255, 255, 0.22) transparent" : "rgba(0, 0, 0, 0.22) transparent",
                }}
              >
                {/* Chat Turns in natural chronological order */}
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "user" ? (
                      <div
                        className="max-w-[85%] px-3.5 py-2.5 rounded-[18px] rounded-br-[4px] text-[13px] leading-relaxed font-normal text-white shadow-sm"
                        style={{
                          background: "linear-gradient(135deg, #ff4d4d 0%, #ef4444 60%, #dc2626 100%)",
                          boxShadow: "0 4px 14px rgba(239, 68, 68, 0.28)",
                        }}
                      >
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 max-w-[92%] sm:max-w-[90%]">
                        <div className="mt-1 flex-shrink-0">
                          <LiquidGlassOrb size={22} colorScheme="crimson" />
                        </div>
                        <div
                          className={`flex-1 px-3.5 py-2.5 rounded-[18px] rounded-tl-[4px] text-[12.5px] leading-relaxed border ${
                            dk
                              ? "bg-white/[0.05] border-white/[0.09] text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                              : "bg-white/90 border-slate-200/90 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                          }`}
                        >
                          <FormattedMessage text={m.text} dk={dk} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2"
                  >
                    <div className="mt-1 flex-shrink-0">
                      <LiquidGlassOrb size={22} colorScheme="crimson" />
                    </div>
                    <TypingIndicator dk={dk} />
                  </motion.div>
                )}
              </div>

              {/* Floating 'Scroll to Bottom' helper if scrolled up */}
              <AnimatePresence>
                {showScrollBottom && (
                  <motion.button
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.9 }}
                    type="button"
                    onClick={() => scrollToBottom("smooth")}
                    className={`absolute bottom-16 right-4 z-30 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-lg cursor-pointer ${
                      dk
                        ? "bg-[#181b22]/90 border-white/15 text-slate-200 hover:text-white"
                        : "bg-white/95 border-slate-200 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <span>Latest</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* ── Frosted Input Dock ── */}
              <div
                className="p-2.5 sm:p-3 border-t flex-shrink-0"
                style={{
                  borderColor: dk ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                  background: dk ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.5)",
                }}
              >
                <div
                  className={`relative flex items-end gap-2 p-1.5 pl-3 rounded-2xl border transition-all duration-200 ${
                    dk
                      ? "bg-black/35 border-white/10 focus-within:border-red-500/50 focus-within:shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_0_16px_rgba(239,68,68,0.15)]"
                      : "bg-white/90 border-slate-200 focus-within:border-red-400 focus-within:shadow-[0_0_0_1px_rgba(239,68,68,0.3),0_0_12px_rgba(239,68,68,0.1)]"
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 84)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${AGENT_NAME} anything or say "${VOICE_PROMPT}"…`}
                    rows={1}
                    className={`flex-1 resize-none bg-transparent border-0 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none text-[13px] sm:text-[12.5px] leading-relaxed py-1 max-h-20 ${
                      dk ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    }`}
                    style={{
                      WebkitTextSizeAdjust: "100%",
                      outline: "none",
                      boxShadow: "none",
                      border: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    aria-label="Send message"
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none shadow-sm cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #ff4d4d 0%, #ef4444 55%, #dc2626 100%)",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-1.5 select-none">
                  <Sparkles className="w-2.5 h-2.5 text-red-400 opacity-60" />
                  <p className="text-[10px] text-center text-slate-500/70">
                    {AGENT_CODE} • {AGENT_TITLE} • Resets daily
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Button: Ask EVA (Mobile Responsive Position) ── */}
      <div
        style={{
          position: "fixed",
          bottom: BTN_BOTTOM,
          right: BTN_RIGHT,
          pointerEvents: "auto",
          zIndex: 9999,
        }}
        className="select-none"
      >
        <GlassAiPillButton
          isOpen={open}
          onClick={() => setOpen((v) => !v)}
          isDarkMode={dk}
          colorScheme="crimson"
          label={`Ask ${AGENT_NAME}`}
        />
      </div>
    </>,
    getPortalRoot()
  );
}

export default AIAssistant;
