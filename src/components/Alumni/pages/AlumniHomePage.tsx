import { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Compass,
  Check,
  X,
  Calendar,
  MessageSquare,
  Trash2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  FileText,
  UserCheck,
  Sparkles,
  Clock,
  ChevronRight,
  User,
  GraduationCap,
  Rss
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import Loader from "../../ui/Loader";
import StudentProfileView from "../StudentProfileView";
import MentorChat from "../MentorChat";
import { removeMentorshipConnection } from "../../../lib/api/mentorshipApi";

interface Props {
  isDarkMode: boolean;
  userProfile: {
    name: string;
    major?: string;
    profilePic?: string;
    avatar_url?: string;
    bubtEmail?: string;
  };
  authSession: any;
  onNavigate?: (view: string) => void;
  unreadMessagesCount?: number;
}

export default function AlumniHomePage({
  isDarkMode,
  userProfile,
  authSession,
  onNavigate,
  unreadMessagesCount = 0,
}: Props) {
  // Core state
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [mentees, setMentees] = useState<any[]>([]);
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [connectionCount, setConnectionCount] = useState<number | "...">("...");
  const [resourcesCount, setResourcesCount] = useState<number | "...">("...");
  const [recentResources, setRecentResources] = useState<any[]>([]);
  
  // Alumni profile state
  const [alumniProfile, setAlumniProfile] = useState<any | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Interaction states
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [onAcceptCallback, setOnAcceptCallback] = useState<(() => void) | undefined>(undefined);
  const [chatTarget, setChatTarget] = useState<any | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Styling tokens
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";
  const innerCardBg = isDarkMode ? "bg-[#121316] border-[#2f3336]/40" : "bg-slate-50 border-slate-200";

  // Helpers
  const getInitials = (name?: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // 1. Fetch Alumni Profile & Availability
  const fetchAlumniProfile = async () => {
    if (!authSession?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from("alumni_profiles")
        .select("*")
        .eq("id", authSession.user.id)
        .maybeSingle();

      if (!error && data) {
        setAlumniProfile(data);
        setIsAvailable(data.is_available_for_mentorship ?? true);
      }
    } catch (err) {
      console.error("Error fetching alumni profile details:", err);
    }
  };

  // 2. Fetch Mentorship Requests (enriched with student profile)
  const fetchRequests = async () => {
    if (!authSession?.user?.id) return;
    try {
      setLoadingRequests(true);
      const { data: rawRequests, error } = await supabase
        .from("mentorship_requests")
        .select("*")
        .eq("alumni_id", authSession.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && rawRequests) {
        if (rawRequests.length > 0) {
          const studentIds = rawRequests.map((r: any) => r.student_id);
          const { data: studentProfiles } = await supabase
            .from("profiles")
            .select("id, name, major, section, avatar_url, profile_pic")
            .in("id", studentIds);

          const enriched = rawRequests.map((req: any) => {
            const prof = studentProfiles?.find((p: any) => p.id === req.student_id);
            return {
              ...req,
              studentProfile: prof || null,
              student_name: prof?.name || req.student_name || "Student",
            };
          });
          setRequests(enriched);
        } else {
          setRequests([]);
        }
      }
    } catch (err) {
      console.error("Error fetching mentorship requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // 3. Fetch Connected Mentees
  const fetchMentees = async () => {
    if (!authSession?.user?.id) return;
    try {
      setLoadingMentees(true);
      const { data: conns, error: connErr } = await supabase
        .from("mentor_connections")
        .select("student_id")
        .eq("alumni_id", authSession.user.id);

      if (!connErr && conns && conns.length > 0) {
        const studentIds = conns.map((c: any) => c.student_id);
        const { data: students, error: studentErr } = await supabase
          .from("profiles")
          .select("id, name, major, section, avatar_url, profile_pic")
          .in("id", studentIds);

        if (!studentErr && students) {
          setMentees(students);
        }
      } else {
        setMentees([]);
      }
    } catch (err) {
      console.error("Error loading mentees:", err);
    } finally {
      setLoadingMentees(false);
    }
  };

  // 4. Fetch Stats Counts & Resources
  const fetchCounts = async () => {
    if (!authSession?.user?.id) return;
    try {
      // Peer connections count
      const { count: peerCount } = await supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`requester_id.eq.${authSession.user.id},addressee_id.eq.${authSession.user.id}`)
        .eq("status", "accepted");

      // Connected mentees count
      const { count: menteeCount } = await supabase
        .from("mentor_connections")
        .select("id", { count: "exact", head: true })
        .eq("alumni_id", authSession.user.id);

      setConnectionCount((peerCount || 0) + (menteeCount || 0));

      // Shared resources count
      const { count: resCount } = await supabase
        .from("alumni_resources")
        .select("id", { count: "exact", head: true })
        .eq("alumni_id", authSession.user.id);

      setResourcesCount(resCount || 0);

      // Recent 3 resources for spotlight
      const { data: resData } = await supabase
        .from("alumni_resources")
        .select("*")
        .eq("alumni_id", authSession.user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentResources(resData || []);
    } catch (err) {
      console.error("Error fetching alumni dashboard counts:", err);
    }
  };

  useEffect(() => {
    fetchAlumniProfile();
    fetchRequests();
    fetchMentees();
    fetchCounts();
  }, [authSession]);

  // Toggle Mentorship Availability
  const handleToggleAvailability = async () => {
    if (!authSession?.user?.id || togglingAvailability) return;
    const nextVal = !isAvailable;
    setIsAvailable(nextVal);
    setTogglingAvailability(true);

    try {
      const { error } = await supabase
        .from("alumni_profiles")
        .update({
          is_available_for_mentorship: nextVal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authSession.user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to update mentorship status:", err);
      setIsAvailable(!nextVal); // rollback
    } finally {
      setTogglingAvailability(false);
    }
  };

  // Accept Request
  const handleAccept = async (requestId: string, studentId: string) => {
    try {
      setProcessingRequestId(requestId);
      const { error: updateErr } = await supabase
        .from("mentorship_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) throw updateErr;

      const { error: connErr } = await supabase
        .from("mentor_connections")
        .insert({
          student_id: studentId,
          alumni_id: authSession.user.id,
          request_id: requestId,
        });

      if (connErr) throw connErr;

      // Notify student
      await supabase.from("notifications").insert({
        user_id: studentId,
        type: "mentorship_accept",
        title: "Mentorship Request Accepted",
        body: `Your mentorship request has been accepted by ${userProfile.name}!`,
        actor_id: authSession.user.id,
        actor_name: userProfile.name,
        read: false,
      });

      fetchRequests();
      fetchMentees();
      fetchCounts();
    } catch (err: any) {
      console.error("Error accepting request:", err);
      alert(err.message || "Failed to accept request.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Decline Request
  const handleDecline = async (requestId: string, studentId: string) => {
    try {
      setProcessingRequestId(requestId);
      const { error: updateErr } = await supabase
        .from("mentorship_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) throw updateErr;

      await supabase.from("notifications").insert({
        user_id: studentId,
        type: "mentorship_decline",
        title: "Mentorship Request Declined",
        body: `Your mentorship request was not accepted by ${userProfile.name}.`,
        actor_id: authSession.user.id,
        actor_name: userProfile.name,
        read: false,
      });

      fetchRequests();
    } catch (err: any) {
      console.error("Error declining request:", err);
      alert(err.message || "Failed to decline request.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Remove Mentee Connection
  const handleRemoveConnection = async (studentId: string, studentName: string) => {
    if (!authSession?.user?.id) return;
    const confirmed = window.confirm(`Remove mentorship connection with ${studentName}?`);
    if (!confirmed) return;

    try {
      setRemovingId(studentId);
      const { error } = await removeMentorshipConnection(authSession.user.id, studentId);
      if (error) throw new Error(error);

      fetchMentees();
      fetchCounts();
    } catch (err: any) {
      console.error("Error removing connection:", err);
      alert(err.message || "Failed to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  const userMajor = alumniProfile?.major || userProfile.major || "Civil";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. EXECUTIVE HERO BANNER (Compact & Modern) */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${cardBg}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Identity cluster */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e9df1] via-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0">
              {userProfile.profilePic || userProfile.avatar_url ? (
                <img
                  src={userProfile.profilePic || userProfile.avatar_url}
                  alt={userProfile.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span>{getInitials(userProfile.name)}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  Alumni · {userMajor.toUpperCase()}
                </span>
                {alumniProfile?.graduation_year && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Class of {alumniProfile.graduation_year}
                  </span>
                )}
              </div>

              <h1 className={`text-lg sm:text-xl font-bold tracking-tight truncate mt-0.5 ${textColor}`}>
                Welcome back, {userProfile.name}
              </h1>

              <p className={`text-xs truncate ${subColor}`}>
                {alumniProfile?.job_title
                  ? `${alumniProfile.job_title}${alumniProfile.company_name ? ` at ${alumniProfile.company_name}` : ""}`
                  : "BUBT Verified Alumni Member"}
              </p>
            </div>
          </div>

          {/* Right Controller: Mentorship Status Toggle */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-[#2f3336]/30">
            {/* Availability Pill Toggle */}
            <button
              onClick={handleToggleAvailability}
              disabled={togglingAvailability}
              title="Click to toggle whether students can send you mentorship requests"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                isAvailable
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20"
              }`}
            >
              {isAvailable ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Open for Mentoring</span>
                </>
              ) : (
                <>
                  <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                  <span>Mentoring Paused</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 2. INTERACTIVE KPI METRIC STRIP (4 Compact Clickable Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Connections */}
        <div
          onClick={() => onNavigate?.("network")}
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer group hover:border-[#1e9df1]/50 ${cardBg}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-bold leading-tight ${textColor}`}>{connectionCount}</p>
              <p className={`text-[11px] truncate ${subColor}`}>Network Contacts</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Metric 2: Pending Requests */}
        <div
          onClick={() => {
            const el = document.getElementById("pending-requests-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer group hover:border-purple-500/50 ${cardBg}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-xl font-bold leading-tight ${textColor}`}>
                  {loadingRequests ? "..." : requests.length}
                </p>
                {requests.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                )}
              </div>
              <p className={`text-[11px] truncate ${subColor}`}>Mentorship Requests</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Metric 3: Feed & Posts */}
        <div
          onClick={() => onNavigate?.("resources")}
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer group hover:border-emerald-500/50 ${cardBg}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Rss className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-bold leading-tight ${textColor}`}>{resourcesCount}</p>
              <p className={`text-[11px] truncate ${subColor}`}>Feed Posts &amp; Tips</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Metric 4: Messages */}
        <div
          onClick={() => onNavigate?.("messages")}
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer group hover:border-[#1e9df1]/50 ${cardBg}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#1e9df1]/10 flex items-center justify-center text-[#1e9df1] flex-shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-xl font-bold leading-tight ${textColor}`}>{unreadMessagesCount}</p>
                {unreadMessagesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#1e9df1] text-white leading-tight">
                    NEW
                  </span>
                )}
              </div>
              <p className={`text-[11px] truncate ${subColor}`}>Unread Messages</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT (Balanced 2-Column Split: 8 / 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT / PRIMARY COLUMN (Span 8) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* A. PENDING MENTORSHIP REQUESTS QUEUE */}
          <div id="pending-requests-section" className={`p-4 sm:p-5 rounded-2xl border ${cardBg} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${textColor}`}>
                  Pending Mentorship Requests
                </h2>
                {requests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    {requests.length} new
                  </span>
                )}
              </div>
              <span className={`text-[11px] ${subColor}`}>
                {requests.length === 0 ? "All caught up" : "Action required"}
              </span>
            </div>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                <Loader />
                <span>Checking requests...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className={`p-6 rounded-xl border text-center ${innerCardBg}`}>
                <UserCheck className="w-8 h-8 mx-auto text-emerald-400/60 mb-2" />
                <p className={`text-xs font-semibold ${textColor}`}>No pending requests right now</p>
                <p className={`text-[11px] max-w-sm mx-auto mt-1 ${subColor}`}>
                  When students in your field request 1-on-1 guidance, their requests will appear here for your review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requests.map((req) => {
                  const student = req.studentProfile;
                  const isProcessing = processingRequestId === req.id;
                  return (
                    <div
                      key={req.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${innerCardBg} hover:border-[#1e9df1]/40 transition-colors`}
                    >
                      <div className="space-y-2">
                        {/* Student identity header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 overflow-hidden">
                              {student?.avatar_url || student?.profile_pic ? (
                                <img
                                  src={student.avatar_url || student.profile_pic}
                                  alt={req.student_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{getInitials(req.student_name)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => {
                                  setSelectedStudentId(req.student_id);
                                  setOnAcceptCallback(() => () => handleAccept(req.id, req.student_id));
                                }}
                                className={`font-bold text-xs truncate text-left hover:text-[#1e9df1] hover:underline focus:outline-none cursor-pointer block ${textColor}`}
                              >
                                {req.student_name}
                              </button>
                              <p className={`text-[10px] truncate ${subColor}`}>
                                {student?.major ? student.major.toUpperCase() : "Student"} · {student?.section || "Intake 51"}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Topic badge */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Compass className="w-3 h-3" />
                          <span>Topic: {req.topic}</span>
                        </div>

                        {/* Message preview */}
                        {req.message && (
                          <p className={`text-[11px] italic line-clamp-2 leading-relaxed ${subColor}`}>
                            "{req.message}"
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#2f3336]/30">
                        <button
                          onClick={() => handleDecline(req.id, req.student_id)}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          <span>Decline</span>
                        </button>
                        <button
                          onClick={() => handleAccept(req.id, req.student_id)}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. ACTIVE MENTEES SHOWCASE */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${cardBg} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${textColor}`}>
                  Active Mentees
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {mentees.length} connected
                </span>
              </div>
              <button
                onClick={() => onNavigate?.("network")}
                className="text-xs text-[#1e9df1] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View all in Network</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loadingMentees ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                <Loader />
                <span>Loading mentees...</span>
              </div>
            ) : mentees.length === 0 ? (
              <div className={`p-6 rounded-xl border text-center ${innerCardBg}`}>
                <GraduationCap className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className={`text-xs font-semibold ${textColor}`}>No active mentees yet</p>
                <p className={`text-[11px] max-w-sm mx-auto mt-1 ${subColor}`}>
                  Once you accept mentorship requests, students will appear here for fast direct messaging and guidance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mentees.map((mentee) => (
                  <div
                    key={mentee.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${innerCardBg} hover:border-[#1e9df1]/40 transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
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
                            onClick={() => {
                              setSelectedStudentId(mentee.id);
                              setOnAcceptCallback(undefined);
                            }}
                            className={`font-bold text-xs truncate text-left hover:text-[#1e9df1] hover:underline focus:outline-none cursor-pointer block ${textColor}`}
                          >
                            {mentee.name}
                          </button>
                          <p className={`text-[10px] truncate ${subColor}`}>
                            Dept: {mentee.major ? mentee.major.toUpperCase() : "BUBT"}
                          </p>
                          {mentee.section && (
                            <p className="text-[10px] text-purple-400 font-semibold truncate">
                              {mentee.section}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveConnection(mentee.id, mentee.name)}
                        disabled={removingId === mentee.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex-shrink-0"
                        title="Remove Connection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Action button */}
                    <div className="pt-2 border-t border-[#2f3336]/30">
                      <button
                        onClick={() => setChatTarget(mentee)}
                        className="w-full py-1.5 rounded-lg bg-[#1e9df1]/10 hover:bg-[#1e9df1]/20 text-[#1e9df1] border border-[#1e9df1]/30 transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT / SECONDARY COLUMN (Span 4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Widget 1: Shared Resources Spotlight */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${cardBg} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${textColor}`}>
                Feed &amp; Community Posts
              </h3>
              <button
                onClick={() => onNavigate?.("resources")}
                className="text-xs text-[#1e9df1] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Feed</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recentResources.length === 0 ? (
              <div className={`p-4 rounded-xl border text-center ${innerCardBg}`}>
                <FileText className="w-6 h-6 mx-auto text-slate-500 mb-2" />
                <p className={`text-xs font-semibold ${textColor}`}>No files shared yet</p>
                <p className={`text-[11px] mt-1 ${subColor}`}>
                  Shared notes, study files, and interview tips will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentResources.map((res) => (
                  <div
                    key={res.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${innerCardBg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${textColor}`}>{res.title}</p>
                        <p className={`text-[10px] truncate ${subColor}`}>
                          {res.type} · {res.visibility === "public" ? "Public" : "Private"}
                        </p>
                      </div>
                    </div>

                    <a
                      href={res.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                      title="Open Resource"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget 2: Mentorship Best Practices */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${cardBg} space-y-3`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className={`text-sm font-bold uppercase tracking-wider ${textColor}`}>
                Mentorship Insights
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className={`p-2.5 rounded-xl border ${innerCardBg} flex gap-2.5`}>
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-semibold ${textColor}`}>Responsive Cadence</p>
                  <p className={`text-[11px] mt-0.5 ${subColor}`}>
                    Try to answer mentee inquiries within 24–48 hours to maintain their study momentum.
                  </p>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${innerCardBg} flex gap-2.5`}>
                <BookOpen className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-semibold ${textColor}`}>Curate Resources</p>
                  <p className={`text-[11px] mt-0.5 ${subColor}`}>
                    Upload industry roadmaps, CV templates, and mock interview tips to the Resources tab.
                  </p>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${innerCardBg} flex gap-2.5`}>
                <Users className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-semibold ${textColor}`}>Connect with Alumni</p>
                  <p className={`text-[11px] mt-0.5 ${subColor}`}>
                    Browse the Network tab to exchange insights with other verified BUBT graduates.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Student Profile Modal */}
      <StudentProfileView
        isOpen={!!selectedStudentId}
        onClose={() => {
          setSelectedStudentId(null);
          setOnAcceptCallback(undefined);
        }}
        studentId={selectedStudentId || ""}
        isDarkMode={isDarkMode}
        onAcceptRequest={onAcceptCallback}
      />

      {/* Instant Mentor Chat Modal */}
      {chatTarget && (
        <MentorChat
          isDarkMode={isDarkMode}
          currentUserId={authSession?.user?.id}
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
