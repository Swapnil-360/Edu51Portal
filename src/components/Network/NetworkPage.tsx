import { useEffect, useState } from "react";
import { Loader2, Search, UserCheck, UserPlus, UserX, X, Users, Inbox, SearchX, GraduationCap, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Connection, SocialProfile } from "../../types/social";
import {
  listMyConnections,
  respondToRequest,
  removeConnection,
  searchUsers,
  sendConnectionRequest,
} from "../../lib/api/connectionsApi";
import UserCard from "./UserCard";
import { supabase } from "../../lib/supabase";
import MentorChat from "../Alumni/MentorChat";
import ChipLoader from "../ui/ChipLoader";

type Tab = "connections" | "requests" | "discover";

interface Props {
  currentUserId: string;
  onClose: () => void;
  onViewProfile: (username: string) => void;
  isDarkMode: boolean;
  onPendingRequestsChange?: (count: number) => void;
  onViewAlumniProfile?: (alumniId: string) => void;
  goToAlumniHub?: () => void;
}

export default function NetworkPage({ 
  currentUserId, 
  onClose, 
  onViewProfile, 
  isDarkMode, 
  onPendingRequestsChange,
  onViewAlumniProfile,
  goToAlumniHub
}: Props) {
  const [tab, setTab] = useState<Tab>("connections");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // discover state
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Mentors state
  const [mentors, setMentors] = useState<any[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [chatTarget, setChatTarget] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);

  const fetchMentors = async () => {
    try {
      setLoadingMentors(true);
      const { data: conns, error: connErr } = await supabase
        .from("mentor_connections")
        .select("id, alumni_id")
        .eq("student_id", currentUserId);

      if (connErr) throw connErr;

      if (conns && conns.length > 0) {
        const alumniIds = conns.map((c) => c.alumni_id);
        const { data: profiles, error: profileErr } = await supabase
          .from("alumni_profiles")
          .select("id, full_name, job_title, company_name, major, graduation_year, avatar_url")
          .in("id", alumniIds);

        if (profileErr) throw profileErr;
        setMentors(profiles || []);
      } else {
        setMentors([]);
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);
    } finally {
      setLoadingMentors(false);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, profile_pic")
        .eq("id", currentUserId)
        .single();
      if (!error && data) {
        setCurrentUserProfile(data);
      }
    } catch (err) {
      console.error("Error fetching student profile:", err);
    }
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const conns = await listMyConnections(currentUserId);
    setConnections(conns);
    const incomingCount = conns.filter((c) => c.status === "pending" && c.addressee_id === currentUserId).length;
    onPendingRequestsChange?.(incomingCount);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    load();
    fetchMentors();
    fetchStudentProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const accepted = connections.filter((c) => c.status === "accepted");
  const incoming = connections.filter((c) => c.status === "pending" && c.addressee_id === currentUserId);
  const outgoing = connections.filter((c) => c.status === "pending" && c.requester_id === currentUserId);

  const runSearch = async () => {
    setSearching(true);
    const skills = skillFilter.trim() ? skillFilter.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const found = await searchUsers(
      { query: query.trim() || undefined, skills, excludeIds: [currentUserId] },
      30,
    );
    setResults(found);
    setSearching(false);
  };

  useEffect(() => {
    if (tab === "discover") runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const connStateFor = (userId: string): Connection | undefined =>
    connections.find((c) => c.requester_id === userId || c.addressee_id === userId);

  const handleAction = async (fn: () => Promise<{ error: string | null }>, key: string) => {
    setBusy(key);
    setActionError(null);
    const result = await fn();
    if (result?.error) setActionError(result.error);
    await load(true);
    setBusy(null);
  };

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-100";
  const title = isDarkMode ? "text-white" : "text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const inputCls = `px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
  }`;

  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      className={`relative px-5 py-2 rounded-full text-sm transition-colors duration-150 flex items-center gap-2 ${
        tab === t
          ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/20"
          : isDarkMode ? "font-medium text-[#71767b] hover:text-[#e7e9ea]" : "font-medium text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          tab === t ? "bg-white/20 text-white" : "bg-[#1e9df1] text-white"
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  const viewProfile = (p: SocialProfile) => {
    onViewProfile(p.username || p.id);
  };

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* SECTION — "My Mentors" */}
        <div className="mb-8">
          <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${title}`}>
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            My Mentors
          </h2>

          {loadingMentors ? (
            <div className="flex flex-col items-center gap-1 text-xs text-slate-500 py-6 justify-center">
              <ChipLoader size="sm" />
              Loading mentors...
            </div>
          ) : mentors.length === 0 ? (
            <div className={`p-6 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="text-center sm:text-left">
                <p className={`text-sm font-semibold ${title}`}>No mentors yet</p>
                <p className={`text-xs ${sub} mt-0.5`}>Browse BUBT alumni directory to connect and get guidance!</p>
              </div>
              <button
                onClick={goToAlumniHub}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Find a Mentor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                    isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-500/30 bg-slate-800 flex-shrink-0">
                        {mentor.avatar_url ? (
                          <img src={mentor.avatar_url} alt={mentor.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-emerald-600">
                            {mentor.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-bold text-sm truncate ${title}`}>{mentor.full_name}</p>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            Verified Alumni
                          </span>
                        </div>
                        <p className={`text-xs text-purple-400 font-semibold truncate`}>{mentor.major} {mentor.graduation_year ? `(${mentor.graduation_year})` : ""}</p>
                        <p className={`text-xs text-slate-400 truncate mt-0.5`}>
                          {mentor.job_title} {mentor.company_name ? `@ ${mentor.company_name}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-[#2f3336]/10 pt-3 mt-1">
                    <button
                      onClick={() => setChatTarget(mentor)}
                      className="flex-1 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </button>
                    <button
                      onClick={() => onViewAlumniProfile?.(mentor.id)}
                      className={`flex-1 py-2 rounded-lg transition-all font-semibold text-xs border cursor-pointer ${
                        isDarkMode
                          ? "bg-transparent text-slate-300 border-[#2f3336] hover:bg-[#1f2226]"
                          : "bg-transparent text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-[#2f3336]/10 mb-8" />

        {/* Pill tab row — matches navbar style */}
        <div className={`inline-flex items-center rounded-full p-1.5 gap-0.5 border mb-6 ${
          isDarkMode
            ? "bg-[#16181c] border-[#2f3336] shadow-lg shadow-black/20"
            : "bg-white border-slate-300 shadow-md shadow-black/8"
        }`}>
          {tabBtn("connections", "Connections", accepted.length)}
          {tabBtn("requests", "Requests", incoming.length)}
          {tabBtn("discover", "Discover")}
        </div>

        {actionError && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            {actionError}
            <button onClick={() => setActionError(null)} className="ml-3 text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <ChipLoader size="lg" />
          </div>
        ) : tab === "connections" ? (
          <div className="space-y-3">
            {accepted.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center gap-4"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                  <Users size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>No connections yet</p>
                  <p className={`text-xs mt-1 ${sub}`}>Find and connect with classmates</p>
                </div>
                <button
                  onClick={() => setTab("discover")}
                  className="px-4 py-2 rounded-xl bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-bold transition-colors"
                >
                  Discover People
                </button>
              </motion.div>
            )}
            {accepted.map((c) =>
              c.other_profile ? (
                <UserCard
                  key={c.id}
                  profile={c.other_profile}
                  isDarkMode={isDarkMode}
                  onView={viewProfile}
                  action={
                    <button
                      onClick={() => handleAction(() => removeConnection(c.id), c.id)}
                      disabled={busy === c.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                        isDarkMode ? "bg-[#16181c] text-slate-400 hover:text-red-400" : "bg-slate-100 text-slate-500 hover:text-red-500"
                      }`}
                    >
                      {busy === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                      Remove
                    </button>
                  }
                />
              ) : null,
            )}
          </div>
        ) : tab === "requests" ? (
          <div className="space-y-5">
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${title}`}>Incoming ({incoming.length})</h3>
              <div className="space-y-3">
                {incoming.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${isDarkMode ? "border-[#2f3336] bg-[#17181c]/50" : "border-slate-100 bg-slate-50"}`}>
                    <Inbox size={16} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                    <p className={`text-sm ${sub}`}>No incoming requests</p>
                  </motion.div>
                )}
                {incoming.map((c) =>
                  c.other_profile ? (
                    <UserCard
                      key={c.id}
                      profile={c.other_profile}
                      isDarkMode={isDarkMode}
                      onView={viewProfile}
                      action={
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAction(() => respondToRequest(c.id, true), c.id)}
                            disabled={busy === c.id}
                            className="px-3 py-1.5 rounded-lg bg-[#1e9df1] text-white text-xs font-medium hover:bg-[#1677cc] flex items-center gap-1"
                          >
                            {busy === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                            Accept
                          </button>
                          <button
                            onClick={() => handleAction(() => respondToRequest(c.id, false), `r-${c.id}`)}
                            disabled={busy === `r-${c.id}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              isDarkMode ? "bg-[#16181c] text-slate-400" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      }
                    />
                  ) : null,
                )}
              </div>
            </div>
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${title}`}>Sent ({outgoing.length})</h3>
              <div className="space-y-3">
                {outgoing.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${isDarkMode ? "border-[#2f3336] bg-[#17181c]/50" : "border-slate-100 bg-slate-50"}`}>
                    <UserPlus size={16} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                    <p className={`text-sm ${sub}`}>No sent requests</p>
                  </motion.div>
                )}
                {outgoing.map((c) =>
                  c.other_profile ? (
                    <UserCard
                      key={c.id}
                      profile={c.other_profile}
                      isDarkMode={isDarkMode}
                      onView={viewProfile}
                      action={
                        <button
                          onClick={() => handleAction(() => removeConnection(c.id), c.id)}
                          disabled={busy === c.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            isDarkMode ? "bg-[#16181c] text-slate-400 hover:text-red-400" : "bg-slate-100 text-slate-500 hover:text-red-500"
                          }`}
                        >
                          Cancel
                        </button>
                      }
                    />
                  ) : null,
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Discover */
          <div>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                className={`${inputCls} flex-1`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search by name, username, headline…"
              />
              <input
                className={`${inputCls} flex-1`}
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Skills (comma separated)"
              />
              <button
                onClick={runSearch}
                className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm font-medium hover:bg-[#1677cc] flex items-center gap-2 justify-center transition-colors"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </div>

            {searching ? (
              <div className="flex justify-center py-16">
                <ChipLoader size="lg" />
              </div>
            ) : (
              <div className="space-y-3">
                {results.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center gap-3"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                      <SearchX size={24} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>No users found</p>
                      <p className={`text-xs mt-1 ${sub}`}>Try a different name, username, or skill</p>
                    </div>
                  </motion.div>
                )}
                {results.map((p) => {
                  const existing = connStateFor(p.id);
                  return (
                    <UserCard
                      key={p.id}
                      profile={p}
                      isDarkMode={isDarkMode}
                      onView={viewProfile}
                      action={
                        existing && existing.status !== "rejected" ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              existing.status === "accepted"
                                ? isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                                : isDarkMode ? "bg-[#16181c] text-slate-400" : "bg-slate-100 text-slate-500"
                            }`}>
                              {existing.status === "accepted" ? "Connected" : "Pending"}
                            </span>
                            {existing.status === "pending" && (
                              <button
                                onClick={() => handleAction(() => removeConnection(existing.id), existing.id)}
                                disabled={busy === existing.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  isDarkMode
                                    ? "bg-[#16181c] text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-[#2f3336]"
                                    : "bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200"
                                }`}
                              >
                                {busy === existing.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  "Remove Request"
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAction(() => sendConnectionRequest(currentUserId, p.id), p.id)}
                            disabled={busy === p.id}
                            className="px-3 py-1.5 rounded-lg bg-[#1e9df1] text-white text-xs font-medium hover:bg-[#1677cc] flex items-center gap-1 transition-colors"
                          >
                            {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                            Connect
                          </button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {chatTarget && (
        <MentorChat
          isDarkMode={isDarkMode}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          targetUserId={chatTarget.id}
          targetUserName={chatTarget.full_name}
          targetUserAvatar={chatTarget.avatar_url}
          isTargetAlumni={true}
          onClose={() => {
            setChatTarget(null);
            fetchMentors();
          }}
        />
      )}
    </div>
  );
}
