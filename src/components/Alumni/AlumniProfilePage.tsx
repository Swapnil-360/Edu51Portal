import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Linkedin, MapPin, Calendar, BookOpen, Quote, ShieldCheck } from "lucide-react";
import { useAlumniById } from "../../hooks/useAlumni";
import { supabase } from "../../lib/supabase";

interface Props {
  id: string;
  isDarkMode: boolean;
  onBack: () => void;
  authSession: any;
  userProfile: any;
}

export default function AlumniProfilePage({ id, isDarkMode, onBack, authSession, userProfile }: Props) {
  const { alumni, loading, error } = useAlumniById(id);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState("Career Guidance");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkMentorshipStatus = async () => {
      if (!authSession?.user?.id || !id) return;
      try {
        setCheckingRequest(true);
        // 1. Check if connected
        const { data: connData, error: connErr } = await supabase
          .from("mentor_connections")
          .select("id")
          .eq("student_id", authSession.user.id)
          .eq("alumni_id", id)
          .maybeSingle();

        if (!connErr && connData) {
          setIsConnected(true);
          return;
        }

        // 2. Check if pending request exists
        const { data: reqData, error: reqErr } = await supabase
          .from("mentorship_requests")
          .select("status")
          .eq("student_id", authSession.user.id)
          .eq("alumni_id", id)
          .eq("status", "pending")
          .maybeSingle();

        if (!reqErr && reqData) {
          setHasPendingRequest(true);
        }
      } catch (err) {
        console.error("Error checking mentorship status:", err);
      } finally {
        setCheckingRequest(false);
      }
    };
    checkMentorshipStatus();
  }, [authSession, id]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSession?.user?.id) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Insert request
      const { error: insertErr } = await supabase
        .from("mentorship_requests")
        .insert({
          student_id: authSession.user.id,
          alumni_id: id,
          student_name: userProfile.name,
          student_email: userProfile.bubtEmail,
          topic,
          message: message || null,
          status: "pending"
        });

      if (insertErr) throw insertErr;

      // Send in-app notification to the alumni user
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert({
          user_id: id,
          type: "mentorship_request",
          title: "New Mentorship Request",
          body: `${userProfile.name} wants your guidance on ${topic}`,
          actor_id: authSession.user.id,
          actor_name: userProfile.name,
          read: false
        });

      if (notifErr) {
        console.error("Failed to send notification to alumni:", notifErr);
      }

      setHasPendingRequest(true);
      setShowModal(false);
      alert("Request sent! Alumni will respond soon.");
    } catch (err: any) {
      console.error("Error submitting mentorship request:", err);
      setErrorMsg(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200 shadow-sm";

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1e9df1]"></div>
          <span className={`text-xs ${subColor}`}>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !alumni) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 text-center ${pageBg}`}>
        <p className="text-red-400 text-sm mb-4">{error || "Profile not found."}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-xs font-semibold hover:bg-[#1677cc]"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Back Navigation */}
        <button
          onClick={onBack}
          className={`flex items-center gap-2 mb-6 text-sm font-semibold hover:underline ${textColor}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </button>

        {/* Profile Card */}
        <div className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 ${cardBg}`}>
          {/* Top Header Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
            {/* Big Avatar */}
            <div
              className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#1e9df1] to-[#1677cc] flex items-center justify-center text-3xl font-bold text-white shadow-md flex-shrink-0"
            >
              {alumni.avatar_url ? (
                <img src={alumni.avatar_url} alt={alumni.full_name} className="w-full h-full object-cover" />
              ) : (
                <span>
                  {alumni.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>

            {/* Name and Basic Role */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <h2 className={`text-2xl font-bold ${textColor}`}>
                  {alumni.full_name}
                </h2>
                {alumni.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1e9df1]/10 text-[#1e9df1] border border-[#1e9df1]/20 self-center">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Alumni
                  </span>
                )}
              </div>

              {alumni.job_title ? (
                <p className={`text-base font-semibold ${isDarkMode ? "text-[#1e9df1]" : "text-[#1677cc]"}`}>
                  {alumni.job_title}
                  {alumni.company_name ? ` at ${alumni.company_name}` : ""}
                </p>
              ) : (
                <p className={`text-sm italic ${subColor}`}>Graduate</p>
              )}

              {/* Info Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                  <span className="uppercase">{alumni.major}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Class of {alumni.graduation_year}
                </span>
                {alumni.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {alumni.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons row */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 border-t border-b border-[#2f3336]/10 py-4">
            {alumni.linkedin_url && (
              <a
                href={alumni.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] text-white text-xs font-semibold hover:bg-[#006399] transition-colors shadow-sm"
              >
                <Linkedin className="h-4 w-4" />
                Connect on LinkedIn
              </a>
            )}
            <a
              href={`mailto:${alumni.email}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </a>
            {alumni.is_available_for_mentorship && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                ✓ Available to Mentor Students
              </span>
            )}
            {alumni.is_available_for_mentorship && authSession?.user && !userProfile?.isAlumni && (
              isConnected ? (
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✓ Connected as Mentor
                </span>
              ) : hasPendingRequest ? (
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ⏳ Request Pending
                </span>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Request Mentorship
                </button>
              )
            )}
          </div>

          {/* Bio Section */}
          {alumni.bio && (
            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                About
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                {alumni.bio}
              </p>
            </div>
          )}

          {/* Career Tips Section */}
          {alumni.career_tips && (
            <div className="space-y-3">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Career Advice for Students
              </h3>
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isDarkMode ? "bg-amber-950/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
              }`}>
                <Quote className={`h-5 w-5 flex-shrink-0 transform rotate-180 ${
                  isDarkMode ? "text-amber-400" : "text-amber-500"
                }`} />
                <p className={`text-sm italic leading-relaxed ${isDarkMode ? "text-amber-200/90" : "text-amber-900"}`}>
                  {alumni.career_tips}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mentorship Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in animate-duration-150">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${isDarkMode ? "bg-[#17181c] border-[#2f3336] text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-lg font-bold mb-4">Request Mentorship from {alumni.full_name}</h3>
            
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Mentorship Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${isDarkMode ? "bg-[#16181c] border-[#2f3336] text-white" : "bg-white border-slate-200 text-slate-900"}`}
                >
                  <option value="Career Guidance">Career Guidance</option>
                  <option value="Job Search Help">Job Search Help</option>
                  <option value="Technical Skills">Technical Skills</option>
                  <option value="Interview Prep">Interview Prep</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Personal Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell the alumni what you need help with..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${isDarkMode ? "bg-[#16181c] border-[#2f3336] text-white" : "bg-white border-slate-200 text-slate-900"}`}
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border ${isDarkMode ? "bg-[#16181c] border-[#2f3336] text-[#d9d9d9] hover:bg-[#2f3336]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1e9df1] hover:bg-[#1677cc] text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
