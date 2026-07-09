import { useState, useEffect } from "react";
import { ArrowLeft, GraduationCap, SearchX, Inbox, Calendar, MessageSquare } from "lucide-react";
import { useAlumni } from "../../hooks/useAlumni";
import AlumniFilter from "./AlumniFilter";
import AlumniCard from "./AlumniCard";
import { supabase } from "../../lib/supabase";
import MentorChat from "./MentorChat";

interface Props {
  isDarkMode: boolean;
  isLoggedIn: boolean;
  onViewProfile: (id: string) => void;
  onRegisterClick: () => void;
  onClose: () => void;
  authSession: any;
  unreadMsgCount?: number;
}

export default function AlumniDirectoryPage({
  isDarkMode,
  isLoggedIn,
  onViewProfile,
  onRegisterClick,
  onClose,
  authSession,
  unreadMsgCount = 0,
}: Props) {
  const [search, setSearch] = useState("");
  const [major, setMajor] = useState("All");
  const [mentorshipOnly, setMentorshipOnly] = useState(false);

  const [activeTab, setActiveTab] = useState("directory");
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);

  const fetchMyRequests = async () => {
    if (!authSession?.user?.id) return;
    try {
      setMyRequestsLoading(true);
      const { data, error } = await supabase
        .from("mentorship_requests")
        .select("*")
        .eq("student_id", authSession.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        if (data.length > 0) {
          const alumniIds = Array.from(new Set(data.map((r: any) => r.alumni_id)));
          const { data: alumniProfiles } = await supabase
            .from("alumni_profiles")
            .select("id, full_name")
            .in("id", alumniIds);

          const alumniMap = new Map(alumniProfiles?.map((ap: any) => [ap.id, ap.full_name]) || []);

          const enriched = data.map((r: any) => ({
            ...r,
            alumni_name: alumniMap.get(r.alumni_id) || "Alumni Member"
          }));

          setMyRequests(enriched);
        } else {
          setMyRequests([]);
        }
      }
    } catch (err) {
      console.error("Error fetching my requests:", err);
    } finally {
      setMyRequestsLoading(false);
    }
  };

  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [chatTarget, setChatTarget] = useState<any | null>(null);

  const fetchConversations = async () => {
    if (!authSession?.user?.id) return;
    try {
      setLoadingConvs(true);
      const { data: conns, error: connErr } = await supabase
        .from("mentor_connections")
        .select("id, alumni_id")
        .eq("student_id", authSession.user.id);

      if (connErr) throw connErr;

      if (conns && conns.length > 0) {
        const alumniIds = conns.map((c) => c.alumni_id);
        const { data: alumni, error: alumniErr } = await supabase
          .from("alumni_profiles")
          .select("id, full_name, job_title, company_name, major, graduation_year, avatar_url")
          .in("id", alumniIds);

        if (alumniErr) throw alumniErr;

        const convsData = await Promise.all(
          conns.map(async (conn) => {
            const mentor = alumni?.find((a) => a.id === conn.alumni_id);
            if (!mentor) return null;

            const { data: lastMsg } = await supabase
              .from("mentor_messages")
              .select("message, created_at, sender_id")
              .eq("connection_id", conn.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { count: unreadCount } = await supabase
              .from("mentor_messages")
              .select("*", { count: "exact", head: true })
              .eq("connection_id", conn.id)
              .eq("sender_id", conn.alumni_id)
              .eq("is_read", false);

            return {
              connectionId: conn.id,
              mentor,
              lastMessage: lastMsg?.message || "No messages yet",
              lastMessageTime: lastMsg?.created_at || null,
              lastMessageSenderId: lastMsg?.sender_id || null,
              unreadCount: unreadCount || 0,
            };
          })
        );

        const validConvs = convsData
          .filter((c) => c !== null)
          .sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
          });

        setConversations(validConvs as any[]);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "requests" && isLoggedIn) {
      fetchMyRequests();
    } else if (activeTab === "messages" && isLoggedIn) {
      fetchConversations();
    }
  }, [activeTab, isLoggedIn]);

  // Fetch verified alumni
  const { alumni, loading, error } = useAlumni({
    major,
    search,
    mentorshipOnly,
  });

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBorder = isDarkMode ? "border-[#2f3336]/50 bg-[#17181c]" : "border-slate-200 bg-white";

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-slate-200/50 ${isDarkMode ? "hover:bg-[#16181c] text-white" : "text-slate-900"}`}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className={`text-xl font-bold flex items-center gap-2 ${textColor}`}>
                <GraduationCap className="h-6 w-6 text-[#1e9df1]" />
                Alumni Hub
              </h1>
              <p className={`text-xs ${subColor}`}>Connect with BUBT alumni and find mentorship</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        {isLoggedIn && (
          <div className="flex border-b border-[#2f3336]/10 mb-6 gap-6 text-sm">
            <button
              onClick={() => setActiveTab("directory")}
              className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "border-[#1e9df1] text-[#1e9df1]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Alumni Directory
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "requests"
                  ? "border-[#1e9df1] text-[#1e9df1]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              My Mentorship Requests
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "messages"
                  ? "border-[#1e9df1] text-[#1e9df1]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>Messages</span>
              {unreadMsgCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#1e9df1] text-white">
                  {unreadMsgCount}
                </span>
              )}
            </button>
          </div>
        )}

        {activeTab === "directory" && (
          <>
            {/* Filters */}
            <div className="mb-6">
              <AlumniFilter
                search={search}
                setSearch={setSearch}
                major={major}
                setMajor={setMajor}
                mentorshipOnly={mentorshipOnly}
                setMentorshipOnly={setMentorshipOnly}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Main Grid / Loading / Empty State */}
            {loading ? (
              /* Loading Skeletons */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 flex flex-col gap-4 animate-pulse ${cardBorder}`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-800" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-800 rounded w-2/3" />
                        <div className="h-3 bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : alumni.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                  <SearchX size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                </div>
                <div>
                  <h3 className={`text-base font-semibold ${textColor}`}>No alumni found</h3>
                  <p className={`text-xs max-w-xs mt-1 ${subColor}`}>
                    Try adjusting your filters or search term to find alumni.
                  </p>
                </div>
              </div>
            ) : (
              /* Alumni Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {alumni.map((a) => (
                  <AlumniCard
                    key={a.id}
                    alumni={a}
                    isDarkMode={isDarkMode}
                    onViewProfile={onViewProfile}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "requests" && (
          myRequestsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className={`text-xs ${subColor}`}>Loading requests...</span>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                <Inbox size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${textColor}`}>No mentorship requests</h3>
                <p className={`text-xs max-w-xs mt-1 ${subColor}`}>
                  You haven't submitted any mentorship requests yet. Browse the directory to connect with alumni!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-5 rounded-xl border flex flex-col gap-3 justify-between ${
                    isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className={`font-bold text-sm ${textColor}`}>To: {req.alumni_name}</p>
                      
                      {/* Status Badge */}
                      {req.status === "pending" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      )}
                      {req.status === "accepted" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Accepted
                        </span>
                      )}
                      {req.status === "declined" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Declined
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-md w-fit">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Topic: {req.topic}
                    </div>

                    {req.message && (
                      <p className={`text-xs leading-relaxed italic ${subColor}`}>
                        "{req.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#2f3336]/10 pt-3 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Sent: {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "messages" && (
          loadingConvs ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#1e9df1]"></span>
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-slate-500">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                <MessageSquare size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${textColor}`}>No conversations yet</h3>
                <p className={`text-xs max-w-xs mt-1 ${subColor}`}>
                  Once your mentorship requests are accepted by mentors, you can chat with them here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col border border-[#2f3336]/20 rounded-xl overflow-hidden divide-y divide-[#2f3336]/20">
              {conversations.map((conv) => {
                const hasUnread = conv.unreadCount > 0;
                const isLastMine = conv.lastMessageSenderId === authSession.user.id;
                
                return (
                  <div
                    key={conv.connectionId}
                    onClick={() => setChatTarget(conv.mentor)}
                    className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-500/5 transition-all ${
                      hasUnread && isDarkMode ? "bg-blue-500/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-emerald-500/30 bg-slate-800 flex-shrink-0">
                        {conv.mentor.avatar_url ? (
                          <img src={conv.mentor.avatar_url} alt={conv.mentor.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-emerald-600">
                            {conv.mentor.full_name?.charAt(0)?.toUpperCase()}
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
                            {conv.mentor.full_name}
                          </p>
                          {conv.lastMessageTime && (
                            <span className="text-[10px] text-slate-500 flex-shrink-0">
                              {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 truncate ${hasUnread ? "font-semibold text-[#e7e9ea]" : "text-slate-400"}`}>
                          {isLastMine ? "You: " : ""}{conv.lastMessage}
                        </p>
                      </div>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1e9df1] text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {chatTarget && (
        <MentorChat
          isDarkMode={isDarkMode}
          currentUserId={authSession.user.id}
          currentUserProfile={null}
          targetUserId={chatTarget.id}
          targetUserName={chatTarget.full_name}
          targetUserAvatar={chatTarget.avatar_url}
          isTargetAlumni={true}
          onClose={() => {
            setChatTarget(null);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}
