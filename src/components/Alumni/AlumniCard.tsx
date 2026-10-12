import { AlumniProfile } from "../../types/social";

interface Props {
  alumni: AlumniProfile;
  isDarkMode: boolean;
  onViewProfile: (id: string) => void;
}

export default function AlumniCard({ alumni, isDarkMode, onViewProfile }: Props) {
  const title = isDarkMode ? "text-white" : "text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className={`h-full rounded-2xl border p-4 sm:p-5 flex flex-col justify-between overflow-hidden transition-all duration-200 ${
        isDarkMode
          ? "bg-[#0c1017] border-[#1d2638] hover:border-red-500/40 hover:shadow-xl hover:shadow-red-950/20"
          : "bg-white border-slate-200 hover:border-red-500/30 hover:shadow-md hover:shadow-slate-100"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar/Initials */}
        <div
          className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-red-950/30"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          {alumni.avatar_url ? (
            <img src={alumni.avatar_url} alt={alumni.full_name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span>
              {alumni.full_name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-bold truncate block ${title}`}>
            {alumni.full_name}
          </h3>
          {alumni.job_title ? (
            <p className={`text-xs truncate font-medium ${isDarkMode ? "text-rose-400" : "text-red-600"}`}>
              {alumni.job_title}
              {alumni.company_name ? ` at ${alumni.company_name}` : ""}
            </p>
          ) : (
            <p className={`text-xs truncate italic ${sub}`}>BUBT Graduate</p>
          )}
          <p className={`text-xs mt-0.5 font-medium ${sub}`}>
            Class of {alumni.graduation_year} · <span className="uppercase">{alumni.major}</span>
          </p>
        </div>
      </div>

      {alumni.skills && alumni.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {alumni.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                isDarkMode
                  ? "bg-red-500/10 text-rose-300 border-red-500/20"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {s}
            </span>
          ))}
          {alumni.skills.length > 3 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sub}`}>
              +{alumni.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#1d2638] flex items-center justify-between gap-2">
        {/* Available for Mentorship Badge */}
        {alumni.is_available_for_mentorship ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
            Available for Mentorship
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 whitespace-nowrap">
            Not mentoring
          </span>
        )}

        <button
          onClick={() => onViewProfile(alumni.id)}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all whitespace-nowrap shadow-sm shadow-red-600/20 active:scale-95"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
