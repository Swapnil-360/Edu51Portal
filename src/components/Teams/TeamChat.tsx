import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Trash2, X, MessageSquare } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { listMessages, sendMessage, deleteMessage, setReaction, fetchProfiles } from "../../lib/api/chatApi";
import { createMentionNotification } from "../../lib/api/notificationsApi";
import { TeamMessage, TeamMember } from "../../types/social";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🔥"];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-amber-500",
  "bg-pink-500", "bg-[#1e9df1]", "bg-indigo-500", "bg-rose-500",
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarCircle({ name, avatarUrl, isOwn }: { name: string; avatarUrl: string | null; isOwn: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = isOwn ? "bg-blue-500" : nameToColor(name);
  const initial = name[0]?.toUpperCase() ?? "?";

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-[#2f3336]/30"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${color} text-white`}>
      {initial}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function isSameGroup(a: TeamMessage, b: TeamMessage): boolean {
  if (a.user_id !== b.user_id) return false;
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 5 * 60 * 1000;
}

/**
 * Render message text with @mentions highlighted. Greedy-matches known member
 * names (longest first) right after an "@". The mention of the current user is
 * highlighted more strongly.
 */
function renderMessageContent(
  text: string,
  memberNames: string[],
  myName: string | null,
  isOwn: boolean,
  dark: boolean,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let buffer = "";
  const flush = () => {
    if (buffer) { nodes.push(<span key={`t${key++}`}>{buffer}</span>); buffer = ""; }
  };
  while (i < text.length) {
    if (text[i] === "@") {
      const rest = text.slice(i + 1);
      if (rest.toLowerCase().startsWith("everyone")) {
        flush();
        let mentionClass = "";
        if (isOwn) {
          mentionClass = "text-blue-100 underline decoration-blue-200/50";
        } else if (dark) {
          mentionClass = "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-1.5 py-0.5 rounded";
        } else {
          mentionClass = "bg-amber-100 text-amber-900 border border-amber-200/60 font-bold px-1.5 py-0.5 rounded";
        }
        nodes.push(
          <span key={`m${key++}`} className={mentionClass}>
            @everyone
          </span>
        );
        i += 9;
        continue;
      }
      const matched = memberNames.find((n) => rest.toLowerCase().startsWith(n.toLowerCase()));
      if (matched) {
        flush();
        const isMe = !!myName && matched.toLowerCase() === myName.toLowerCase();
        let mentionClass = "";
        if (isOwn) {
          mentionClass = "text-blue-100 underline decoration-blue-200/50";
        } else if (isMe) {
          mentionClass = dark
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-1.5 py-0.5 rounded"
            : "bg-amber-100 text-amber-900 border border-amber-200/60 font-bold px-1.5 py-0.5 rounded";
        } else {
          mentionClass = dark
            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold px-1.5 py-0.5 rounded"
            : "bg-blue-50 text-blue-700 border border-blue-100 font-semibold px-1.5 py-0.5 rounded";
        }
        nodes.push(
          <span key={`m${key++}`} className={mentionClass}>
            @{matched}
          </span>
        );
        i += 1 + matched.length;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }
  flush();
  return nodes;
}

interface MentionItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  isEveryone?: boolean;
}

interface Props {
  teamId: string;
  teamName: string;
  currentUserId: string;
  isMember: boolean;
  isOwner: boolean;
  isDarkMode: boolean;
  members: TeamMember[];
}

export default function TeamChat({ teamId, teamName, currentUserId, isMember, isOwner, isDarkMode, members }: Props) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<TeamMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [reactionDetailFor, setReactionDetailFor] = useState<string | null>(null);
  // @mention autocomplete
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // userId → display name / avatar, for resolving reactors and mentions
  const memberMap = useMemo(() => {
    const map: Record<string, { name: string; avatar: string | null }> = {};
    for (const m of members) {
      if (m.profile) {
        map[m.user_id] = {
          name: m.profile.name || "Unknown",
          avatar: m.profile.avatar_url || m.profile.profile_pic || null,
        };
      }
    }
    return map;
  }, [members]);

  // Member names sorted longest-first for greedy @mention highlighting
  const memberNames = useMemo(
    () =>
      members
        .map((m) => m.profile?.name?.trim())
        .filter((n): n is string => !!n)
        .sort((a, b) => b.length - a.length),
    [members],
  );

  const mentionCandidates = useMemo<MentionItem[]>(() => {
    const q = mentionQuery.toLowerCase();
    
    const everyoneItem: MentionItem = {
      id: "everyone",
      name: "everyone",
      avatarUrl: null,
      isEveryone: true,
    };

    const memberItems: MentionItem[] = members
      .filter((m) => m.user_id !== currentUserId && m.profile?.name)
      .map((m) => ({
        id: m.user_id,
        name: m.profile!.name,
        avatarUrl: m.profile!.avatar_url || m.profile!.profile_pic || null,
      }));

    const filtered = [everyoneItem, ...memberItems].filter((item) =>
      item.name.toLowerCase().includes(q)
    );

    return filtered.slice(0, 6);
  }, [members, mentionQuery, currentUserId]);

  const myName = memberMap[currentUserId]?.name ?? null;

  const dark = isDarkMode;
  const card = dark ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200";
  const inputBg = dark ? "bg-[#16181c] border-[#38444d] text-white placeholder-[#71767b]" : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b]";
  const sub = dark ? "text-slate-400" : "text-slate-500";
  const msgOwn = dark ? "bg-blue-600 text-white" : "bg-blue-600 text-white";
  const msgOther = dark ? "bg-[#16181c] text-[#e7e9ea] border border-[#2f3336]/50" : "bg-white text-slate-900 border border-slate-200";
  const replyBg = dark ? "bg-[#2f3336]/60" : "bg-slate-100";

  // Scroll only the inner message list — never the page (scrollIntoView would
  // bubble up and yank the whole page, hiding the header when opening Chat).
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    if (!isMember) return;

    const load = async () => {
      setLoading(true);
      const msgs = await listMessages(teamId);
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => scrollToBottom("instant"), 50);
    };
    load();

    // Realtime subscription
    channelRef.current = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` },
        async (payload) => {
          const raw = payload.new as TeamMessage;
          // Fetch sender profile
          const profileMap = await fetchProfiles([raw.user_id]);
          // Fetch reply snippet if needed
          let reply_to: TeamMessage["reply_to"] = null;
          if (raw.reply_to_id) {
            const { data: replyRow } = await supabase
              .from("team_messages")
              .select("id, content, user_id")
              .eq("id", raw.reply_to_id)
              .single();
            if (replyRow) {
              const replyProfiles = await fetchProfiles([(replyRow as any).user_id]);
              reply_to = {
                id: (replyRow as any).id,
                content: (replyRow as any).content,
                sender_name: replyProfiles[(replyRow as any).user_id]?.name ?? "Unknown",
              };
            }
          }
          const msg: TeamMessage = {
            ...raw,
            sender: profileMap[raw.user_id],
            reply_to,
            reactions: [],
          };
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => scrollToBottom(), 50);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_message_reactions" },
        async (payload) => {
          const messageId =
            payload.eventType === "DELETE"
              ? (payload.old as any).message_id
              : (payload.new as any).message_id;
          if (!messageId) return;
          // Re-fetch reactions for this message
          const { data } = await supabase
            .from("team_message_reactions")
            .select("user_id, emoji")
            .eq("message_id", messageId);
          const reactionsMap: Record<string, string[]> = {};
          for (const r of (data ?? []) as any[]) {
            if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];
            reactionsMap[r.emoji].push(r.user_id);
          }
          const reactions = Object.entries(reactionsMap).map(([emoji, user_ids]) => ({ emoji, user_ids }));
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, isMember]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    setMentionActive(false);
    const replied = replyingTo;
    setReplyingTo(null);

    const mySenderProfile = members.find((m) => m.user_id === currentUserId)?.profile;

    // Optimistic: add message to UI immediately so sender sees it right away
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TeamMessage = {
      id: optimisticId,
      team_id: teamId,
      user_id: currentUserId,
      content: trimmed,
      reply_to_id: replied?.id ?? null,
      created_at: new Date().toISOString(),
      sender: mySenderProfile,
      reply_to: replied
        ? { id: replied.id, content: replied.content, sender_name: replied.sender?.name ?? "Unknown" }
        : null,
      reactions: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 30);

    const saved = await sendMessage(teamId, currentUserId, trimmed, replied?.id);

    // Replace optimistic entry with the real DB row (has correct id/created_at)
    if (saved) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...saved, sender: mySenderProfile ?? saved.sender, reply_to: optimistic.reply_to } : m)));

      // Fire mention notifications (non-blocking, best-effort)
      const senderName = memberMap[currentUserId]?.name ?? "Someone";
      const preview = trimmed.length > 100 ? trimmed.slice(0, 97) + "…" : trimmed;
      const isMentionEveryone = trimmed.toLowerCase().includes("@everyone");
      const mentionedMembers = members.filter((m) => {
        if (m.user_id === currentUserId || !m.profile?.name) return false;
        if (isMentionEveryone) return true;
        const name = m.profile.name.trim();
        return new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`, "i").test(trimmed);
      });
      mentionedMembers.forEach((mu) => {
        createMentionNotification({
          userId: mu.user_id,
          actorId: currentUserId,
          actorName: senderName,
          teamId,
          teamName,
          messageId: saved.id,
          preview,
        });
        supabase.functions.invoke("send-push-notification", {
          body: {
            title: isMentionEveryone
              ? `${senderName} mentioned everyone in ${teamName}`
              : `${senderName} mentioned you in ${teamName}`,
            body: preview,
            url: `/teams/${teamId}`,
            targetUserId: mu.user_id,
          },
        });
      });
    } else {
      // Failed — remove the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // Detect "@query" right before the caret and open the mention dropdown
  const detectMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (m) {
      setMentionActive(true);
      setMentionQuery(m[1]);
      setMentionIndex(0);
    } else {
      setMentionActive(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    detectMention(value, e.target.selectionStart ?? value.length);
  };

  const insertMention = (name: string) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? input.length;
    const before = input.slice(0, caret);
    const after = input.slice(caret);
    // Replace the trailing "@query" with "@Name "
    const newBefore = before.replace(/@([^\s@]*)$/, `@${name} `);
    const newValue = newBefore + after;
    setInput(newValue);
    setMentionActive(false);
    setMentionQuery("");
    requestAnimationFrame(() => {
      el?.focus();
      const pos = newBefore.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionActive && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionCandidates[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionActive(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (msg: TeamMessage) => {
    if (!window.confirm("Delete this message?")) return;
    // Optimistic: remove immediately so UI responds instantly
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    const { error } = await deleteMessage(msg.id);
    if (error) {
      // Restore on failure
      setMessages((prev) => {
        const already = prev.some((m) => m.id === msg.id);
        return already ? prev : [...prev, msg].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    setHoveredId(null);
    // Optimistic: apply Messenger semantics locally (one reaction per user, swappable)
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        let reactions = (m.reactions ?? []).map((r) => ({ ...r, user_ids: [...r.user_ids] }));
        const hadSame = reactions.some((r) => r.emoji === emoji && r.user_ids.includes(currentUserId));
        // Remove my id from every emoji on this message
        reactions = reactions
          .map((r) => ({ ...r, user_ids: r.user_ids.filter((id) => id !== currentUserId) }))
          .filter((r) => r.user_ids.length > 0);
        // If I didn't already have this exact emoji, add it (otherwise it's a toggle-off)
        if (!hadSame) {
          const existing = reactions.find((r) => r.emoji === emoji);
          if (existing) existing.user_ids.push(currentUserId);
          else reactions.push({ emoji, user_ids: [currentUserId] });
        }
        return { ...m, reactions };
      }),
    );
    await setReaction(msgId, currentUserId, emoji);
  };

  if (!isMember) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 gap-3 ${sub}`}>
        <MessageSquare className="w-10 h-10 opacity-40" />
        <p className="text-sm font-medium">Join this team to see the chat</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${sub}`}>
        <span className="text-sm">Loading messages…</span>
      </div>
    );
  }

  // Group messages with date separators
  const items: ({ type: "date"; label: string } | { type: "message"; msg: TeamMessage; isFirst: boolean })[] = [];
  let lastDate = "";
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const dateLabel = formatDateLabel(msg.created_at);
    if (dateLabel !== lastDate) {
      items.push({ type: "date", label: dateLabel });
      lastDate = dateLabel;
    }
    const prev = messages[i - 1];
    const isFirst = !prev || !isSameGroup(prev, msg) || formatDateLabel(prev.created_at) !== dateLabel;
    items.push({ type: "message", msg, isFirst });
  }

  return (
    <div className={`flex flex-col rounded-2xl border overflow-hidden ${card}`} style={{ height: "calc(100dvh - 320px)", minHeight: 300 }}>
      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-0.5">
        {messages.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full gap-2 ${sub}`}>
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-sm">No messages yet — say hello!</p>
          </div>
        )}
        {items.map((item, idx) => {
          if (item.type === "date") {
            return (
              <div key={`date-${idx}`} className="flex items-center gap-3 py-3">
                <div className={`flex-1 h-px ${dark ? "bg-[#2f3336]/50" : "bg-slate-200"}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${sub}`}>{item.label}</span>
                <div className={`flex-1 h-px ${dark ? "bg-[#2f3336]/50" : "bg-slate-200"}`} />
              </div>
            );
          }

          const { msg, isFirst } = item;
          const isOwn = msg.user_id === currentUserId;
          // Own messages, or the team owner can delete anyone's. Admins/members cannot delete others'.
          const canDelete = isOwn || isOwner;
          const senderName = msg.sender?.name ?? "Unknown";
          // Prefer Storage avatar_url, fall back to legacy base64 profile_pic
          const avatar = msg.sender?.avatar_url || msg.sender?.profile_pic || null;

          return (
            <div
              key={msg.id}
              className={`flex gap-2 items-end ${isOwn ? "flex-row-reverse" : ""} ${isFirst ? "mt-3" : "mt-0.5"} group relative`}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Avatar — shown for first message in every group, both own and others */}
              <div className="w-8 flex-shrink-0 self-end">
                {isFirst ? (
                  <AvatarCircle name={senderName} avatarUrl={avatar} isOwn={isOwn} />
                ) : (
                  <div className="w-8" />
                )}
              </div>

              <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[68%] sm:max-w-[58%]`}>
                {isFirst && (
                  <span className={`text-[11px] font-semibold mb-1 ${isOwn ? "mr-1 text-right" : "ml-1"} ${dark ? "text-[#8b98a5]" : "text-slate-600"}`}>
                    {isOwn ? "You" : senderName}
                  </span>
                )}

                {/* Reply quote */}
                {msg.reply_to && (
                  <div className={`text-[11px] px-2.5 py-1.5 rounded-lg mb-1 max-w-full border-l-2 border-blue-500 ${replyBg} ${sub} truncate`}>
                    <span className="font-semibold text-blue-500 mr-1">{msg.reply_to.sender_name}</span>
                    {msg.reply_to.content.slice(0, 80)}{msg.reply_to.content.length > 80 ? "…" : ""}
                  </div>
                )}

                {/* Bubble (with Messenger-style reaction badge anchored to bottom corner) */}
                <div className="relative">
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${isOwn ? msgOwn : msgOther} ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"} ${msg.reactions && msg.reactions.length > 0 ? "mb-2.5" : ""}`}>
                    {renderMessageContent(msg.content, memberNames, myName, isOwn, dark)}
                    <span className={`text-[10px] ml-2 opacity-60 align-baseline`}>{formatTime(msg.created_at)}</span>
                  </div>

                  {/* Reaction badge — click to see who reacted (Messenger-style) */}
                  {msg.reactions && msg.reactions.length > 0 && (() => {
                    const total = msg.reactions.reduce((sum, r) => sum + r.user_ids.length, 0);
                    const iReacted = msg.reactions.some((r) => r.user_ids.includes(currentUserId));
                    return (
                      <div className={`absolute -bottom-2.5 ${isOwn ? "right-1" : "left-1"} z-[5]`}>
                        <button
                          onClick={() => setReactionDetailFor(reactionDetailFor === msg.id ? null : msg.id)}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-sm transition-transform hover:scale-105 ${
                            dark
                              ? `bg-[#16181c] border border-[#2f3336] ${iReacted ? "ring-1 ring-blue-500/50" : ""}`
                              : `bg-white border border-slate-200 ${iReacted ? "ring-1 ring-blue-400" : ""}`
                          }`}
                          style={{ outline: dark ? "2px solid rgb(15 23 42)" : "2px solid white" }}
                        >
                          {msg.reactions.slice(0, 3).map((r) => (
                            <span key={r.emoji} className="text-xs leading-none">{r.emoji}</span>
                          ))}
                          {total > 1 && <span className={`text-[10px] font-semibold ml-0.5 ${dark ? "text-[#8b98a5]" : "text-slate-500"}`}>{total}</span>}
                        </button>

                        {/* Who-reacted popover */}
                        {reactionDetailFor === msg.id && (
                          <>
                            <div className="fixed inset-0 z-[8]" onClick={() => setReactionDetailFor(null)} />
                            <div className={`absolute ${isOwn ? "right-0" : "left-0"} bottom-7 z-[9] w-52 max-h-56 overflow-y-auto rounded-xl shadow-xl p-2 ${dark ? "bg-[#16181c] border border-[#2f3336]" : "bg-white border border-slate-200"}`}>
                              {msg.reactions.map((r) => (
                                <div key={r.emoji} className="mb-1.5 last:mb-0">
                                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-1 ${sub}`}>
                                    <span className="text-sm">{r.emoji}</span> {r.user_ids.length}
                                  </div>
                                  <div className="space-y-0.5">
                                    {r.user_ids.map((uid) => (
                                      <div key={uid} className={`text-xs pl-1 ${dark ? "text-[#d9d9d9]" : "text-slate-700"}`}>
                                        {uid === currentUserId ? "You" : (memberMap[uid]?.name ?? "Unknown")}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Hover action toolbar — shown above the bubble, all inline, no floating popup */}
              {hoveredId === msg.id && (
                <div className={`self-center flex items-center gap-0.5 px-1.5 py-1 rounded-xl shadow-md flex-shrink-0 ${dark ? "bg-[#16181c] border border-[#2f3336]" : "bg-white border border-slate-200"}`}>
                  {REACTION_EMOJIS.map((emoji) => {
                    const mineHere = msg.reactions?.some((r) => r.emoji === emoji && r.user_ids.includes(currentUserId));
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg.id, emoji)}
                        className={`text-sm hover:scale-125 transition-transform px-0.5 rounded ${mineHere ? "bg-blue-500/20" : ""}`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                  <div className={`w-px h-4 mx-0.5 ${dark ? "bg-[#38444d]" : "bg-slate-200"}`} />
                  <button
                    onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                    className={`p-1 rounded-lg transition-colors ${dark ? "hover:bg-[#2f3336] text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
                    title="Reply"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(msg)}
                      className={`p-1 rounded-lg transition-colors ${dark ? "hover:bg-red-900/40 text-slate-400 hover:text-red-400" : "hover:bg-red-50 text-slate-500 hover:text-red-500"}`}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyingTo && (
        <div className={`flex items-center gap-2 px-3 py-2 border-t text-xs ${dark ? "border-[#2f3336]/50 bg-[#16181c]/50 text-[#8b98a5]" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          <CornerDownLeft className="w-3 h-3 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-blue-500">{replyingTo.sender?.name ?? "Unknown"}: </span>
            <span className="truncate">{replyingTo.content.slice(0, 80)}{replyingTo.content.length > 80 ? "…" : ""}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="flex-shrink-0 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className={`relative flex items-end gap-2 p-3 border-t ${dark ? "border-[#2f3336]/50" : "border-slate-200"}`}>
        {/* @mention autocomplete dropdown */}
        {mentionActive && mentionCandidates.length > 0 && (
          <div className={`absolute bottom-full left-3 mb-2 w-64 max-h-56 overflow-y-auto rounded-xl shadow-xl z-20 p-1 ${dark ? "bg-[#16181c] border border-[#2f3336]" : "bg-white border border-slate-200"}`}>
            <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${sub}`}>Mention a member</div>
            {mentionCandidates.map((m, idx) => {
              return (
                <button
                  key={m.id}
                  onClick={() => insertMention(m.name)}
                  onMouseEnter={() => setMentionIndex(idx)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    idx === mentionIndex ? (dark ? "bg-[#2f3336]" : "bg-slate-100") : ""
                  }`}
                >
                  {m.isEveryone ? (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs ring-2 ring-[#2f3336]/30">
                      📣
                    </div>
                  ) : (
                    <AvatarCircle name={m.name} avatarUrl={m.avatarUrl} isOwn={false} />
                  )}
                  <span className={`text-sm truncate ${m.isEveryone ? "font-bold text-blue-500" : (dark ? "text-[#d9d9d9]" : "text-slate-700")}`}>
                    {m.isEveryone ? "@everyone" : m.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={(e) => detectMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
          placeholder="Message…  (@ to mention, Enter to send)"
          rows={1}
          className={`flex-1 resize-none px-3 py-2 rounded-xl text-sm border outline-none focus:border-blue-500 transition-colors ${inputBg}`}
          style={{ maxHeight: 120, overflowY: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
