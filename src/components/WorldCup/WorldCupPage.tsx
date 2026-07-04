import { useState, useEffect, useCallback } from "react";
import { X, Trophy, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { WC26_TEAMS, WC26Team, getTeamByCode, teamLogoUrl } from "../../lib/wc26Teams";
import {
  WC26Match,
  LeaderboardEntry,
  getWC26Matches,
  syncWC26Matches,
  getWC26Leaderboard,
  computePoints,
  isLiveMatch,
} from "../../lib/api/worldCupApi";
import { updateProfile } from "../../lib/api/profileApi";
import { getProfileById } from "../../lib/api/profileApi";
import { WC26HeroBanner } from "./WC26HeroBanner";

interface Props {
  currentUserId: string;
  onClose: () => void;
  isDarkMode: boolean;
}

type Tab = "pick" | "leaderboard" | "matches";

const STAGE_ORDER = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

const STAGE_LABEL: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

const GROUP_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function TeamLogo({ team, className = "" }: { team: WC26Team; className?: string }) {
  return (
    <img
      src={teamLogoUrl(team.logo)}
      alt={team.name}
      className={`object-contain ${className}`}
      loading="lazy"
    />
  );
}

function TeamLogoByCode({ code, className = "" }: { code: string; className?: string }) {
  const team = getTeamByCode(code);
  if (!team) return <span className="text-lg opacity-40">🏳</span>;
  return <TeamLogo team={team} className={className} />;
}

export function WorldCupPage({ currentUserId, onClose, isDarkMode }: Props) {
  const [tab, setTab] = useState<Tab>("pick");
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [matches, setMatches] = useState<WC26Match[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const bg   = isDarkMode ? "bg-[#000000]" : "bg-gray-50";
  const card = isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200";
  const text = isDarkMode ? "text-white" : "text-slate-900";
  const sub  = isDarkMode ? "text-slate-400" : "text-slate-500";

  const load = useCallback(async (force = false) => {
    setSyncing(true);
    await syncWC26Matches(force);
    setSyncing(false);
    const [m, profile] = await Promise.all([
      getWC26Matches(),
      getProfileById(currentUserId),
    ]);
    setMatches(m);
    setMyTeam(profile?.wc26_team ?? null);
    setLeaderboard(await getWC26Leaderboard(m));
  }, [currentUserId]);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  // Live updates: a server-side cron job keeps wc26_matches fresh every minute;
  // this just listens for that change and re-renders — no per-client API polling.
  useEffect(() => {
    const refresh = async () => {
      const m = await getWC26Matches();
      setMatches(m);
      setLeaderboard(await getWC26Leaderboard(m));
    };
    const channel = supabase
      .channel("wc26-matches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wc26_matches" },
        refresh,
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const liveMatches  = matches.filter(isLiveMatch);
  const liveCount    = liveMatches.length;
  const pickedTeam   = myTeam ? getTeamByCode(myTeam) : null;
  const myPoints     = myTeam ? computePoints(myTeam, matches) : 0;
  const myRank       = myTeam ? leaderboard.findIndex((e) => e.id === currentUserId) + 1 : null;
  const myLiveMatch  = myTeam ? liveMatches.find(m => m.home_code === myTeam || m.away_code === myTeam) : null;

  const nextMatch = matches
    .filter(m => !isLiveMatch(m) && m.status !== "FINISHED" && new Date(m.utc_date).getTime() > Date.now())
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())[0] ?? null;

  const heroLiveMatch = liveMatches[0] ?? null;
  const heroLiveLabel = heroLiveMatch
    ? (() => {
        const home = getTeamByCode(heroLiveMatch.home_code);
        const away = getTeamByCode(heroLiveMatch.away_code);
        return `${home?.name ?? heroLiveMatch.home_code} ${heroLiveMatch.home_score ?? 0}–${heroLiveMatch.away_score ?? 0} ${away?.name ?? heroLiveMatch.away_code} · in progress now`;
      })()
    : undefined;

  const byStage = matches.reduce<Record<string, WC26Match[]>>((acc, m) => {
    const key = m.stage ?? "OTHER";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Group teams by group letter for pick tab
  const byGroup = GROUP_ORDER.reduce<Record<string, WC26Team[]>>((acc, g) => {
    acc[g] = WC26_TEAMS.filter(t => t.group === g);
    return acc;
  }, {});

  const pickTeam = async (code: string) => {
    if (picking) return;
    setPicking(true);
    const newPick = myTeam === code ? null : code;
    await updateProfile(currentUserId, { wc26_team: newPick });
    setMyTeam(newPick);
    setLeaderboard(await getWC26Leaderboard(matches));
    setPicking(false);
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* ── Hero banner (title, personal stats, refresh, tabs, countdown — all in one panel) ── */}
      <WC26HeroBanner
        isDarkMode={isDarkMode}
        videoSrc="https://www.dqnamo.com/videos/home/world-cup-2026.mp4"
        posterSrc="https://www.dqnamo.com/images/home/world-cup-2026.jpg"
        targetDate={heroLiveMatch ? null : nextMatch ? new Date(nextMatch.utc_date) : null}
        isLive={!!heroLiveMatch}
        liveLabel={heroLiveLabel}
        pickedTeamName={pickedTeam?.name}
        pickedTeamLogo={pickedTeam ? teamLogoUrl(pickedTeam.logo) : undefined}
        myPoints={myPoints}
        myRank={myRank}
        myLiveScoreLabel={
          myLiveMatch
            ? myLiveMatch.home_code === myTeam
              ? `${myLiveMatch.home_score ?? 0}–${myLiveMatch.away_score ?? 0}`
              : `${myLiveMatch.away_score ?? 0}–${myLiveMatch.home_score ?? 0}`
            : undefined
        }
        liveCount={liveCount}
        syncing={syncing}
        onRefresh={() => load(true)}
        tab={tab}
        onTabChange={setTab}
      />

      {/* ── Live score banner ── */}
      {liveCount > 0 && (
        <div className={`border-b ${isDarkMode ? "bg-gradient-to-r from-red-950/40 via-red-950/15 to-red-950/40 border-red-900/40" : "bg-gradient-to-r from-red-50 via-rose-50/60 to-red-50 border-red-200"}`}>
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-red-500 uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Live Now{liveCount > 1 ? ` · ${liveCount} matches` : ""}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] ${sub}`}>
                <RefreshCw className="w-3 h-3" /> Live sync
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
              {liveMatches.map((m) => {
                const home = getTeamByCode(m.home_code);
                const away = getTeamByCode(m.away_code);
                const mine = myTeam && (m.home_code === myTeam || m.away_code === myTeam);
                const statusLabel = m.status === "HALFTIME" ? "HALF TIME" : m.status === "PAUSED" ? "PAUSED" : "LIVE";
                return (
                  <button
                    key={m.id}
                    onClick={() => setTab("matches")}
                    className={`flex-shrink-0 rounded-2xl px-3.5 py-3 transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
                      mine
                        ? isDarkMode
                          ? "bg-green-900/40 border border-green-600/50 ring-1 ring-green-500/30"
                          : "bg-green-50 border border-green-300 ring-1 ring-green-300/50"
                        : isDarkMode
                          ? "bg-[#16181c]/90 border border-[#2f3336]"
                          : "bg-white border border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Home */}
                      <div className="flex flex-col items-center gap-1.5 w-12">
                        {home ? <TeamLogo team={home} className="w-10 h-7" /> : <span className="text-xl opacity-40">🏳</span>}
                        <span className={`text-[10px] font-bold ${text}`}>{home?.code ?? "TBD"}</span>
                      </div>
                      {/* Score */}
                      <div className="flex flex-col items-center px-1">
                        <div className="flex items-center gap-2 leading-none">
                          <span className={`text-2xl font-black tabular-nums ${text}`}>{m.home_score ?? 0}</span>
                          <span className="text-sm font-bold text-red-500">–</span>
                          <span className={`text-2xl font-black tabular-nums ${text}`}>{m.away_score ?? 0}</span>
                        </div>
                        <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-extrabold text-red-500 uppercase tracking-wide">
                          <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                          {statusLabel}
                        </span>
                      </div>
                      {/* Away */}
                      <div className="flex flex-col items-center gap-1.5 w-12">
                        {away ? <TeamLogo team={away} className="w-10 h-7" /> : <span className="text-xl opacity-40">🏳</span>}
                        <span className={`text-[10px] font-bold ${text}`}>{away?.code ?? "TBD"}</span>
                      </div>
                    </div>
                    {mine && (
                      <p className="text-[9px] font-bold text-green-500 text-center mt-1.5 uppercase tracking-wide">★ Your team</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          (() => {
            const sk = isDarkMode ? "bg-[#16181c]/70" : "bg-slate-200/60";
            const skCard = isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200 shadow-sm";
            return (
              <div className="space-y-6">
                {[8, 8].map((count, gi) => (
                  <div key={gi} className="space-y-2">
                    <div className={`h-2.5 rounded-full animate-pulse ${sk}`} style={{ width: `${gi === 0 ? 18 : 22}%` }} />
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border animate-pulse ${skCard}`}>
                          <div className={`w-12 h-8 rounded-lg ${sk}`} />
                          <div className={`h-2 rounded-full ${sk}`} style={{ width: "65%" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className={`rounded-2xl border divide-y ${skCard} ${isDarkMode ? "divide-[#2f3336]" : "divide-slate-100"}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                      <div className={`w-6 h-6 rounded-full ${sk}`} />
                      <div className={`w-9 h-9 rounded-full ${sk}`} />
                      <div className="flex-1 space-y-1.5">
                        <div className={`h-2.5 rounded-full ${sk}`} style={{ width: `${45 + i * 10}%` }} />
                        <div className={`h-2 rounded-full ${sk}`} style={{ width: "30%" }} />
                      </div>
                      <div className={`w-8 h-5 rounded ${sk}`} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <>
            {/* ── PICK TEAM ── */}
            {tab === "pick" && (
              <div className="space-y-5">
                <p className={`text-sm ${sub}`}>
                  Pick the team you support. Earn points —{" "}
                  <strong className={text}>3 pts</strong> win ·{" "}
                  <strong className={text}>1 pt</strong> draw ·{" "}
                  <strong className={text}>+1 pt</strong> per goal. Change anytime.
                </p>
                {GROUP_ORDER.map((g) => (
                  <div key={g}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${sub}`}>Group {g}</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {byGroup[g].map((team) => {
                        const isPicked = myTeam === team.code;
                        const isPlaying = liveMatches.some(m => m.home_code === team.code || m.away_code === team.code);
                        return (
                          <button
                            key={team.code}
                            onClick={() => pickTeam(team.code)}
                            disabled={picking}
                            title={team.name}
                            className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                              isPicked
                                ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20"
                                : isPlaying
                                ? isDarkMode ? "border-red-600/60 bg-red-900/20" : "border-red-400/60 bg-red-50"
                                : isDarkMode ? "border-[#2f3336] hover:border-green-500/50 bg-[#16181c]/60" : "border-slate-200 hover:border-green-400 bg-white"
                            } ${picking ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <TeamLogo team={team} className="w-14 h-10 drop-shadow-sm" />
                            <span className={`text-[10px] font-semibold text-center leading-tight w-full truncate ${isPicked ? "text-yellow-500" : sub}`}>
                              {team.name}
                            </span>
                            {isPicked && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold">★</span>
                            )}
                            {isPlaying && !isPicked && (
                              <span className="absolute -top-1.5 -left-1.5 text-[9px] bg-red-500 text-white rounded-full px-1 font-bold animate-pulse">●</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── LEADERBOARD ── */}
            {tab === "leaderboard" && (
              <div>
                {leaderboard.length === 0 ? (
                  <div className={`text-center py-16 ${sub}`}>
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No picks yet</p>
                    <p className="text-sm">Be the first to pick a team!</p>
                  </div>
                ) : (
                  <div className={`rounded-2xl border divide-y ${card} ${isDarkMode ? "divide-[#2f3336]" : "divide-slate-100"}`}>
                    {leaderboard.map((entry, i) => {
                      const isMe = entry.id === currentUserId;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      const avatarSrc = entry.avatar_url || entry.profile_pic;
                      const team = getTeamByCode(entry.wc26_team);
                      const entryLive = liveMatches.find(m => m.home_code === entry.wc26_team || m.away_code === entry.wc26_team);
                      return (
                        <div key={entry.id}
                          className={`flex items-center gap-3 px-4 py-3 ${isMe ? (isDarkMode ? "bg-green-900/20" : "bg-green-50") : ""}`}>
                          <span className="w-7 text-center text-sm font-bold">
                            {medal ?? <span className={sub}>#{i + 1}</span>}
                          </span>
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                            {avatarSrc
                              ? <img src={avatarSrc} alt={entry.name} className="w-full h-full object-cover" />
                              : entry.name?.charAt(0)?.toUpperCase() ?? "?"
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isMe ? "text-green-500" : text}`}>
                              {entry.name} {isMe && <span className="text-xs font-normal opacity-70">(you)</span>}
                            </p>
                            <div className={`text-xs ${sub} flex items-center gap-1.5`}>
                              {team && <TeamLogo team={team} className="w-6 h-4 inline" />}
                              <span>{team?.name ?? entry.wc26_team}</span>
                              {entryLive && (
                                <span className="text-red-500 font-bold animate-pulse text-[10px]">
                                  ● {entryLive.home_code === entry.wc26_team
                                      ? `${entryLive.home_score ?? 0}–${entryLive.away_score ?? 0}`
                                      : `${entryLive.away_score ?? 0}–${entryLive.home_score ?? 0}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-base ${i < 3 ? "text-yellow-500" : text}`}>{entry.points}</p>
                            <p className={`text-[10px] ${sub}`}>pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className={`text-xs text-center mt-4 ${sub}`}>Win +3 · Draw +1 · Goal +1</p>
              </div>
            )}

            {/* ── MATCHES ── */}
            {tab === "matches" && (
              <div className="space-y-6">
                {matches.length === 0 ? (
                  <div className={`text-center py-16 ${sub}`}>
                    <img src="/FIFA-World-Cup-Logo-2026.png" alt="WC2026" className="w-16 h-16 object-contain mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No match data</p>
                    <p className="text-sm">Check that FOOTBALL_API_KEY is set in Supabase secrets.</p>
                  </div>
                ) : (
                  STAGE_ORDER.filter((s) => byStage[s]).map((stage) => (
                    <div key={stage}>
                      <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${sub}`}>
                        {STAGE_LABEL[stage] ?? stage}
                      </h3>
                      <div className={`rounded-2xl border divide-y ${card} ${isDarkMode ? "divide-[#2f3336]" : "divide-slate-100"}`}>
                        {byStage[stage].map((m) => {
                          const live = isLiveMatch(m);
                          const isDone = m.status === "FINISHED";
                          const home = getTeamByCode(m.home_code);
                          const away = getTeamByCode(m.away_code);
                          const myTeamPlaying = myTeam && (m.home_code === myTeam || m.away_code === myTeam);
                          return (
                            <div key={m.id}
                              className={`flex items-center gap-2 px-4 py-3 ${
                                live ? isDarkMode ? "bg-red-950/30" : "bg-red-50"
                                : myTeamPlaying ? isDarkMode ? "bg-[#16181c]/40" : "bg-slate-50"
                                : ""
                              }`}
                            >
                              {/* Home */}
                              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                                <span className={`text-sm font-semibold truncate ${m.home_code === myTeam ? "text-green-500" : text}`}>
                                  {home?.name ?? m.home_team ?? "TBD"}
                                </span>
                                {home
                                  ? <TeamLogo team={home} className="w-9 h-6 flex-shrink-0" />
                                  : <span className="text-xl opacity-30">🏳</span>
                                }
                              </div>
                              {/* Score / date */}
                              <div className="w-24 text-center flex-shrink-0">
                                {isDone || live ? (
                                  <span className={`font-bold text-base tabular-nums ${live ? "text-red-500" : text}`}>
                                    {m.home_score ?? 0} – {m.away_score ?? 0}
                                  </span>
                                ) : (
                                  <span className={`text-xs ${sub}`}>
                                    {new Date(m.utc_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                    <br />
                                    <span className="tabular-nums">
                                      {new Date(m.utc_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </span>
                                )}
                                {live && (
                                  <div className="text-[10px] text-red-500 font-bold animate-pulse mt-0.5">
                                    {m.status === "HALFTIME" ? "HT" : "LIVE"}
                                  </div>
                                )}
                              </div>
                              {/* Away */}
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                {away
                                  ? <TeamLogo team={away} className="w-9 h-6 flex-shrink-0" />
                                  : <span className="text-xl opacity-30">🏳</span>
                                }
                                <span className={`text-sm font-semibold truncate ${m.away_code === myTeam ? "text-green-500" : text}`}>
                                  {away?.name ?? m.away_team ?? "TBD"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
