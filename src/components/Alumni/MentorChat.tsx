import React, { useState, useEffect, useRef } from "react";
import { X, Send, Check, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { resolveConnectionId } from "../../lib/api/mentorshipApi";
import ChipLoader from "../ui/ChipLoader";

interface MentorChatProps {
  isDarkMode: boolean;
  currentUserId: string;
  currentUserProfile: any;
  targetUserId: string; // The person we are chatting with
  targetUserName: string;
  targetUserAvatar: string | null;
  isTargetAlumni: boolean; // true if target is alumni, false if target is student
  onClose: () => void;
}

export default function MentorChat({
  isDarkMode,
  currentUserId,
  currentUserProfile,
  targetUserId,
  targetUserName,
  targetUserAvatar,
  isTargetAlumni,
  onClose,
}: MentorChatProps) {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200 shadow-xl";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const inputBg = isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-slate-50 border-slate-200";

  // 1. Resolve connection ID
  useEffect(() => {
    const studentId = isTargetAlumni ? currentUserId : targetUserId;
    const alumniId = isTargetAlumni ? targetUserId : currentUserId;
    setLoading(true);
    resolveConnectionId(studentId, alumniId)
      .then((id) => setConnectionId(id))
      .catch((err) => console.error("Error finding connection:", err))
      .finally(() => setLoading(false));
  }, [currentUserId, targetUserId, isTargetAlumni]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. Load messages and subscribe to real-time changes
  useEffect(() => {
    if (!connectionId) return;

    const fetchMessages = async () => {
      try {
        // Mark all unread messages from this connection as read when opening the chat
        await supabase
          .from("mentor_messages")
          .update({ is_read: true })
          .eq("connection_id", connectionId)
          .eq("receiver_id", currentUserId)
          .eq("is_read", false);

        const { data, error } = await supabase
          .from("mentor_messages")
          .select("*")
          .eq("connection_id", connectionId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    };

    fetchMessages();

    // Subscribe to changes in mentor_messages
    const channel = supabase
      .channel(`mentor-messages-${connectionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mentor_messages",
        },
        async (payload) => {
          const newMessage = payload.new;
          if (newMessage.connection_id !== connectionId) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Mark as read if received in real-time
          if (newMessage.receiver_id === currentUserId) {
            await supabase
              .from("mentor_messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mentor_messages",
        },
        (payload) => {
          const updatedMessage = payload.new;
          if (updatedMessage.connection_id !== connectionId) return;

          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, currentUserId]);

  // 3. Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !connectionId) return;

    try {
      setSending(true);
      const textToSend = messageText.trim();
      setMessageText("");

      const { data, error } = await supabase
        .from("mentor_messages")
        .insert({
          connection_id: connectionId,
          sender_id: currentUserId,
          receiver_id: targetUserId,
          message: textToSend,
          is_read: false,
        })
        .select();

      if (error) throw error;

      const insertedMsg = data?.[0];
      if (insertedMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === insertedMsg.id)) return prev;
          return [...prev, insertedMsg];
        });
      }



      // Send standard push notification
      await supabase
        .from("notifications")
        .insert({
          user_id: targetUserId,
          type: "mentor_message",
          title: "New Message",
          body: `${currentUserProfile?.name || "Someone"}: ${textToSend.substring(0, 50)}${textToSend.length > 50 ? "..." : ""}`,
          actor_id: currentUserId,
          actor_name: currentUserProfile?.name || "Someone",
          read: false,
        });

    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-lg h-[80vh] flex flex-col rounded-2xl border ${cardBg}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3336]/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-500/30 bg-slate-800">
              {targetUserAvatar ? (
                <img src={targetUserAvatar} alt={targetUserName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-blue-600">
                  {targetUserName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className={`font-bold text-sm leading-tight ${textColor}`}>{targetUserName}</p>
              <span className={`inline-flex items-center mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                isTargetAlumni
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                  : "bg-purple-500/10 text-purple-400 border border-purple-500/25"
              }`}>
                {isTargetAlumni ? "Connected Mentor" : "Your Mentee"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full hover:bg-slate-200/50 ${isDarkMode ? "hover:bg-[#2f3336] text-white" : "text-slate-600"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 bg-[#000000]/10">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <ChipLoader size="lg" />
            </div>
          ) : !connectionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <p className={`text-sm ${subColor}`}>Connection status error. Make sure you are connected to chat.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 gap-1.5">
              <p className="text-sm font-bold">No messages yet</p>
              <p className="text-xs">Send a message to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMine
                        ? "bg-[#1e9df1] text-white rounded-tr-none"
                        : isDarkMode
                        ? "bg-[#202327] text-white rounded-tl-none border border-[#2f3336]/30"
                        : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200"
                    }`}
                  >
                    <p className="break-words leading-relaxed">{msg.message}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500 px-1">
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMine && (
                      msg.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-500" />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#2f3336]/40 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={!connectionId || sending}
            placeholder="Type a message..."
            className={`flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-[#1e9df1] ${inputBg} ${textColor}`}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || !connectionId || sending}
            className="p-2.5 rounded-full bg-[#1e9df1] text-white hover:bg-[#1677cc] disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
