import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, GraduationCap, ShieldCheck, SearchX, Inbox, Calendar, MessageSquare, BookOpen, Globe, Lock, Download, FileText, Loader2, Sparkles, Eye, EyeOff, Search as SearchIcon, ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle, Trash2, ArrowUpRight, Briefcase, Rss } from "lucide-react";
import { useAlumni } from "../../hooks/useAlumni";
import AlumniFilter from "./AlumniFilter";
import AlumniCard from "./AlumniCard";
import SuggestedMentorCard from "./SuggestedMentorCard";
import { supabase } from "../../lib/supabase";
import MentorChat from "./MentorChat";
import { getSuggestedMentors } from "../../lib/api/mentorshipApi";
import { AlumniProfile } from "../../types/social";
import Loader from "../ui/Loader";
import AlumniResourcesPage from "./pages/AlumniResourcesPage";

interface Props {
  isDarkMode: boolean;
  isLoggedIn: boolean;
  onViewProfile: (id: string) => void;
  onRegisterClick: () => void;
  onClose: () => void;
  authSession: any;
  unreadMsgCount?: number;
  userProfile?: any;
  initialTab?: string;
  onRequireLogin?: () => void;
}

export default function AlumniDirectoryPage({
  isDarkMode,
  isLoggedIn,
  onViewProfile,
  onRegisterClick,
  onClose,
  authSession,
  unreadMsgCount = 0,
  userProfile,
  initialTab = "feed",
  onRequireLogin,
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

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [suggestedMentors, showSuggested, checkScroll]);

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = 310;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (isLoggedIn && authSession?.user?.id) {
      getSuggestedMentors(authSession.user.id).then(setSuggestedMentors);
    }
  }, [isLoggedIn, authSession?.user?.id]);

  const [activeTab, setActiveTab] = useState(initialTab || "directory");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
  const [requestFilter, setRequestFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");

  const getInitials = (name?: string) => {
    if (!name) return "AL";
    const clean = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Md\.|Engr\.)\s+/i, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || "AL";
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-blue-600 via-indigo-600 to-sky-600",
      "from-indigo-600 via-purple-600 to-violet-600",
      "from-teal-600 via-emerald-600 to-cyan-600",
      "from-sky-600 via-blue-600 to-indigo-700",
      "from-violet-600 via-fuchsia-600 to-pink-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const handleWithdrawRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to withdraw this mentorship request?")) return;
    try {
      const { error } = await supabase
        .from("mentorship_requests")
        .delete()
        .eq("id", requestId)
        .eq("student_id", authSession.user.id);
      if (error) throw error;
      setMyRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      console.error("Error withdrawing request:", err);
      alert(err?.message || "Failed to withdraw request.");
    }
  };

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
            .select("id, full_name, avatar_url, job_title, company_name, major, graduation_year")
            .in("id", alumniIds);

          const alumniMap = new Map(alumniProfiles?.map((ap: any) => [ap.id, ap]) || []);

          const enriched = data.map((r: any) => {
            const ap = alumniMap.get(r.alumni_id);
            return {
              ...r,
              alumnus: ap || null,
              alumni_name: ap?.full_name || "Alumni Member",
              job_title: ap?.job_title,
              company_name: ap?.company_name,
              major: ap?.major,
              graduation_year: ap?.graduation_year,
              avatar_url: ap?.avatar_url,
            };
          });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-xl font-bold flex items-center gap-2 ${textColor}`} style={{ fontFamily: "'Exo 2', sans-serif" }}>
              <GraduationCap className="h-6 w-6 text-[#1e9df1]" />
              Alumni Hub
            </h1>
            <p className={`text-xs ${subColor}`}>Connect with BUBT alumni and discover mentorship</p>
          </div>
          <button
            onClick={onRegisterClick}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e9df1] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-all shadow-md shadow-[#1e9df1]/25 active:scale-95 cursor-pointer"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Register as Alumni</span>
          </button>
        </div>

        {/* Tab Switcher — pill capsule matching Network and Navbar style */}
        <div
          className={`inline-flex items-center rounded-full p-1.5 gap-1 border mb-6 overflow-x-auto max-w-full scrollbar-none ${
            isDarkMode
              ? "bg-[#16181c] border-[#2f3336] shadow-lg shadow-black/20"
              : "bg-white border-slate-300 shadow-md shadow-black/8"
          }`}
        >
          <button
            onClick={() => setActiveTab("feed")}
            className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "feed" || activeTab === "resources"
                ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/25"
                : isDarkMode
                ? "font-medium text-[#71767b] hover:text-[#e7e9ea]"
                : "font-medium text-slate-500 hover:text-slate-800"
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "directory"
                ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/25"
                : isDarkMode
                ? "font-medium text-[#71767b] hover:text-[#e7e9ea]"
                : "font-medium text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alumni Directory</span>
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) {
                onRequireLogin?.();
                return;
              }
              setActiveTab("requests");
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/25"
                : isDarkMode
                ? "font-medium text-[#71767b] hover:text-[#e7e9ea]"
                : "font-medium text-slate-500 hover:text-slate-800"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Mentorship Requests</span>
            {isLoggedIn && myRequests.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "requests" ? "bg-white/20 text-white" : "bg-[#1e9df1] text-white"
                }`}
              >
                {myRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) {
                onRequireLogin?.();
                return;
              }
              setActiveTab("messages");
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "messages"
                ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/25"
                : isDarkMode
                ? "font-medium text-[#71767b] hover:text-[#e7e9ea]"
                : "font-medium text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages</span>
            {isLoggedIn && unreadMsgCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "messages" ? "bg-white/20 text-white" : "bg-[#1e9df1] text-white"
                }`}
              >
                {unreadMsgCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "directory" && (
          <>
            {/* Suggested Mentors */}
            {isLoggedIn && filtersAtDefault && suggestedMentors.length > 0 && (
              <div
                className={`mb-6 rounded-2xl border p-4 sm:p-5 transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-b from-[#131722]/95 to-[#0c0f16]/95 border-[#202738] shadow-lg shadow-black/25"
                    : "bg-gradient-to-b from-white to-slate-50/70 border-slate-200 shadow-sm"
                }`}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e9df1]/20 to-indigo-500/10 border border-[#1e9df1]/30 flex items-center justify-center text-[#1e9df1] flex-shrink-0 shadow-sm shadow-[#1e9df1]/10">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm sm:text-base font-bold truncate ${textColor}`}>
                          Suggested Mentors
                        </h3>
                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e9df1]/10 text-[#1e9df1] border border-[#1e9df1]/20">
                          Recommended for you
                        </span>
                      </div>
                      <p className={`text-xs truncate ${subColor}`}>
                        Alumni graduates matching your department and skill interests
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {showSuggested && suggestedMentors.length > 2 && (
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          type="button"
                          onClick={() => scrollCarousel("left")}
                          disabled={!canScrollLeft}
                          aria-label="Previous mentors"
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            canScrollLeft
                              ? isDarkMode
                                ? "bg-[#181d29] border-[#293247] text-white hover:bg-[#202737] hover:border-[#1e9df1]/50"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                              : "opacity-30 cursor-not-allowed border-transparent text-slate-500"
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollCarousel("right")}
                          disabled={!canScrollRight}
                          aria-label="Next mentors"
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            canScrollRight
                              ? isDarkMode
                                ? "bg-[#181d29] border-[#293247] text-white hover:bg-[#202737] hover:border-[#1e9df1]/50"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                              : "opacity-30 cursor-not-allowed border-transparent text-slate-500"
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSuggested((v) => !v)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDarkMode
                          ? "bg-[#141822] border-[#222a3d] text-slate-300 hover:text-white hover:bg-[#1a202e]"
                          : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {showSuggested ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showSuggested ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                </div>

                {/* Carousel List */}
                {showSuggested && (
                  <div
                    ref={carouselRef}
                    className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth -mx-1 px-1 py-1"
                  >
                    {suggestedMentors.map((a) => (
                      <SuggestedMentorCard
                        key={a.id}
                        alumni={a}
                        isDarkMode={isDarkMode}
                        onViewProfile={onViewProfile}
                      />
                    ))}
                  </div>
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
                onReset={() => {
                  setSearch("");
                  setMajor("All");
                  setMentorshipOnly(false);
                  setGraduationYear(null);
                  setCompany("");
                  setSelectedSkills([]);
                }}
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
                <Loader />
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
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header with Subtitle & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${textColor}`}>
                  <Inbox className="w-5 h-5 text-[#1e9df1]" />
                  Mentorship Requests
                </h2>
                <p className={`text-xs mt-0.5 ${subColor}`}>
                  Track and manage your guidance requests sent to alumni mentors
                </p>
              </div>

              {/* Status filter pills */}
              {myRequests.length > 0 && (
                <div
                  className={`inline-flex items-center p-1 rounded-xl border text-xs gap-1 self-start sm:self-auto ${
                    isDarkMode ? "bg-[#141822] border-[#222a3d]" : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  {(["all", "pending", "accepted", "declined"] as const).map((st) => {
                    const count =
                      st === "all" ? myRequests.length : myRequests.filter((r) => r.status === st).length;
                    const label = st.charAt(0).toUpperCase() + st.slice(1);
                    const isActive = requestFilter === st;

                    return (
                      <button
                        key={st}
                        onClick={() => setRequestFilter(st)}
                        className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#1e9df1] text-white font-bold shadow-xs"
                            : isDarkMode
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {label} {count > 0 && <span className="opacity-80">({count})</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {myRequestsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader />
                <span className={`text-xs ${subColor}`}>Loading requests...</span>
              </div>
            ) : myRequests.length === 0 ? (
              /* Empty State */
              <div
                className={`flex flex-col items-center justify-center py-20 text-center gap-4 rounded-2xl border p-8 ${
                  isDarkMode ? "bg-[#12161f]/50 border-[#202738]" : "bg-white border-slate-200"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    isDarkMode ? "bg-[#16181c]" : "bg-slate-100"
                  }`}
                >
                  <Inbox size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                </div>
                <div>
                  <h3 className={`text-base font-semibold ${textColor}`}>No mentorship requests</h3>
                  <p className={`text-xs max-w-sm mt-1.5 leading-relaxed ${subColor}`}>
                    You haven't submitted any mentorship requests yet. Browse the alumni directory to discover verified mentors and seek career guidance!
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("directory")}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1e9df1] hover:bg-[#1a8cd8] text-white transition-all shadow-md shadow-[#1e9df1]/25 cursor-pointer"
                >
                  Browse Alumni Directory
                </button>
              </div>
            ) : (
              /* Request Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRequests
                  .filter((r) => requestFilter === "all" || r.status === requestFilter)
                  .map((req) => {
                    const initials = getInitials(req.alumni_name);
                    const avatarGrad = getAvatarGradient(req.alumni_name || "Alumni");

                    return (
                      <div
                        key={req.id}
                        className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 group ${
                          isDarkMode
                            ? "bg-gradient-to-b from-[#131722] to-[#0e1119] border-[#222a3d] hover:border-[#1e9df1]/40 shadow-lg shadow-black/20"
                            : "bg-white border-slate-200 hover:border-blue-400 shadow-sm shadow-slate-100"
                        }`}
                      >
                        <div>
                          {/* Top Row: Mentor Info & Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Avatar */}
                              <div
                                onClick={() => onViewProfile(req.alumni_id)}
                                className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center font-bold text-white text-xs shadow-md bg-gradient-to-br flex-shrink-0 cursor-pointer ${avatarGrad}`}
                                style={{ fontFamily: "'Exo 2', sans-serif" }}
                              >
                                {req.avatar_url ? (
                                  <img
                                    src={req.avatar_url}
                                    alt={req.alumni_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="tracking-wider">{initials}</span>
                                )}
                              </div>

                              {/* Details */}
                              <div className="min-w-0">
                                <h4
                                  onClick={() => onViewProfile(req.alumni_id)}
                                  className={`text-sm font-bold truncate cursor-pointer hover:text-[#1e9df1] transition-colors ${textColor}`}
                                >
                                  {req.alumni_name}
                                </h4>

                                {req.job_title ? (
                                  <p
                                    className={`text-xs truncate font-medium flex items-center gap-1 mt-0.5 ${
                                      isDarkMode ? "text-sky-400" : "text-blue-600"
                                    }`}
                                  >
                                    <Briefcase className="w-3 h-3 flex-shrink-0 opacity-70" />
                                    <span className="truncate">
                                      {req.job_title}
                                      {req.company_name ? ` · ${req.company_name}` : ""}
                                    </span>
                                  </p>
                                ) : (
                                  <p className={`text-xs truncate italic mt-0.5 ${subColor}`}>
                                    BUBT Graduate
                                  </p>
                                )}

                                {req.graduation_year && req.major && (
                                  <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                                    <GraduationCap className="w-3 h-3 text-[#1e9df1] flex-shrink-0" />
                                    <span>
                                      Class of {req.graduation_year} ·{" "}
                                      <span className="uppercase font-semibold text-slate-300">
                                        {req.major}
                                      </span>
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                              {req.status === "pending" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                  Pending Review
                                </span>
                              )}
                              {req.status === "accepted" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Accepted
                                </span>
                              )}
                              {req.status === "declined" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Declined
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Topic Pill */}
                          <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1e9df1]/10 text-[#1e9df1] border border-[#1e9df1]/20">
                              <MessageSquare className="w-3 h-3" />
                              Topic: {req.topic}
                            </span>
                          </div>

                          {/* Message Quote Box */}
                          {req.message && (
                            <div
                              className={`mt-2.5 p-3 rounded-xl border text-xs leading-relaxed italic ${
                                isDarkMode
                                  ? "bg-[#0b0e14]/70 border-[#1f2638] text-slate-300"
                                  : "bg-slate-50 border-slate-200 text-slate-700"
                              }`}
                            >
                              "{req.message}"
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Date & Actions */}
                        <div
                          className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
                            isDarkMode ? "border-[#202738]" : "border-slate-100"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                            Sent {new Date(req.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>

                          <div className="flex items-center gap-1.5 ml-auto">
                            {req.status === "pending" && (
                              <button
                                onClick={() => handleWithdrawRequest(req.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                  isDarkMode
                                    ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                                    : "text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                                }`}
                                title="Cancel this mentorship request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Withdraw</span>
                              </button>
                            )}

                            {req.status === "accepted" && (
                              <button
                                onClick={() => {
                                  if (req.alumnus) {
                                    setChatTarget(req.alumnus);
                                  } else {
                                    setActiveTab("messages");
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e9df1] hover:bg-[#1a8cd8] text-white transition-all shadow-sm shadow-[#1e9df1]/25 active:scale-95 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Message Mentor</span>
                              </button>
                            )}

                            <button
                              onClick={() => onViewProfile(req.alumni_id)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isDarkMode
                                  ? "bg-[#181d29] border border-[#293247] text-slate-200 hover:text-white hover:border-[#1e9df1]/50"
                                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              <span>View Profile</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === "messages" && (
          loadingConvs ? (
            <div className="flex flex-col items-center gap-1 text-xs text-slate-500 py-10 justify-center">
              <Loader />
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

        {(activeTab === "feed" || activeTab === "resources") && (
          <div className="pt-1">
            <AlumniResourcesPage
              isDarkMode={isDarkMode}
              authSession={authSession}
              userProfile={userProfile}
              onViewAlumniProfile={onViewProfile}
              onRequireLogin={onRequireLogin}
              onBrowseDirectory={() => setActiveTab("directory")}
              suggestedMentors={suggestedMentors}
            />
          </div>
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
