import { Compass } from "lucide-react";

interface Props {
  isDarkMode: boolean;
}

export default function AlumniTeamsPage({ isDarkMode }: Props) {
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";

  return (
    <div className={`p-8 rounded-2xl border text-center ${cardBg}`}>
      <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h2 className={`text-xl font-bold mb-2 ${textColor}`}>Collaborate in alumni teams</h2>
      <p className={`text-sm max-w-md mx-auto ${subColor}`}>
        Create or join interest groups, project teams, and event organizing committees with other alumni. Coming soon!
      </p>
    </div>
  );
}
