import { useState, useEffect } from "react";
import { Users, User, Compass, MessageSquare, Briefcase, GraduationCap, Inbox, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import MentorChat from "../MentorChat";

interface Props {
  isDarkMode: boolean;
  authSession: any;
  userProfile: any;
}

export default function AlumniNetworkPage({ isDarkMode, authSession, userProfile }: Props) {
  const [activeTab, setActiveTab] = useState<"mentees" | "fellows" | "students">("mentees");
  
  // Data states
  const [mentees, setMentees] = useState<any[]>([]);
  const [fellows, setFellows] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Loading states
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [loadingFellows, setLoadingFellows] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Chat state
  const [chatTarget, setChatTarget] = useState<any | null>(null);

  const currentUserId = authSession?.user?.id;

  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";
  const innerCardBg = isDarkMode ? "bg-slate-900/40 border-[#2f3336]/40" : "bg-slate-50 border-slate-200";

  // 1. Fetch Connected Mentees
  const fetchMentees = async () => {
    if (!currentUserId) return;
    try {
      setLoadingMentees(true);
      const { data: conns, error: connErr } = await supabase
        .from("mentor_connections")
        .select("id, student_id")
        .eq("alumni_id", currentUserId);

      if (connErr) throw connErr;

      if (conns && conns.length > 0) {
        const studentIds = conns.map((c) => c.student_id);
        const { data: profiles, error: profileErr } = await supabase
          .from("profiles")
          .select("id, name, major, section, avatar_url, profile_pic")
          .in("id", studentIds);

        if (profileErr) throw profileErr;
        setMentees(profiles || []);
      } else {
        setMentees([]);
      }
    } catch (err) {
      console.error("Error fetching mentees:", err);
    } finally {
      setLoadingMentees(false);
    }
  };

  // 2. Fetch Fellow Verified Alumni
  const fetchFellows = async () => {
    if (!currentUserId) return;
    try {
      setLoadingFellows(true);
      const { data, error } = await supabase
        .from("alumni_profiles")
        .select("id, full_name, job_title, company_name, major, avatar_url")
        .eq("is_verified", true)
        .neq("id", currentUserId);

      if (error) throw error;
      setFellows(data || []);
    } catch (err) {
      console.error("Error fetching fellow alumni:", err);
    } finally {
      setLoadingFellows(false);
    }
  };

  // 3. Fetch Students (recently joined students)
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, major, section, avatar_url, profile_pic")
        .eq("is_alumni", false)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error("Error fetching explore students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeTab === "mentees") {
      fetchMentees();
    } else if (activeTab === "fellows") {
      fetchFellows();
    } else if (activeTab === "students") {
      fetchStudents();
    }
  }, [activeTab, currentUserId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border ${cardBg}`}>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${textColor}`}>
          My Network
        </h1>
        <p className={`text-sm ${subColor}`}>
          Manage your connections, view other verified alumni, and explore students in your field.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-[#2f3336]/10 mb-6 gap-6 text-sm flex-wrap">
        <button
          onClick={() => setActiveTab("mentees")}
          className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "mentees"
              ? "border-[#1e9df1] text-[#1e9df1]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <User className="w-4 h-4" />
          My Mentees
        </button>
        
        <button
          onClick={() => setActiveTab("fellows")}
          className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "fellows"
              ? "border-[#1e9df1] text-[#1e9df1]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Fellow Alumni
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "students"
              ? "border-[#1e9df1] text-[#1e9df1]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Compass className="w-4 h-4" />
          Explore Students
        </button>
      </div>

      {/* Main Grid View */}
      <div>
        {/* SECTION 1: MENTEES */}
        {activeTab === "mentees" && (
          loadingMentees ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#1e9df1]" />
              Loading mentees...
            </div>
          ) : mentees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-slate-500">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                <User size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
              </div>
              <div>
                <p className="text-sm font-bold">No connected mentees yet</p>
                <p className="text-xs max-w-xs mt-1">
                  Once students request mentorship and you accept them, they will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {mentees.map((mentee) => (
                <div
                  key={mentee.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${cardBg}`}
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-500/30 bg-slate-800 flex-shrink-0">
                      {mentee.avatar_url || mentee.profile_pic ? (
                        <img src={mentee.avatar_url || mentee.profile_pic} alt={mentee.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-purple-600">
                          {mentee.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${textColor}`}>{mentee.name}</p>
                      <p className="text-xs text-purple-400 font-semibold truncate">{mentee.major || "No Major Specified"}</p>
                      <p className={`text-[10px] truncate ${subColor}`}>
                        {mentee.section || "No Section Specified"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatTarget(mentee)}
                    className="w-full py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* SECTION 2: FELLOW ALUMNI */}
        {activeTab === "fellows" && (
          loadingFellows ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#1e9df1]" />
              Loading fellow alumni...
            </div>
          ) : fellows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-slate-500">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                <Users size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
              </div>
              <div>
                <p className="text-sm font-bold">No other alumni registered</p>
                <p className="text-xs max-w-xs mt-1">
                  You are the first registered alumni member! Other verified alumni will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {fellows.map((fellow) => (
                <div
                  key={fellow.id}
                  className={`p-4 rounded-xl border flex gap-3 items-center ${cardBg}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-500/30 bg-slate-800 flex-shrink-0">
                    {fellow.avatar_url ? (
                      <img src={fellow.avatar_url} alt={fellow.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-blue-600">
                        {fellow.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${textColor}`}>{fellow.full_name}</p>
                    <p className="text-[10px] text-purple-400 font-semibold">{fellow.major}</p>
                    <p className={`text-xs truncate ${subColor} flex items-center gap-1 mt-0.5`}>
                      <Briefcase className="w-3 h-3 flex-shrink-0" />
                      <span>{fellow.job_title} {fellow.company_name ? `@ ${fellow.company_name}` : ""}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* SECTION 3: EXPLORE STUDENTS */}
        {activeTab === "students" && (
          loadingStudents ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#1e9df1]" />
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-slate-500">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                <GraduationCap size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
              </div>
              <div>
                <p className="text-sm font-bold">No students registered yet</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`p-4 rounded-xl border flex gap-3 items-center ${cardBg}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-500/30 bg-slate-800 flex-shrink-0">
                    {student.avatar_url || student.profile_pic ? (
                      <img src={student.avatar_url || student.profile_pic} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-purple-600">
                        {student.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${textColor}`}>{student.name}</p>
                    <p className="text-xs text-purple-400 font-semibold truncate">{student.major || "No Major"}</p>
                    <p className={`text-[10px] truncate ${subColor}`}>
                      {student.section || "No Section"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {chatTarget && (
        <MentorChat
          isDarkMode={isDarkMode}
          currentUserId={currentUserId}
          currentUserProfile={userProfile}
          targetUserId={chatTarget.id}
          targetUserName={chatTarget.name}
          targetUserAvatar={chatTarget.avatar_url || chatTarget.profile_pic}
          isTargetAlumni={false}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  );
}
