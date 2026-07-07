import { BookOpen } from "lucide-react";

interface Props {
  isDarkMode: boolean;
}

export default function AlumniResourcesPage({ isDarkMode }: Props) {
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";

  return (
    <div className={`p-8 rounded-2xl border text-center ${cardBg}`}>
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-8 h-8" />
      </div>
      <h2 className={`text-xl font-bold mb-2 ${textColor}`}>Share resources with students</h2>
      <p className={`text-sm max-w-md mx-auto ${subColor}`}>
        Post study resources, job listings, roadmap suggestions, or tutorials to help current intake students. Coming soon!
      </p>
    </div>
  );
}
