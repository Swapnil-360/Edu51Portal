import { useEffect, useState } from "react";
import { X, Loader2, Search, Send } from "lucide-react";
import { SocialProfile, Team } from "../../types/social";
import { searchUsers } from "../../lib/api/connectionsApi";
import { inviteUser, listTeamInvitations, listTeamMembers } from "../../lib/api/teamsApi";
import UserCard from "../Network/UserCard";
import Loader from "../ui/Loader";

interface Props {
  team: Team;
  currentUserId: string;
  onClose: () => void;
  isDarkMode: boolean;
}

/** Skill-based member search — owners/admins find users and send invitations. */
export default function InviteMembersModal({ team, currentUserId, onClose, isDarkMode }: Props) {
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState(team.required_skills.join(", "));
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  // exclude existing members + already-invited users
  useEffect(() => {
    (async () => {
      const [members, invs] = await Promise.all([
        listTeamMembers(team.id),
        listTeamInvitations(team.id),
      ]);
      setExcluded(new Set([...members.map((m) => m.user_id), ...invs.map((i) => i.invitee_id)]));
    })();
  }, [team.id]);

  const runSearch = async () => {
    setSearching(true);
    const skills = skillFilter.trim() ? skillFilter.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const found = await searchUsers(
      { query: query.trim() || undefined, skills, excludeIds: [currentUserId, ...excluded] },
      20,
    );
    setResults(found);
    setSearching(false);
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excluded]);

  const sendInvite = async (userId: string) => {
    setBusy(userId);
    const { error } = await inviteUser(team.id, currentUserId, userId);
    if (!error) setInvited(new Set([...invited, userId]));
    setBusy(null);
  };

  const inputCls = `px-3 py-2 rounded-lg text-sm border outline-none ${
    isDarkMode
      ? "bg-[#16181c] border-[#38444d] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-[#1e9df1]"
  }`;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl ${isDarkMode ? "bg-[#17181c] border border-[#2f3336]" : "bg-white"}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <h2 className={`text-lg font-bold ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>Invite Members</h2>
          <button onClick={onClose} className={isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-500"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 pb-3 space-y-2">
          <input
            className={`${inputCls} w-full`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search by name…"
          />
          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Skills (comma separated)"
            />
            <button onClick={runSearch} className="px-4 py-2 rounded-lg bg-[#1e9df1] text-[#e7e9ea] text-sm font-medium hover:bg-[#1677cc] flex items-center gap-1.5">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {searching ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : results.length === 0 ? (
            <p className={`text-sm text-center py-8 ${isDarkMode ? "text-slate-500" : "text-[#71767b]"}`}>
              No matching users found.
            </p>
          ) : (
            results.map((p) => (
              <UserCard
                key={p.id}
                profile={p}
                isDarkMode={isDarkMode}
                action={
                  invited.has(p.id) ? (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                      Invited
                    </span>
                  ) : (
                    <button
                      onClick={() => sendInvite(p.id)}
                      disabled={busy === p.id}
                      className="px-3 py-1.5 rounded-lg bg-[#1e9df1] text-[#e7e9ea] text-xs font-medium hover:bg-[#1677cc] flex items-center gap-1"
                    >
                      {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Invite
                    </button>
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
