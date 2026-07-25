import { useState, useEffect } from "react";
import { ArrowLeft, GraduationCap, SearchX, Inbox, Calendar, MessageSquare, BookOpen, Globe, Lock, Download, FileText, Loader2, Sparkles, Eye, EyeOff, Search as SearchIcon } from "lucide-react";
import { useAlumni } from "../../hooks/useAlumni";
import AlumniFilter from "./AlumniFilter";
import AlumniCard from "./AlumniCard";
import { supabase } from "../../lib/supabase";
import MentorChat from "./MentorChat";
import { getSuggestedMentors } from "../../lib/api/mentorshipApi";
import { AlumniProfile } from "../../types/social";
import ChipLoader from "../ui/ChipLoader";

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
  const [graduationYear, setGraduationYear] = useState<number | null>(null);
  const [company, setCompany] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const [suggestedMentors, setSuggestedMentors] = useState<AlumniProfile[]>([]);
  const [showSuggested, setShowSuggested] = useState(true);
  const filtersAtDefault =
    search === "" && major === "All" && !mentorshipOnly && !graduationYear && company === "" && selectedSkills.length === 0;

  useEffect(() => {
    if (isLoggedIn && authSession?.user?.id) {
      getSuggestedMentors(authSession.user.id).then(setSuggestedMentors);
    }
  }, [isLoggedIn, authSession?.user?.id]);

  const [activeTab, setActiveTab] = useState("directory");

  // Resources States
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [alumniNames, setAlumniNames] = useState<Record<string, string>>({});
  const [studentMentorIds, setStudentMentorIds] = useState<string[]>([]);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("All");
  const [resourceDeptFilter, setResourceDeptFilter] = useState("All");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceYearFilter, setResourceYearFilter] = useState("All");

  const resourceMatchesFilters = (res: any) => {
    const typeMatch = resourceTypeFilter === "All" || res.type === resourceTypeFilter;
    const deptMatch = resourceDeptFilter === "All" || res.department === resourceDeptFilter;
    const yearMatch =
      resourceYearFilter === "All" || new Date(res.created_at).getFullYear().toString() === resourceYearFilter;
    const searchMatch =
      !resourceSearch.trim() ||
      res.title?.toLowerCase().includes(resourceSearch.trim().toLowerCase()) ||
      res.description?.toLowerCase().includes(resourceSearch.trim().toLowerCase());
    return typeMatch && deptMatch && yearMatch && searchMatch;
  };

  const resourceYears = Array.from(
    new Set(resourcesList.map((r) => new Date(r.created_at).getFullYear().toString()))
  ).sort((a, b) => Number(b) - Number(a));

  const fetchResourcesData = async () => {
    if (!authSession?.user?.id) return;
    try {
      setResourcesLoading(true);
      
      // 1. Fetch student's mentor connections
      const { data: conns } = await supabase
        .from("mentor_connections")
        .select("alumni_id")
        .eq("student_id", authSession.user.id);
      
      const mIds = conns?.map((c) => c.alumni_id) || [];
      setStudentMentorIds(mIds);

      // 3. Fetch private resources from connected mentors
      let privateRes: any[] = [];
      if (mIds.length > 0) {
        const { data: priv } = await supabase
          .from("alumni_resources")
          .select("*")
          .eq("visibility", "private")
          .in("alumni_id", mIds);
        privateRes = priv || [];
      }

      const sorted = [...privateRes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setResourcesList(sorted);

      // 4. Fetch uploader names
      const uploaderIds = Array.from(new Set(sorted.map((r) => r.alumni_id)));
      if (uploaderIds.length > 0) {
        const { data: alumniProfiles } = await supabase
          .from("alumni_profiles")
          .select("id, full_name")
          .in("id", uploaderIds);

        if (alumniProfiles) {
          const namesMap: Record<string, string> = {};
          alumniProfiles.forEach((p) => {
            namesMap[p.id] = p.full_name;
          });
          setAlumniNames(namesMap);
        }
      }
    } catch (err) {
      console.error("Error fetching student resources:", err);
    } finally {
      setResourcesLoading(false);
    }
  };
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
    } else if (activeTab === "resources" && isLoggedIn) {
      fetchResourcesData();
    }
  }, [activeTab, isLoggedIn]);

  // Fetch verified alumni
  const { alumni, loading, error } = useAlumni({
    major,
    search,
    mentorshipOnly,
    graduationYear: graduationYear ?? undefined,
    company,
    skills: selectedSkills,
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
          <div>
            <h1 className={`text-xl font-bold flex items-center gap-2 ${textColor}`}>
              <GraduationCap className="h-6 w-6 text-[#1e9df1]" />
              Alumni Hub
            </h1>
            <p className={`text-xs ${subColor}`}>Connect with BUBT alumni and find mentorship</p>
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
            <button
              onClick={() => setActiveTab("resources")}
              className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "resources"
                  ? "border-[#1e9df1] text-[#1e9df1]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Resources
            </button>
          </div>
        )}

        {activeTab === "directory" && (
          <>
            {/* Suggested Mentors */}
            {isLoggedIn && filtersAtDefault && suggestedMentors.length > 0 && (
              <div
                className={`mb-6 rounded-xl border p-4 sm:p-5 ${
                  isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#1e9df1]" />
                    <h3 className={`text-sm font-bold ${textColor}`}>Suggested Mentors</h3>
                  </div>
                  <button
                    onClick={() => setShowSuggested((v) => !v)}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                      isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#202327]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {showSuggested ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showSuggested ? "Hide" : "Show"}
                  </button>
                </div>
                {showSuggested && (
                  <>
                    <p className={`text-xs mb-4 ${subColor}`}>Based on your major and skills</p>
                    <div className="flex gap-3 sm:gap-4 overflow-x-auto custom-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-2">
                      {suggestedMentors.map((a) => (
                        <div key={a.id} className="w-[280px] sm:w-72 flex-shrink-0 snap-start flex">
                          <AlumniCard alumni={a} isDarkMode={isDarkMode} onViewProfile={onViewProfile} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="mb-6">
              <AlumniFilter
                search={search}
                setSearch={setSearch}
                major={major}
                setMajor={setMajor}
                mentorshipOnly={mentorshipOnly}
                setMentorshipOnly={setMentorshipOnly}
                graduationYear={graduationYear}
                setGraduationYear={setGraduationYear}
                company={company}
                setCompany={setCompany}
                selectedSkills={selectedSkills}
                setSelectedSkills={setSelectedSkills}
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
              <div className="flex justify-center py-20">
                <ChipLoader size="lg" />
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
              <ChipLoader size="lg" />
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
            <div className="flex flex-col items-center gap-1 text-xs text-slate-500 py-10 justify-center">
              <ChipLoader size="md" />
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

        {activeTab === "resources" && (
          resourcesLoading ? (
            <div className="flex flex-col items-center gap-1 text-xs text-slate-500 py-10 justify-center">
              <ChipLoader size="md" />
              Loading resources...
            </div>
          ) : (
            <div className="space-y-8">
              {/* Filters Panel */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`} />
                  <input
                    type="text"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    placeholder="Search resources by title or description..."
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${
                      isDarkMode
                        ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
                    }`}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <span className={`text-xs font-semibold ${textColor}`}>
                    Filter Shared Resources:
                  </span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select
                      value={resourceTypeFilter}
                      onChange={(e) => setResourceTypeFilter(e.target.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border outline-none cursor-pointer transition-all flex-1 sm:flex-none ${
                        isDarkMode
                          ? "bg-[#16181c] border-[#2f3336] text-white focus:border-[#1e9df1]"
                          : "bg-white border-slate-300 text-slate-800 focus:border-[#1e9df1]"
                      }`}
                    >
                      <option value="All">All Types</option>
                      <option value="Career Tips">Career Tips</option>
                      <option value="Job Guide">Job Guide</option>
                      <option value="Study Material">Study Material</option>
                      <option value="Industry Insight">Industry Insight</option>
                    </select>

                    <select
                      value={resourceDeptFilter}
                      onChange={(e) => setResourceDeptFilter(e.target.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border outline-none cursor-pointer transition-all flex-1 sm:flex-none ${
                        isDarkMode
                          ? "bg-[#16181c] border-[#2f3336] text-white focus:border-[#1e9df1]"
                          : "bg-white border-slate-300 text-slate-800 focus:border-[#1e9df1]"
                      }`}
                    >
                      <option value="All">All Departments</option>
                      <option value="CSE">CSE</option>
                      <option value="EEE">EEE</option>
                      <option value="BBA">BBA</option>
                      <option value="Civil">Civil</option>
                      <option value="Textile">Textile</option>
                      <option value="Other">Other</option>
                    </select>

                    <select
                      value={resourceYearFilter}
                      onChange={(e) => setResourceYearFilter(e.target.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border outline-none cursor-pointer transition-all flex-1 sm:flex-none ${
                        isDarkMode
                          ? "bg-[#16181c] border-[#2f3336] text-white focus:border-[#1e9df1]"
                          : "bg-white border-slate-300 text-slate-800 focus:border-[#1e9df1]"
                      }`}
                    >
                      <option value="All">All Years</option>
                      {resourceYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Private Resources from connected Mentors */}
              <div className="space-y-3">
                <h3 className={`text-sm font-extrabold flex items-center gap-2 ${textColor}`}>
                  <Lock className="w-4 h-4 text-amber-400" />
                  Shared by My Mentors
                </h3>
                
                {resourcesList.filter(r => r.visibility === "private" && studentMentorIds.includes(r.alumni_id) && resourceMatchesFilters(r)).length === 0 ? (
                  <div className={`p-6 text-center rounded-xl border border-dashed ${isDarkMode ? "border-[#2f3336]/60 bg-[#16181c]/30 text-slate-500" : "border-slate-200 bg-slate-50/50 text-slate-400"}`}>
                    <p className="text-xs">No private resources shared by your connected mentors yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resourcesList
                      .filter((res) => {
                        const isPrivate = res.visibility === "private";
                        const isMentor = studentMentorIds.includes(res.alumni_id);
                        return isPrivate && isMentor && resourceMatchesFilters(res);
                      })
                      .map((res) => (
                        <div
                          key={res.id}
                          className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${cardBorder}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <h4 className={`font-bold text-sm leading-snug break-words ${textColor}`}>
                                  {res.title}
                                </h4>
                                <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                                  {res.type} · Dept: {res.department}
                                </p>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Mentor Shared
                              </span>
                            </div>

                            {res.description && (
                              <p className={`text-xs leading-relaxed italic ${subColor}`}>
                                "{res.description}"
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 px-3 py-1.5 rounded-lg w-fit max-w-full">
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate text-[11px]">{res.file_name}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-[#2f3336]/10 mt-1">
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold truncate ${textColor}`}>
                                Mentor: {alumniNames[res.alumni_id] || "Verified Alumni"}
                              </p>
                              <span className={`text-[9px] flex items-center gap-1 ${subColor} mt-0.5`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(res.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <button
                              onClick={() => window.open(res.file_url, "_blank")}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Get File
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>


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
