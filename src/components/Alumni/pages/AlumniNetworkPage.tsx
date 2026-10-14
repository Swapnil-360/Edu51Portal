import { useState, useEffect, useMemo } from "react";
import {
  Users,
  User,
  Compass,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Search,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  X,
  Mail,
  UserCheck
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import MentorChat from "../MentorChat";
import Loader from "../../ui/Loader";
import StudentProfileView from "../StudentProfileView";
import { removeMentorshipConnection } from "../../../lib/api/mentorshipApi";

interface Props {
  isDarkMode: boolean;
  authSession: any;
  userProfile: any;
  onNavigate?: (view: string) => void;
}

const DEPARTMENTS = [
  "All",
  "AI",
  "CSE",
  "Networking",
  "EEE",
  "Civil",
  "BBA",
  "Textile",
  "English",
  "Law",
  "Economics",
  "Mathematics",
];

// Names of mock/test alumni to exclude
const DUMMY_ALUMNI_NAMES = new Set([
  "Nusrat Jahan",
  "Raisa Sultana",
  "Rezaul Karim",
  "Sabbir Hossain",
  "Sadia Islam",
  "Arif Hasan",
]);

export default function AlumniNetworkPage({
  isDarkMode,
  authSession,
  userProfile,
  onNavigate,
}: Props) {
  const [activeTab, setActiveTab] = useState<"mentees" | "hub" | "students">("mentees");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Data states
  const [mentees, setMentees] = useState<any[]>([]);
  const [alumniList, setAlumniList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Loading states
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Modals
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<any | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const currentUserId = authSession?.user?.id;

  // Styling tokens
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";
  const innerCardBg = isDarkMode ? "bg-[#121316] border-[#2f3336]/40" : "bg-slate-50 border-slate-200";

  // Monogram initials
  const getInitials = (name?: string) => {
    if (!name) return "BU";
    const clean = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Md\.|Engr\.)\s+/i, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || "BU";
  };

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
          .select("id, name, major, section, avatar_url, profile_pic, bubt_email")
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

  // 2. Fetch All Verified Alumni for "Alumni Hub"
  const fetchAlumniHub = async () => {
    try {
      setLoadingAlumni(true);
      const { data, error } = await supabase
        .from("alumni_profiles")
        .select("id, full_name, job_title, company_name, major, avatar_url, graduation_year, linkedin_url, skills, is_available_for_mentorship, is_verified")
        .eq("is_verified", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Exclude dummy test accounts
      const validAlumni = (data || []).filter(
        (a) => !DUMMY_ALUMNI_NAMES.has(a.full_name)
      );

      setAlumniList(validAlumni);
    } catch (err) {
      console.error("Error fetching Alumni Hub:", err);
    } finally {
      setLoadingAlumni(false);
    }
  };

  // 3. Fetch All Valid Registered Students
  const fetchValidStudents = async () => {
    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, major, section, avatar_url, profile_pic, bubt_email, is_alumni, is_banned, created_at")
        .eq("is_alumni", false)
        .order("name", { ascending: true });

      if (error) throw error;

      // Filter out banned and test accounts
      const valid = (data || []).filter((s) => {
        if (s.is_banned) return false;
        if (!s.name) return false;
        const n = s.name.toLowerCase();
        if (n.startsWith("test_") || n.startsWith("test student") || n === "welcome student") {
          return false;
        }
        return true;
      });

      setStudents(valid);
    } catch (err) {
      console.error("Error fetching valid students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchMentees();
    fetchAlumniHub();
    fetchValidStudents();
  }, [currentUserId]);

  // Remove connection
  const handleRemoveConnection = async (studentId: string, studentName: string) => {
    if (!currentUserId) return;
    const confirmed = window.confirm(`Remove mentorship connection with ${studentName}?`);
    if (!confirmed) return;

    try {
      setRemovingId(studentId);
      const { error } = await removeMentorshipConnection(currentUserId, studentId);
      if (error) throw new Error(error);

      fetchMentees();
    } catch (err: any) {
      console.error("Error removing connection:", err);
      alert(err.message || "Failed to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  // Fast set of connected mentee IDs for status checking
  const connectedMenteeIds = useMemo(() => {
    return new Set(mentees.map((m) => m.id));
  }, [mentees]);

  // Client-side filtering
  const filteredMentees = useMemo(() => {
    return mentees.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        m.name?.toLowerCase().includes(q) ||
        m.major?.toLowerCase().includes(q) ||
        m.section?.toLowerCase().includes(q) ||
        m.bubt_email?.toLowerCase().includes(q);
      const matchesDept =
        selectedDept === "All" ||
        m.major?.toLowerCase() === selectedDept.toLowerCase();
      return matchesSearch && matchesDept;
    });
  }, [mentees, searchQuery, selectedDept]);

  const filteredAlumni = useMemo(() => {
    return alumniList.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        a.full_name?.toLowerCase().includes(q) ||
        a.job_title?.toLowerCase().includes(q) ||
        a.company_name?.toLowerCase().includes(q) ||
        a.major?.toLowerCase().includes(q) ||
        a.skills?.some((s: string) => s.toLowerCase().includes(q));
      const matchesDept =
        selectedDept === "All" ||
        a.major?.toLowerCase() === selectedDept.toLowerCase();
      return matchesSearch && matchesDept;
    });
  }, [alumniList, searchQuery, selectedDept]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        s.name?.toLowerCase().includes(q) ||
        s.major?.toLowerCase().includes(q) ||
        s.section?.toLowerCase().includes(q) ||
        s.bubt_email?.toLowerCase().includes(q);
      const matchesDept =
        selectedDept === "All" ||
        s.major?.toLowerCase() === selectedDept.toLowerCase();
      return matchesSearch && matchesDept;
    });
  }, [students, searchQuery, selectedDept]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. HEADER & SEARCH BAR (Compact & Professional) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-lg sm:text-xl font-bold tracking-tight ${textColor}`}>
              Alumni Network
            </h1>
            <p className={`text-xs mt-0.5 ${subColor}`}>
              Manage your active mentees, explore the Alumni Hub community, and discover registered students.
            </p>
          </div>

          {/* Search & Department Filters */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, major, email, company..."
                className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                  isDarkMode
                    ? "bg-[#121316] border-[#2f3336] text-white placeholder-slate-500 focus:border-[#1e9df1]"
                    : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className={`px-3 py-1.5 text-xs rounded-xl border outline-none cursor-pointer transition-all ${
                isDarkMode
                  ? "bg-[#121316] border-[#2f3336] text-white focus:border-[#1e9df1]"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#1e9df1]"
              }`}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. UNIFIED FLOATING PILL CAPSULE TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Tab 1: My Mentees */}
        <button
          onClick={() => setActiveTab("mentees")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
            activeTab === "mentees"
              ? "bg-[#1e9df1] text-white shadow-md shadow-[#1e9df1]/20 font-bold"
              : isDarkMode
              ? "text-slate-400 hover:text-white bg-[#17181c] border border-[#2f3336]/60"
              : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>My Mentees</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "mentees" ? "bg-white/20 text-white" : "bg-[#1e9df1]/15 text-[#1e9df1]"
            }`}
          >
            {mentees.length}
          </span>
        </button>

        {/* Tab 2: Alumni Hub (replaces fellow alumni) */}
        <button
          onClick={() => setActiveTab("hub")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
            activeTab === "hub"
              ? "bg-[#1e9df1] text-white shadow-md shadow-[#1e9df1]/20 font-bold"
              : isDarkMode
              ? "text-slate-400 hover:text-white bg-[#17181c] border border-[#2f3336]/60"
              : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Alumni Hub</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "hub" ? "bg-white/20 text-white" : "bg-purple-500/15 text-purple-400"
            }`}
          >
            {alumniList.length}
          </span>
        </button>

        {/* Tab 3: Explore Students */}
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
            activeTab === "students"
              ? "bg-[#1e9df1] text-white shadow-md shadow-[#1e9df1]/20 font-bold"
              : isDarkMode
              ? "text-slate-400 hover:text-white bg-[#17181c] border border-[#2f3336]/60"
              : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Explore Students</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "students" ? "bg-white/20 text-white" : "bg-blue-500/15 text-blue-400"
            }`}
          >
            {students.length}
          </span>
        </button>
      </div>

      {/* 3. SUB-VIEW CONTENT */}
      <div>
        {/* SUB-VIEW 1: MY MENTEES */}
        {activeTab === "mentees" && (
          loadingMentees ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : filteredMentees.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
              <User className="w-10 h-10 mx-auto text-slate-500 mb-2" />
              <p className={`text-sm font-bold ${textColor}`}>No mentees found</p>
              <p className={`text-xs max-w-sm mx-auto mt-1 ${subColor}`}>
                {mentees.length === 0
                  ? "When students request mentorship and you accept them, they will appear here."
                  : "No connected mentees match your search or filter criteria."}
              </p>
              {mentees.length === 0 && (
                <button
                  onClick={() => setActiveTab("students")}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-[#1e9df1] text-white text-xs font-bold hover:bg-[#1677cc] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Explore Students ({students.length})</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMentees.map((mentee) => (
                <div
                  key={mentee.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${cardBg} hover:border-[#1e9df1]/40 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm">
                        {mentee.avatar_url || mentee.profile_pic ? (
                          <img
                            src={mentee.avatar_url || mentee.profile_pic}
                            alt={mentee.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(mentee.name)}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <button
                          onClick={() => setSelectedStudentId(mentee.id)}
                          className={`font-bold text-sm truncate text-left hover:text-[#1e9df1] hover:underline focus:outline-none cursor-pointer block ${textColor}`}
                        >
                          {mentee.name}
                        </button>
                        <p className="text-[10px] text-purple-400 font-semibold truncate">
                          {mentee.major ? mentee.major.toUpperCase() : "BUBT Student"}
                        </p>
                        <p className={`text-[10px] truncate ${subColor}`}>
                          {mentee.section || "Intake 51"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveConnection(mentee.id, mentee.name)}
                      disabled={removingId === mentee.id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex-shrink-0"
                      title="Remove Connection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#2f3336]/30">
                    <button
                      onClick={() => setChatTarget(mentee)}
                      className="w-full py-1.5 rounded-lg bg-[#1e9df1]/10 hover:bg-[#1e9df1]/20 text-[#1e9df1] border border-[#1e9df1]/30 transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message Mentee</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Engaging Discovery Prompt Card */}
              <div className={`p-4 rounded-xl border border-dashed flex flex-col justify-between gap-3 ${innerCardBg}`}>
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1e9df1]/10 text-[#1e9df1] flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-bold ${textColor}`}>Expand Your Mentorship</h4>
                  <p className={`text-[11px] leading-relaxed ${subColor}`}>
                    Discover eager students in your department who need guidance.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("students")}
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#1e9df1]/10 text-[#1e9df1] hover:bg-[#1e9df1]/20 border border-[#1e9df1]/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Explore All Students ({students.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        )}

        {/* SUB-VIEW 2: ALUMNI HUB (Rebuilt) */}
        {activeTab === "hub" && (
          loadingAlumni ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alumni Hub Summary Strip */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${innerCardBg}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${textColor}`}>
                      BUBT Alumni Hub Community
                    </h3>
                    <p className={`text-[11px] ${subColor}`}>
                      Verified BUBT alumni connected across tech, engineering, business, and industry.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 whitespace-nowrap self-start sm:self-auto">
                  {filteredAlumni.length} {filteredAlumni.length === 1 ? "Alumnus" : "Alumni"} Connected
                </span>
              </div>

              {filteredAlumni.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                  <Users className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                  <p className={`text-sm font-bold ${textColor}`}>No alumni found</p>
                  <p className={`text-xs max-w-sm mx-auto mt-1 ${subColor}`}>
                    No verified alumni match your search or department filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredAlumni.map((alumnus) => {
                    const isSelf = alumnus.id === currentUserId;
                    return (
                      <div
                        key={alumnus.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 transition-all ${cardBg} hover:border-[#1e9df1]/40`}
                      >
                        <div>
                          {/* Alumnus Identity */}
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm">
                              {alumnus.avatar_url ? (
                                <img
                                  src={alumnus.avatar_url}
                                  alt={alumnus.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{getInitials(alumnus.full_name)}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className={`font-bold text-sm truncate ${textColor}`}>
                                  {alumnus.full_name}
                                </h3>
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    You
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs font-medium truncate flex items-center gap-1 mt-0.5 ${isDarkMode ? "text-sky-400" : "text-blue-600"}`}>
                                <Briefcase className="w-3 h-3 flex-shrink-0 opacity-70" />
                                <span className="truncate">
                                  {alumnus.job_title || "BUBT Alumnus"}
                                  {alumnus.company_name ? ` @ ${alumnus.company_name}` : ""}
                                </span>
                              </p>

                              <p className={`text-[11px] truncate mt-0.5 ${subColor}`}>
                                {alumnus.major?.toUpperCase() || "CSE"}
                                {alumnus.graduation_year ? ` · Class of ${alumnus.graduation_year}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Skills badges */}
                          {alumnus.skills && alumnus.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {alumnus.skills.slice(0, 3).map((skill: string) => (
                                <span
                                  key={skill}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#1e9df1]/10 text-sky-400 border border-[#1e9df1]/20"
                                >
                                  {skill}
                                </span>
                              ))}
                              {alumnus.skills.length > 3 && (
                                <span className={`text-[10px] ${subColor}`}>
                                  +{alumnus.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Action Footer */}
                        <div className="pt-2.5 border-t border-[#2f3336]/30 flex items-center justify-between gap-2">
                          {alumnus.is_available_for_mentorship ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Mentorship Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400 bg-slate-500/10 border border-slate-500/20 whitespace-nowrap">
                              Mentoring Paused
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {alumnus.linkedin_url && (
                              <a
                                href={alumnus.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-slate-700/60 hover:border-blue-500 text-slate-400 hover:text-blue-400 transition-colors"
                                title="LinkedIn Profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {!isSelf && (
                              <button
                                onClick={() => onNavigate?.("messages")}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-[#2f3336] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3 text-[#1e9df1]" />
                                <span>Message</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* SUB-VIEW 3: EXPLORE STUDENTS (Rebuilt with All Valid Profiles & Total Count) */}
        {activeTab === "students" && (
          loadingStudents ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Student Directory Summary Strip */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${innerCardBg}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#1e9df1] flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${textColor}`}>
                      BUBT Valid Student Directory
                    </h3>
                    <p className={`text-[11px] ${subColor}`}>
                      Verified enrolled students registered on Edu51Portal.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#1e9df1]/15 text-[#1e9df1] border border-[#1e9df1]/30 whitespace-nowrap">
                    {filteredStudents.length} of {students.length} Valid Students
                  </span>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
                  <GraduationCap className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                  <p className={`text-sm font-bold ${textColor}`}>No students match filter</p>
                  <p className={`text-xs max-w-sm mx-auto mt-1 ${subColor}`}>
                    Try adjusting your search query or department filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredStudents.map((student) => {
                    const isConnected = connectedMenteeIds.has(student.id);

                    return (
                      <div
                        key={student.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 transition-all ${cardBg} hover:border-[#1e9df1]/40`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm">
                            {student.avatar_url || student.profile_pic ? (
                              <img
                                src={student.avatar_url || student.profile_pic}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(student.name)}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => setSelectedStudentId(student.id)}
                              className={`font-bold text-sm truncate text-left hover:text-[#1e9df1] hover:underline focus:outline-none cursor-pointer block ${textColor}`}
                            >
                              {student.name}
                            </button>

                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                {student.major || "CSE"}
                              </span>
                              {student.section && (
                                <span className={`text-[10px] truncate ${subColor}`}>
                                  {student.section}
                                </span>
                              )}
                            </div>

                            {student.bubt_email && (
                              <p className={`text-[10px] truncate mt-1 flex items-center gap-1 ${subColor}`}>
                                <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{student.bubt_email}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status & Action */}
                        <div className="pt-2.5 border-t border-[#2f3336]/30 flex items-center justify-between gap-2">
                          {isConnected ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <UserCheck className="w-3 h-3" />
                              <span>Your Mentee</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              BUBT Student
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {isConnected ? (
                              <button
                                onClick={() => setChatTarget(student)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1e9df1]/10 hover:bg-[#1e9df1]/20 text-[#1e9df1] border border-[#1e9df1]/30 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Message</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedStudentId(student.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-[#2f3336] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <User className="w-3 h-3 text-[#1e9df1]" />
                                <span>View Profile</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Student Profile Modal */}
      <StudentProfileView
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        studentId={selectedStudentId || ""}
        isDarkMode={isDarkMode}
      />

      {/* Instant Mentor Chat Modal */}
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
