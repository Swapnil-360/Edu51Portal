import { useState, useEffect } from "react";
import { ArrowLeft, GraduationCap, SearchX, Inbox, Calendar, MessageSquare } from "lucide-react";
import { useAlumni } from "../../hooks/useAlumni";
import AlumniFilter from "./AlumniFilter";
import AlumniCard from "./AlumniCard";
import { supabase } from "../../lib/supabase";

interface Props {
  isDarkMode: boolean;
  isLoggedIn: boolean;
  onViewProfile: (id: string) => void;
  onRegisterClick: () => void;
  onClose: () => void;
  authSession: any;
}

export default function AlumniDirectoryPage({
  isDarkMode,
  isLoggedIn,
  onViewProfile,
  onRegisterClick,
  onClose,
  authSession,
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

  useEffect(() => {
    if (activeTab === "requests" && isLoggedIn) {
      fetchMyRequests();
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
          </div>
        )}

        {activeTab === "directory" ? (
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
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-slate-300 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-1/2 bg-slate-300 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-800 rounded" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#2f3336]/10 flex items-center justify-between">
                      <div className="h-4 w-24 bg-slate-300 dark:bg-slate-800 rounded" />
                      <div className="h-8 w-20 bg-slate-300 dark:bg-slate-800 rounded-lg" />
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
                    We couldn't find any profiles matching your criteria. Try adjusting your search filters or be the first to register!
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
        ) : (
          /* Mentorship Requests Tab */
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
          )}
        )}
      </div>
    </div>
  );
}
