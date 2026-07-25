import { useEffect, useState, useCallback } from "react";
import { Loader2, Mail, Plus, Search, Users, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Team,
  TeamCategory,
  TeamInvitation,
  TeamJoinRequest,
  TEAM_CATEGORY_LABELS,
} from "../../types/social";
import {
  discoverTeams,
  listMyTeams,
  listMyInvitations,
  listMyJoinRequests,
  requestToJoin,
  respondToInvitation,
  cancelJoinRequest,
} from "../../lib/api/teamsApi";
import TeamCard from "./TeamCard";
import CreateTeamModal from "./CreateTeamModal";
import Loader from "../ui/Loader";

type Tab = "discover" | "mine";

interface Props {
  currentUserId: string;
  onClose: () => void;
  onOpenTeam: (teamId: string) => void;
  isDarkMode: boolean;
}

export default function TeamsPage({ currentUserId, onClose, onOpenTeam, isDarkMode }: Props) {
  const [tab, setTab] = useState<Tab>("discover");
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [myRequests, setMyRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TeamCategory | "">("");
  const [skillFilter, setSkillFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = async () => {
    setLoading(true);
    const [discovered, mine, invs, reqs] = await Promise.all([
      discoverTeams({}),
      listMyTeams(currentUserId),
      listMyInvitations(currentUserId),
      listMyJoinRequests(currentUserId),
    ]);
    setTeams(discovered);
    setMyTeams(mine);
    setInvitations(invs);
    setMyRequests(reqs);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const runSearch = async () => {
    setLoading(true);
    const skills = skillFilter.trim() ? skillFilter.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    setTeams(await discoverTeams({ query: query.trim() || undefined, category: category || undefined as any, skills }));
    setLoading(false);
  };

  const myTeamIds = new Set(myTeams.map((t) => t.id));
  const pendingReqByTeam = new Map(myRequests.map((r) => [r.team_id, r]));

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-100";
  const title = isDarkMode ? "text-[#e7e9ea]" : "text-slate-900";
  const sub = isDarkMode ? "text-[#71767b]" : "text-[#71767b]";
  const inputCls = `px-3 py-2 rounded-lg text-sm border outline-none ${
    isDarkMode
      ? "bg-[#16181c] border-[#38444d] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-[#1e9df1]"
  }`;

  const handleJoinAction = async (team: Team) => {
    setBusy(team.id);
    const existing = pendingReqByTeam.get(team.id);
    if (existing) {
      await cancelJoinRequest(existing.id);
      showToast("Request cancelled");
    } else {
      await requestToJoin(team.id, currentUserId);
      showToast(`Request sent to ${team.name}!`);
    }
    setMyRequests(await listMyJoinRequests(currentUserId));
    setBusy(null);
  };

  const handleInvitation = async (inv: TeamInvitation, accept: boolean) => {
    setBusy(inv.id);
    await respondToInvitation(inv.id, accept);
    await load();
    setBusy(null);
  };

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      {/* Toast */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-semibold ${
                isDarkMode ? "bg-[#16181c] border border-[#2f3336] text-[#e7e9ea]" : "bg-white border border-slate-200 text-slate-900 shadow-black/10"
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className={`text-xl font-bold ${title}`}>Team Building</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl bg-[#1e9df1] text-white text-sm font-semibold hover:bg-[#1677cc] flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Team
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Pending invitations strip */}
        {invitations.length > 0 && (
          <div className={`rounded-xl border p-4 mb-5 ${isDarkMode ? "bg-[#1e9df1]/10 border-[#1e9df1]/30" : "bg-[#e8f4fd] border-[#1e9df1]/30"}`}>
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${title}`}>
              <Mail className="w-4 h-4 text-[#1e9df1]" /> Team Invitations ({invitations.length})
            </h3>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${isDarkMode ? "bg-[#17181c]/60" : "bg-white"}`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${title}`}>{inv.team?.name ?? "Team"}</p>
                    <p className={`text-xs truncate ${sub}`}>
                      Invited by {inv.inviter_profile?.name ?? "someone"}
                      {inv.message && ` — "${inv.message}"`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleInvitation(inv, true)}
                      disabled={busy === inv.id}
                      className="px-3 py-1.5 rounded-lg bg-[#1e9df1] text-white text-xs font-medium hover:bg-[#1677cc]"
                    >
                      {busy === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Accept"}
                    </button>
                    <button
                      onClick={() => handleInvitation(inv, false)}
                      disabled={busy === inv.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? "bg-[#16181c] text-[#71767b]" : "bg-slate-100 text-slate-500"}`}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pill tab row */}
        <div className={`inline-flex items-center rounded-full p-1.5 gap-0.5 border mb-4 ${
          isDarkMode
            ? "bg-[#16181c] border-[#2f3336] shadow-lg shadow-black/40"
            : "bg-white border-slate-300 shadow-md shadow-black/8"
        }`}>
          {(["discover", "mine"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm transition-colors duration-150 ${
                tab === t
                  ? isDarkMode ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/20" : "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/20"
                  : isDarkMode ? "font-medium text-slate-500 hover:text-[#8b98a5]" : "font-medium text-slate-500 hover:text-slate-800"
              }`}
            >
              {t === "discover" ? "Discover Teams" : `My Teams (${myTeams.length})`}
            </button>
          ))}
        </div>

        {tab === "discover" && (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              className={`${inputCls} flex-1`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search teams…"
            />
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as TeamCategory | "")}>
              <option value="">All categories</option>
              {Object.entries(TEAM_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              className={`${inputCls} flex-1`}
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Skills (comma separated)"
            />
            <button onClick={runSearch} className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm font-medium hover:bg-[#1677cc] flex items-center gap-2 justify-center">
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(tab === "discover" ? teams : myTeams).length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-4"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                  <Users size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>
                    {tab === "discover" ? "No teams found" : "No teams yet"}
                  </p>
                  <p className={`text-xs mt-1 ${sub}`}>
                    {tab === "discover"
                      ? query || category || skillFilter ? "Try different filters" : "Be the first to create one!"
                      : "Join or create a team to collaborate"}
                  </p>
                </div>
                {tab === "mine" && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-xl bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Create Team
                  </button>
                )}
              </motion.div>
            )}
            {(tab === "discover" ? teams : myTeams).map((team) => {
              const isMember = myTeamIds.has(team.id);
              const pendingReq = pendingReqByTeam.get(team.id);
              const isFull = (team.member_count ?? 0) >= team.max_members;
              return (
                <TeamCard
                  key={team.id}
                  team={isMember ? { ...team, my_role: myTeams.find((t) => t.id === team.id)?.my_role ?? team.my_role } : team}
                  isDarkMode={isDarkMode}
                  onOpen={(t) => onOpenTeam(t.id)}
                  action={
                    tab === "discover" ? (
                      isMember ? (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                          Member
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinAction(team)}
                          disabled={busy === team.id || (isFull && !pendingReq)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                            pendingReq
                              ? isDarkMode ? "bg-[#16181c] text-[#71767b]" : "bg-slate-100 text-slate-500"
                              : "bg-[#1e9df1] text-white hover:bg-[#1677cc] disabled:opacity-50"
                          }`}
                        >
                          {busy === team.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {pendingReq ? "Cancel Request" : isFull ? "Full" : "Request to Join"}
                        </button>
                      )
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTeamModal
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
          onClose={() => setShowCreate(false)}
          onCreated={(team) => onOpenTeam(team.id)}
        />
      )}
    </div>
  );
}
