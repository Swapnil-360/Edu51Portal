import React, { useState, useEffect } from "react";
import { MessageSquare, Inbox } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import MentorChat from "../MentorChat";
import ChipLoader from "../../ui/ChipLoader";

interface Props {
  isDarkMode: boolean;
  authSession: any;
  userProfile: any;
}

export default function AlumniMessagesPage({ isDarkMode, authSession, userProfile }: Props) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<any | null>(null);

  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";

  const fetchChats = async () => {
    if (!authSession?.user?.id) return;
    try {
      setLoading(true);
      // 1. Get all connections
      const { data: conns, error: connErr } = await supabase
        .from("mentor_connections")
        .select("id, student_id")
        .eq("alumni_id", authSession.user.id);

      if (connErr) throw connErr;

      if (conns && conns.length > 0) {
        // Fetch student profiles
        const studentIds = conns.map((c) => c.student_id);
        const { data: students, error: studentErr } = await supabase
          .from("profiles")
          .select("id, name, major, section, avatar_url, profile_pic")
          .in("id", studentIds);

        if (studentErr) throw studentErr;

        const chatsData = await Promise.all(
          conns.map(async (conn) => {
            const student = students?.find((s) => s.id === conn.student_id);
            if (!student) return null;

            // Fetch last message
            const { data: lastMsg } = await supabase
              .from("mentor_messages")
              .select("message, created_at, sender_id")
              .eq("connection_id", conn.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Fetch unread count from this sender
            const { count: unreadCount } = await supabase
              .from("mentor_messages")
              .select("*", { count: "exact", head: true })
              .eq("connection_id", conn.id)
              .eq("sender_id", conn.student_id)
              .eq("is_read", false);

            return {
              connectionId: conn.id,
              student,
              lastMessage: lastMsg?.message || "No messages yet",
              lastMessageTime: lastMsg?.created_at || null,
              lastMessageSenderId: lastMsg?.sender_id || null,
              unreadCount: unreadCount || 0,
            };
          })
        );

        // Filter nulls and sort by last message time (most recent first)
        const validChats = chatsData
          .filter((c) => c !== null)
          .sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
          });

        setChats(validChats as any[]);
      } else {
        setChats([]);
      }
    } catch (err) {
      console.error("Error fetching chats for alumni:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to messages real-time to update last message/unread count
    const channel = supabase
      .channel("alumni_chat_list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mentor_messages"
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authSession]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border ${cardBg}`}>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${textColor}`}>
          My Conversations
        </h1>
        <p className={`text-sm ${subColor}`}>
          Chat in real-time with BUBT students connected with you for mentorship.
        </p>
      </div>

      {/* Chats List */}
      <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
        <h2 className={`text-lg font-bold ${textColor}`}>Active Conversations</h2>

        {loading ? (
          <div className="flex flex-col items-center gap-1 text-xs text-slate-500 py-10 justify-center">
            <ChipLoader size="md" />
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-slate-500">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
              <MessageSquare size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
            </div>
            <div>
              <p className="text-sm font-bold">No active conversations</p>
              <p className="text-xs max-w-xs mt-1">
                Accepted mentorship requests from students will appear here to start messaging.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col border border-[#2f3336]/20 rounded-xl overflow-hidden divide-y divide-[#2f3336]/20">
            {chats.map((chat) => {
              const hasUnread = chat.unreadCount > 0;
              const isLastMessageMine = chat.lastMessageSenderId === authSession.user.id;
              
              return (
                <div
                  key={chat.connectionId}
                  onClick={() => setActiveChat(chat)}
                  className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-500/5 transition-all ${
                    hasUnread && isDarkMode ? "bg-blue-500/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-purple-500/30 bg-slate-800 flex-shrink-0">
                      {chat.student.avatar_url || chat.student.profile_pic ? (
                        <img src={chat.student.avatar_url || chat.student.profile_pic} alt={chat.student.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-purple-600">
                          {chat.student.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      
                      {/* Blue Dot for unread messages */}
                      {hasUnread && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-[#17181c] rounded-full"></span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${hasUnread ? "text-blue-400" : textColor}`}>
                          {chat.student.name}
                        </p>
                        {chat.lastMessageTime && (
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${hasUnread ? "font-semibold text-[#e7e9ea]" : "text-slate-400"}`}>
                        {isLastMessageMine ? "You: " : ""}{chat.lastMessage}
                      </p>
                    </div>
                  </div>

                  {chat.unreadCount > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1e9df1] text-white">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeChat && (
        <MentorChat
          isDarkMode={isDarkMode}
          currentUserId={authSession.user.id}
          currentUserProfile={userProfile}
          targetUserId={activeChat.student.id}
          targetUserName={activeChat.student.name}
          targetUserAvatar={activeChat.student.avatar_url || activeChat.student.profile_pic}
          isTargetAlumni={false}
          onClose={() => {
            setActiveChat(null);
            fetchChats();
          }}
        />
      )}
    </div>
  );
}
