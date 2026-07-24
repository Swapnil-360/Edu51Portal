import { useState, useEffect } from "react";
import { Users, BookOpen, Compass, Check, X, Calendar, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import ChipLoader from "../../ui/ChipLoader";
import StudentProfileView from "../StudentProfileView";
import { removeMentorshipConnection } from "../../../lib/api/mentorshipApi";

interface Props {
  isDarkMode: boolean;
  userProfile: {
    name: string;
    major?: string;
  };
  authSession: any;
}

export default function AlumniHomePage({ isDarkMode, userProfile, authSession }: Props) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mentees, setMentees] = useState<any[]>([]);
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [onAcceptCallback, setOnAcceptCallback] = useState<(() => void) | undefined>(undefined);
  const [connectionCount, setConnectionCount] = useState<number | "...">("...");
  const [resourcesCount, setResourcesCount] = useState<number | "...">("...");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";

  const fetchRequests = async () => {
    if (!authSession?.user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("mentorship_requests")
        .select("*")
        .eq("alumni_id", authSession.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    } catch (err) {
      console.error("Error fetching mentorship requests:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchConnectionCount = async () => {
    if (!authSession?.user?.id) return;
    try {
      // 1. Fetch count of accepted peer connections from connections table
      const { count: peerCount, error: peerErr } = await supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`requester_id.eq.${authSession.user.id},addressee_id.eq.${authSession.user.id}`)
        .eq("status", "accepted");

      if (peerErr) throw peerErr;

      // 2. Fetch count of connected mentees from mentor_connections table
      const { count: menteeCount, error: menteeErr } = await supabase
        .from("mentor_connections")
        .select("id", { count: "exact", head: true })
        .eq("alumni_id", authSession.user.id);

      if (menteeErr) throw menteeErr;

      setConnectionCount((peerCount || 0) + (menteeCount || 0));
    } catch (err) {
      console.error("Error fetching connections count:", err);
      setConnectionCount(0);
    }
  };

  const fetchResourcesCount = async () => {
    if (!authSession?.user?.id) return;
    try {
      const { count, error } = await supabase
        .from("alumni_resources")
        .select("id", { count: "exact", head: true })
        .eq("alumni_id", authSession.user.id);

      if (error) throw error;
      setResourcesCount(count || 0);
    } catch (err) {
      console.error("Error fetching resources count:", err);
      setResourcesCount(0);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchMentees();
    fetchConnectionCount();
    fetchResourcesCount();
  }, [authSession]);

  const handleRemoveConnection = async (studentId: string, studentName: string) => {
    if (!authSession?.user?.id) return;
    const confirmed = window.confirm(`Are you sure you want to remove this connection with ${studentName}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setRemovingId(studentId);
      const { error } = await removeMentorshipConnection(authSession.user.id, studentId);
      if (error) throw new Error(error);

      alert("Connection removed successfully.");
      fetchMentees();
      fetchConnectionCount();
    } catch (err: any) {
      console.error("Error removing connection:", err);
      alert(err.message || "Failed to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAccept = async (requestId: string, studentId: string) => {
    try {
      // 1. Update request status to accepted
      const { error: updateErr } = await supabase
        .from("mentorship_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) throw updateErr;

      // 2. Create connection in mentor_connections
      const { error: connErr } = await supabase
        .from("mentor_connections")
        .insert({
          student_id: studentId,
          alumni_id: authSession.user.id,
          request_id: requestId
        });

      if (connErr) throw connErr;

      // 3. Notify student
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert({
          user_id: studentId,
          type: "mentorship_accept",
          title: "Mentorship Request Accepted",
          body: `Your mentorship request has been accepted by ${userProfile.name}!`,
          actor_id: authSession.user.id,
          actor_name: userProfile.name,
          read: false
        });

      if (notifErr) {
        console.error("Failed to send acceptance notification:", notifErr);
      }

      alert("Mentorship request accepted!");
      fetchRequests();
      fetchMentees();
    } catch (err: any) {
      console.error("Error accepting request:", err);
      alert(err.message || "Failed to accept request.");
    }
  };

  const handleDecline = async (requestId: string, studentId: string) => {
    try {
      // 1. Update request status to declined
      const { error: updateErr } = await supabase
        .from("mentorship_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) throw updateErr;

      // 2. Notify student
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert({
          user_id: studentId,
          type: "mentorship_decline",
          title: "Mentorship Request Declined",
          body: `Your mentorship request was not accepted by ${userProfile.name}.`,
          actor_id: authSession.user.id,
          actor_name: userProfile.name,
          read: false
        });

      if (notifErr) {
        console.error("Failed to send decline notification:", notifErr);
      }

      alert("Mentorship request declined.");
      fetchRequests();
    } catch (err: any) {
      console.error("Error declining request:", err);
      alert(err.message || "Failed to decline request.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${cardBg}`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${textColor}`}>
            Welcome back, {userProfile.name}! 👋
          </h1>
          <p className={`text-sm sm:text-base ${subColor}`}>
            Alumni · {userProfile.major ? userProfile.major.toUpperCase() : "CSE"}
          </p>
        </div>
        <button
          onClick={() => {
            fetchRequests();
            fetchMentees();
            fetchConnectionCount();
            fetchResourcesCount();
          }}
          className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer h-fit ${
            isDarkMode
              ? "border-[#2f3336] bg-[#16181c] text-[#e7e9ea] hover:bg-[#2f3336]"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          title="Refresh statistics"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v8" />
          </svg>
          Sync Stats
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>{connectionCount}</p>
            <p className={`text-xs ${subColor}`}>My Connections</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>{loading ? "..." : requests.length}</p>
            <p className={`text-xs ${subColor}`}>Mentorship Requests</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>{resourcesCount}</p>
            <p className={`text-xs ${subColor}`}>Shared Resources</p>
          </div>
        </div>
      </div>

      {/* Pending Mentorship Requests Queue */}
      {requests.length > 0 && (
        <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <h2 className={`text-lg font-bold ${textColor}`}>Pending Mentorship Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-xl border flex flex-col gap-3 justify-between ${
                  isDarkMode ? "bg-slate-900/40 border-[#2f3336]/40" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedStudentId(req.student_id);
                        setOnAcceptCallback(() => () => handleAccept(req.id, req.student_id));
                      }}
                      className={`font-bold text-sm text-left hover:underline focus:outline-none cursor-pointer ${textColor}`}
                    >
                      {req.student_name}
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
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

                <div className="flex gap-2 border-t border-[#2f3336]/10 pt-3 mt-2">
                  <button
                    onClick={() => handleDecline(req.id, req.student_id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-500/20 text-red-300 hover:bg-red-500/30 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(req.id, req.student_id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Mentees List */}
      <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
        <h2 className={`text-lg font-bold ${textColor}`}>My Mentees</h2>
        {loadingMentees ? (
          <div className="flex flex-col items-center gap-1 text-xs text-slate-500 py-4">
            <ChipLoader size="sm" />
            Loading mentees...
          </div>
        ) : mentees.length === 0 ? (
          <p className={`text-xs ${subColor}`}>
            No mentees connected yet. Accepted mentorship requests will build your connections here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mentees.map((mentee) => (
              <div
                key={mentee.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isDarkMode ? "bg-slate-900/40 border-[#2f3336]/40" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex gap-3 items-center min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500/30 flex-shrink-0 bg-slate-800">
                    {mentee.avatar_url || mentee.profile_pic ? (
                      <img src={mentee.avatar_url || mentee.profile_pic} alt={mentee.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-purple-600">
                        {mentee.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => {
                        setSelectedStudentId(mentee.id);
                        setOnAcceptCallback(undefined);
                      }}
                      className={`font-bold text-xs truncate text-left hover:underline focus:outline-none cursor-pointer ${textColor}`}
                    >
                      {mentee.name}
                    </button>
                    <p className={`text-[10px] truncate ${subColor}`}>
                      Dept: {mentee.major ? mentee.major.toUpperCase() : "CSE"}
                    </p>
                    {mentee.section && (
                      <p className="text-[10px] text-purple-400 font-semibold">
                        Section: {mentee.section}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveConnection(mentee.id, mentee.name)}
                  disabled={removingId === mentee.id}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 cursor-pointer ${
                    removingId === mentee.id 
                      ? "text-slate-500 bg-slate-500/10 cursor-not-allowed" 
                      : "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  }`}
                  title="Remove Connection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed Section */}
      <div className={`p-6 rounded-2xl border ${cardBg}`}>
        <h2 className={`text-lg font-bold mb-4 ${textColor}`}>Recent Activity</h2>
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <p className={`text-sm font-medium ${textColor}`}>No recent activity</p>
          <p className={`text-xs max-w-xs ${subColor}`}>
            Activity from your network and upcoming alumni events will show up here.
          </p>
        </div>
      </div>

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
    </div>
  );
}
