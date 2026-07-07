import { Users, BookOpen, Compass } from "lucide-react";

interface Props {
  isDarkMode: boolean;
  userProfile: {
    name: string;
    major?: string;
  };
}

export default function AlumniHomePage({ isDarkMode, userProfile }: Props) {
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border ${cardBg}`}>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${textColor}`}>
          Welcome back, {userProfile.name}! 👋
        </h1>
        <p className={`text-sm sm:text-base ${subColor}`}>
          Alumni · {userProfile.major ? userProfile.major.toUpperCase() : "CSE"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>12</p>
            <p className={`text-xs ${subColor}`}>My Connections</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>3</p>
            <p className={`text-xs ${subColor}`}>Mentorship Requests</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${cardBg}`}>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${textColor}`}>5</p>
            <p className={`text-xs ${subColor}`}>Shared Resources</p>
          </div>
        </div>
      </div>

      {/* Activity Feed Section */}
      <div className={`p-6 rounded-2xl border ${cardBg}`}>
        <h2 className={`text-lg font-bold mb-4 ${textColor}`}>Recent Activity</h2>
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <p className={`text-sm font-medium ${textColor}`}>No recent activity</p>
          <p className={`text-xs max-w-xs ${subColor}`}>
            Activity from your network and upcoming alumni events will show up here.
          </p>
        </div>
      </div>
    </div>
  );
}
