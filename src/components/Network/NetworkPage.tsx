import { useEffect, useState } from "react";
import { Loader2, Search, UserCheck, UserPlus, UserX, X, Users, Inbox, SearchX } from "lucide-react";
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
import ChipLoader from "../ui/ChipLoader";

type Tab = "connections" | "requests" | "discover";
type ConnectionFilter = "all" | "students" | "alumni";

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
  const [connFilter, setConnFilter] = useState<ConnectionFilter>("all");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // discover state
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const conns = await listMyConnections(currentUserId);
    console.log("Raw connections:", conns);

    const mapped = conns.map((c) => {
      const p = c.other_profile;
      return {
        id: c.id,
        profileId: p?.id || "",
        name: p?.name || "User",
        avatar: p?.avatar_url || p?.profile_pic || null,
        headline: p?.headline || (p?.section ? `${p.section} · ${p.major}` : null),
        is_alumni: p?.is_alumni || false,
        status: c.status,
        requester_id: c.requester_id,
        addressee_id: c.addressee_id,
        is_mentorship: c.is_mentorship,
        skills: p?.skills || []
      };
    });

    console.log("mapped connections:", mapped);

    setConnections(mapped);

    const incomingCount = mapped.filter((c) => c.status === "pending" && c.addressee_id === currentUserId).length;
    onPendingRequestsChange?.(incomingCount);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const accepted = connections.filter((c) => c.status === "accepted");
  const incoming = connections.filter((c) => c.status === "pending" && c.addressee_id === currentUserId);
  const outgoing = connections.filter((c) => c.status === "pending" && c.requester_id === currentUserId);

  const totalAllCount = accepted.length;
  const totalStudentCount = accepted.filter(
    (c) => c.is_alumni === false
  ).length;
  const totalAlumniCount = accepted.filter(
    (c) => c.is_alumni === true
  ).length;

  const filteredConnections = accepted.filter((c) => {
    if (connFilter === "students") {
      return c.is_alumni === false;
    }
    if (connFilter === "alumni") {
      return c.is_alumni === true;
    }
    return true;
  });

  const getEmptyMessage = () => {
    if (connFilter === "students") return "No student connections found.";
    if (connFilter === "alumni") return "No alumni connections found.";
    return "No connections found.";
  };

  useEffect(() => {
    console.log("all connections:", accepted);
    console.log("alumni connections:", accepted.filter((c) => c.is_alumni === true));
  }, [accepted]);

  // Debug log for active filter changes and count updates
  useEffect(() => {
    console.log(`[DEBUG] Filter updated to: "${connFilter}"`);
    console.log(`[DEBUG] Filtered result count: ${filteredConnections.length}`);
  }, [connFilter, filteredConnections.length]);

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
  const inputCls = `px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
    }`;

  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      className={`relative px-5 py-2 rounded-full text-sm transition-colors duration-150 flex items-center gap-2 ${tab === t
          ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/20"
          : isDarkMode ? "font-medium text-[#71767b] hover:text-[#e7e9ea]" : "font-medium text-slate-500 hover:text-slate-800"
        }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t ? "bg-white/20 text-white" : "bg-[#1e9df1] text-white"
          }`}>
          {count}
        </span>
      )}
    </button>
  );

  const filterBtn = (f: ConnectionFilter, label: string, count: number) => (
    <button
      onClick={() => setConnFilter(f)}
      className={`px-4 py-1.5 rounded-full text-xs transition-colors duration-150 flex items-center gap-1.5 border ${connFilter === f
          ? "bg-[#1e9df1]/10 text-[#1e9df1] border-[#1e9df1]/30 font-bold"
          : isDarkMode
            ? "bg-transparent border-[#2f3336] text-[#71767b] hover:text-[#e7e9ea] hover:border-[#71767b]"
            : "bg-transparent border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400"
        }`}
    >
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${connFilter === f
          ? "bg-[#1e9df1]/20 text-[#1e9df1]"
          : isDarkMode
            ? "bg-[#16181c] text-[#71767b]"
            : "bg-slate-100 text-slate-500"
        }`}>
        {count}
      </span>
    </button>
  );

  const getSocialProfile = (c: any): SocialProfile => ({
    id: c.profileId,
    name: c.name,
    avatar_url: c.avatar,
    profile_pic: null,
    headline: c.headline,
    skills: c.skills || [],
    is_alumni: c.is_alumni,
    username: null,
    about: null,
    location: null,
    website: null,
    social_links: {},
    cover_photo_url: null,
    interests: [],
    visibility: "users",
    is_admin: false,
    section: null,
    major: null,
    department: null,
    bubt_email: null,
    phone: null,
    created_at: new Date().toISOString()
  });

  const viewProfile = (p: SocialProfile) => {
    onViewProfile(p.username || p.id);
  };

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>

      <div className="max-w-3xl mx-auto px-4 pt-6">


        {/* Pill tab row — matches navbar style */}
        <div className={`inline-flex items-center rounded-full p-1.5 gap-0.5 border mb-6 ${isDarkMode
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
            {/* Connection Sub-filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filterBtn("all", "All", totalAllCount)}
              {filterBtn("students", "Students", totalStudentCount)}
              {filterBtn("alumni", "Alumni", totalAlumniCount)}
            </div>

            {filteredConnections.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center gap-4"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                  <Users size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>
                    {getEmptyMessage()}
                  </p>
                  {connFilter === "all" && (
                    <>
                      <p className={`text-xs mt-1 ${sub}`}>Find and connect with classmates</p>
                      <button
                        onClick={() => setTab("discover")}
                        className="px-4 py-2 mt-3 rounded-xl bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-bold transition-colors"
                      >
                        Discover People
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
            {filteredConnections.map((c) => (
              <UserCard
                key={c.id}
                profile={getSocialProfile(c)}
                isDarkMode={isDarkMode}
                onView={viewProfile}
                action={
                  <button
                    onClick={() => handleAction(() => removeConnection(c.id, c.is_mentorship), c.id)}
                    disabled={busy === c.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${isDarkMode ? "bg-[#16181c] text-slate-400 hover:text-red-400" : "bg-slate-100 text-slate-500 hover:text-red-500"
                      }`}
                  >
                    {busy === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                    Remove
                  </button>
                }
              />
            ))}
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
                {incoming.map((c) => (
                  <UserCard
                    key={c.id}
                    profile={getSocialProfile(c)}
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? "bg-[#16181c] text-slate-400" : "bg-slate-100 text-slate-500"
                            }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    }
                  />
                ))}
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
                {outgoing.map((c) => (
                  <UserCard
                    key={c.id}
                    profile={getSocialProfile(c)}
                    isDarkMode={isDarkMode}
                    onView={viewProfile}
                    action={
                      <button
                        onClick={() => handleAction(() => removeConnection(c.id), c.id)}
                        disabled={busy === c.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? "bg-[#16181c] text-slate-400 hover:text-red-400" : "bg-slate-100 text-slate-500 hover:text-red-500"
                          }`}
                      >
                        Cancel
                      </button>
                    }
                  />
                ))}
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
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${existing.status === "accepted"
                                ? isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                                : isDarkMode ? "bg-[#16181c] text-slate-400" : "bg-slate-100 text-slate-500"
                              }`}>
                              {existing.status === "accepted" ? "Connected" : "Pending"}
                            </span>
                            {existing.status === "pending" && (
                              <button
                                onClick={() => handleAction(() => removeConnection(existing.id), existing.id)}
                                disabled={busy === existing.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDarkMode
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


    </div>
  );
}
