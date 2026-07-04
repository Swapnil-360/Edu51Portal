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
      className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 ${
        isDarkMode
          ? "bg-[#17181c] border-[#2f3336]/50 hover:border-[#38444d] hover:shadow-lg hover:shadow-black/20"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar/Initials */}
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#1e9df1] to-[#1677cc] flex items-center justify-center text-lg font-bold text-white shadow-sm"
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
          <h3 className={`text-sm font-semibold truncate block ${title}`}>
            {alumni.full_name}
          </h3>
          {alumni.current_role ? (
            <p className={`text-xs truncate font-medium ${isDarkMode ? "text-[#1e9df1]" : "text-[#1677cc]"}`}>
              {alumni.current_role}
              {alumni.current_company ? ` at ${alumni.current_company}` : ""}
            </p>
          ) : (
            <p className={`text-xs truncate italic ${sub}`}>Graduate</p>
          )}
          <p className={`text-xs mt-0.5 font-medium ${sub}`}>
            Class of {alumni.graduation_year} · <span className="uppercase">{alumni.major}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#2f3336]/10 flex items-center justify-between gap-2">
        {/* Available for Mentorship Badge */}
        {alumni.is_available_for_mentorship ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">
            Available for Mentorship
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 italic">Not mentoring currently</span>
        )}

        <button
          onClick={() => onViewProfile(alumni.id)}
          className="px-3.5 py-1.5 rounded-lg bg-[#1e9df1] text-white text-xs font-semibold hover:bg-[#1677cc] transition-colors whitespace-nowrap shadow-sm"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
