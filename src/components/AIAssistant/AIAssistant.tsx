import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, BrainCircuit } from "lucide-react";
import { AstronautIcon } from "../ui/animated-cosmic-icons";
import { sendChatMessage, type ChatTurn } from "../../lib/api/aiChatApi";

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

function cls(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

const STORAGE_PREFIX = "edu51five_ai_chat_";
const MAX_HISTORY_TURNS = 10;

const WELCOME: Message = {
  role: "model",
  text: "Hey! Ask me anything about the platform or your coursework — I'll keep it brief.",
};

const BLUE = "#1e9df1";
const BLUE_DARK = "#1677cc";

const TypingIndicator = ({ dk }: { dk: boolean }) => (
  <div className={cls(
    "flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm w-fit border",
    dk ? "bg-[#16181c] border-[#2f3336]" : "bg-slate-100 border-slate-200"
  )}>
    {[0, 1, 2].map((d) => (
      <motion.span
        key={d}
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: BLUE }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.85, repeat: Infinity, delay: d * 0.17 }}
      />
    ))}
  </div>
);

export function AIAssistant({ isDarkMode: dk, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = `${STORAGE_PREFIX}${userId}`;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed[0]?.role === "model") parsed[0] = WELCOME;
        setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch { /* storage full */ }
  }, [messages, storageKey]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    if (open) setTimeout(() => scrollToBottom("instant"), 50);
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const history: ChatTurn[] = messages
      .filter((m) => m !== WELCOME)
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setTimeout(() => scrollToBottom(), 30);

    try {
      const reply = await sendChatMessage(text, history);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err) {
      const isLimit = err instanceof Error && err.message === "daily_limit";
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: isLimit
            ? "You've reached today's limit of 30 messages. Come back tomorrow!"
            : "Something went wrong on my end. Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const BTN_SIZE = 56;
  const BTN_RIGHT = 24;
  const BTN_BOTTOM = 24;
  const PANEL_RIGHT = 24;
  const PANEL_BOTTOM = BTN_BOTTOM + BTN_SIZE + 14;

  return createPortal(
    <>
      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              bottom: PANEL_BOTTOM,
              right: PANEL_RIGHT,
              width: 340,
              maxWidth: "calc(100vw - 48px)",
              height: 480,
              maxHeight: "calc(100vh - 140px)",
              pointerEvents: "auto",
            }}
          >
            {/* Subtle glow — barely visible, just enough depth */}
            <div style={{
              position: "absolute",
              inset: -10,
              borderRadius: 26,
              background: `radial-gradient(ellipse at bottom right, ${BLUE}22, transparent 70%)`,
              pointerEvents: "none",
            }} />

            {/* Panel */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                backgroundColor: dk ? "#17181c" : "#ffffff",
                border: `1px solid ${dk ? "#2f3336" : "#e2e8f0"}`,
                boxShadow: dk
                  ? "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px #2f3336"
                  : "0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px #e2e8f0",
              }}
            >
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: `1px solid ${dk ? "#2f3336" : "#f1f5f9"}`,
                backgroundColor: dk ? "#16181c" : "#f8fafc",
                flexShrink: 0,
              }}>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_DARK})` }}
                    >
                      <BrainCircuit className="w-4 h-4 text-white" />
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2"
                      style={{ borderColor: dk ? "#16181c" : "#f8fafc" }}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: dk ? "#e7e9ea" : "#0f172a", lineHeight: 1.2 }}>
                      Edu51Portal Assistant
                    </p>
                    <p style={{ fontSize: 10.5, color: dk ? "#71767b" : "#94a3b8" }}>
                      Powered by Gemini
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                  style={{ color: dk ? "#71767b" : "#94a3b8" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = dk ? "#2f3336" : "#f1f5f9";
                    (e.currentTarget as HTMLButtonElement).style.color = dk ? "#e7e9ea" : "#334155";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = dk ? "#71767b" : "#94a3b8";
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div ref={listRef} className="flex-1 overflow-y-auto min-h-0" style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.length === 1 && messages[0] === WELCOME && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_DARK})` }}
                    >
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: dk ? "#e7e9ea" : "#334155", marginBottom: 4 }}>
                      Ask me anything
                    </p>
                    <p style={{ fontSize: 11, color: dk ? "#71767b" : "#94a3b8", maxWidth: 180, lineHeight: 1.5 }}>
                      Platform navigation or coursework — I've got you.
                    </p>
                  </div>
                )}

                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                    style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
                  >
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: "9px 13px",
                        borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        fontSize: 14,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        ...(m.role === "user"
                          ? { background: `linear-gradient(135deg,${BLUE},${BLUE_DARK})`, color: "#ffffff" }
                          : dk
                          ? { background: "#16181c", color: "#e7e9ea", border: "1px solid #2f3336" }
                          : { background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }),
                      }}
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <TypingIndicator dk={dk} />
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                padding: "10px 12px",
                borderTop: `1px solid ${dk ? "#2f3336" : "#f1f5f9"}`,
                backgroundColor: dk ? "#17181c" : "#ffffff",
                flexShrink: 0,
              }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl outline-none transition-colors"
                  style={{
                    maxHeight: 96,
                    padding: "9px 13px",
                    fontSize: 12.5,
                    backgroundColor: dk ? "#16181c" : "#f8fafc",
                    border: `1px solid ${dk ? "#2f3336" : "#e2e8f0"}`,
                    color: dk ? "#e7e9ea" : "#0f172a",
                  }}
                  onFocus={e => { e.target.style.borderColor = BLUE; }}
                  onBlur={e => { e.target.style.borderColor = dk ? "#2f3336" : "#e2e8f0"; }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_DARK})` }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>


            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Button ── */}
      <motion.div
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.92 }}
        style={{
          position: "absolute",
          bottom: BTN_BOTTOM,
          right: BTN_RIGHT,
          width: BTN_SIZE,
          height: BTN_SIZE,
          pointerEvents: "auto",
        }}
      >
        {/* Glow */}
        <div style={{
          position: "absolute",
          inset: -10,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BLUE}55, transparent 70%)`,
          filter: "blur(10px)",
          pointerEvents: "none",
        }} />

        <button
          onClick={() => setOpen((v) => !v)}
          title="Edu51Portal Assistant"
          className="relative w-full h-full rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90"
          style={{
            background: dk
              ? `linear-gradient(145deg,#17181c,#16181c)`
              : "#ffffff",
            border: `2px solid ${dk ? "#2f3336" : "#1e9df1"}`,
            boxShadow: `0 4px 20px rgba(30,157,241,0.25)`,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="x"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.16 }}
              >
                <X className={cls("w-5 h-5", dk ? "text-[#e7e9ea]" : "text-slate-600")} />
              </motion.span>
            ) : (
              <motion.span key="msg"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.16 }}
              >
                <AstronautIcon size={26} strokeColor={dk ? "#94A3B8" : "#334155"} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </>,
    getPortalRoot()
  );
}
