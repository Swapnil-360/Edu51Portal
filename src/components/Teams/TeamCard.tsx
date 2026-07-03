import { Users } from "lucide-react";
import { Team, TEAM_CATEGORY_LABELS } from "../../types/social";

interface Props {
  team: Team;
  isDarkMode: boolean;
  onOpen: (team: Team) => void;
  /** optional action button (e.g. Request to Join) */
  action?: React.ReactNode;
}

const CATEGORY_COLORS: Record<string, string> = {
  startup: "from-orange-500 to-rose-500",
  research: "from-blue-500 to-cyan-500",
  hackathon: "from-violet-500 to-fuchsia-500",
  academic_project: "from-emerald-500 to-teal-500",
  open_source: "from-slate-500 to-slate-700",
  freelancing: "from-amber-500 to-yellow-500",
  competition: "from-red-500 to-pink-500",
};

export default function TeamCard({ team, isDarkMode, onOpen, action }: Props) {
  const title = isDarkMode ? "text-[#e7e9ea]" : "text-slate-900";
  const sub = isDarkMode ? "text-[#71767b]" : "text-slate-500";
  const gradientClass = CATEGORY_COLORS[team.category] ?? "from-blue-500 to-violet-500";

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        isDarkMode ? "bg-[#17181c] border-[#2f3336]/50 hover:border-[#38444d]" : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Banner + logo using relative/absolute so they never collide */}
      <div className="relative">
        <button onClick={() => onOpen(team)} className="block w-full">
          <div className={`h-24 bg-gradient-to-r ${gradientClass}`}>
            {team.banner_url && (
              <img src={team.banner_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
        </button>
        {/* Logo straddles banner bottom edge */}
        <button
          onClick={() => onOpen(team)}
          className={`absolute bottom-0 left-4 translate-y-1/2 w-14 h-14 rounded-xl overflow-hidden border-[3px] flex items-center justify-center text-xl font-bold text-[#e7e9ea] bg-gradient-to-br ${gradientClass} ${isDarkMode ? "border-slate-900" : "border-white"} shadow-md`}
        >
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            team.name.charAt(0).toUpperCase()
          )}
        </button>
      </div>

      {/* Content — top padding accounts for the logo overhang */}
      <div className="px-4 pt-10 pb-4">
        <button onClick={() => onOpen(team)} className={`text-sm font-bold truncate block text-left hover:underline ${title}`}>
          {team.name}
        </button>
        <p className={`text-xs mt-0.5 ${sub}`}>
          {TEAM_CATEGORY_LABELS[team.category]} · {team.member_count ?? 0}/{team.max_members} members
          {team.my_role && <span className="capitalize"> · You: {team.my_role}</span>}
        </p>

        {team.description && (
          <p className={`text-xs mt-2 line-clamp-2 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`}>{team.description}</p>
        )}

        {team.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {team.required_skills.slice(0, 4).map((s) => (
              <span
                key={s}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                  isDarkMode ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {s}
              </span>
            ))}
            {team.required_skills.length > 4 && (
              <span className={`text-[10px] ${sub}`}>+{team.required_skills.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className={`inline-flex items-center gap-1 text-xs ${sub}`}>
            <Users className="w-3.5 h-3.5" />
            {(team.member_count ?? 0) >= team.max_members ? "Full" : `${team.max_members - (team.member_count ?? 0)} spot${team.max_members - (team.member_count ?? 0) === 1 ? "" : "s"} left`}
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}
