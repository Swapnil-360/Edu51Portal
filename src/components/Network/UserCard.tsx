import { SocialProfile } from "../../types/social";

interface Props {
  profile: SocialProfile;
  isDarkMode: boolean;
  onView?: (profile: SocialProfile) => void;
  /** action area on the right (connect button, invite button, etc.) */
  action?: React.ReactNode;
}

export default function UserCard({ profile, isDarkMode, onView, action }: Props) {
  const title = isDarkMode ? "text-white" : "text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
        isDarkMode ? "bg-[#17181c] border-[#2f3336]/50 hover:border-[#38444d]" : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <button
        onClick={() => onView?.(profile)}
        className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#1e9df1] to-[#1677cc]"
      >
        {profile.avatar_url || profile.profile_pic ? (
          <img src={profile.avatar_url || profile.profile_pic!} alt={profile.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
            {profile.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <button onClick={() => onView?.(profile)} className={`text-sm font-semibold truncate block text-left hover:underline ${title}`}>
          {profile.name}
        </button>
        {profile.headline ? (
          <p className={`text-xs truncate ${sub}`}>{profile.headline}</p>
        ) : (
          <p className={`text-xs truncate ${sub}`}>
            {[profile.section, profile.major].filter(Boolean).join(" · ")}
          </p>
        )}
        {profile.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.skills.slice(0, 3).map((s) => (
              <span
                key={s}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                  isDarkMode ? "bg-[#061622] text-[#1e9df1]" : "bg-[#e8f4fd] text-[#1677cc]"
                }`}
              >
                {s}
              </span>
            ))}
            {profile.skills.length > 3 && (
              <span className={`text-[10px] ${sub}`}>+{profile.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
