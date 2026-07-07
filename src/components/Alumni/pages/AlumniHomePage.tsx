import { useState, useEffect } from "react";
import { Users, BookOpen, Compass, Check, X, Calendar, MessageSquare } from "lucide-react";
import { supabase } from "../../../lib/supabase";

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

  useEffect(() => {
    fetchRequests();
  }, [authSession]);

  const handleAccept = async (requestId: string, studentId: string) => {
    try {
      // 1. Update request status to accepted
      const { error: updateErr } = await supabase
        .from("mentorship_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) throw updateErr;

      // 2. Notify student
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
      <div className={`p-6 sm:p-8 rounded-2xl border ${cardBg}`}>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${textColor}`}>
          Welcome back, {userProfile.name}! 👋
        </h1>
        <p className={`text-sm sm:text-base ${subColor}`}>
          Alumni · {userProfile.major ? userProfile.major.toUpperCase() : "CSE"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>12</p>
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
            <p className={`text-2xl font-bold ${textColor}`}>5</p>
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
                    <p className={`font-bold text-sm ${textColor}`}>{req.student_name}</p>
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
    </div>
  );
}
