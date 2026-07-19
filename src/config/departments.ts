// BUBT departments (diploma-holder program variants excluded). Whether a
// department is publicly active/"Coming Soon" is DB-driven — see
// study_department_config.active, configured by an admin in MaterialManager.
export interface Department {
  key: string;
  label: string;
  category: string;
  credits: number;
  icon: "Cpu" | "Zap" | "Shirt" | "Building2" | "Database" | "Briefcase" | "BookOpen" | "TrendingUp" | "Scale";
  accentGradient: string;
  glowColor: string;
  imageSrc?: string;
  videoSrc?: string;
}

export const DEPARTMENTS: Department[] = [
  { key: "CSE", label: "B.Sc. in CSE", category: "Engineering", credits: 154, icon: "Cpu", accentGradient: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600", glowColor: "#a855f7", videoSrc: "/dept-cards/cse.mp4" },
  { key: "EEE", label: "B.Sc. in EEE", category: "Engineering", credits: 142, icon: "Zap", accentGradient: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500", glowColor: "#f59e0b", imageSrc: "/dept-cards/eee.jpg" },
  { key: "TEXTILE", label: "B.Sc. in Textile Engg.", category: "Engineering", credits: 147, icon: "Shirt", accentGradient: "bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500", glowColor: "#f43f5e", imageSrc: "/dept-cards/textile.jpg" },
  { key: "CIVIL", label: "B.Sc. in Civil Engg.", category: "Engineering", credits: 150, icon: "Building2", accentGradient: "bg-gradient-to-r from-slate-500 via-gray-500 to-zinc-500", glowColor: "#64748b", imageSrc: "/dept-cards/civil.jpg" },
  { key: "DSE", label: "B.Sc. in Data Science Engg.", category: "Engineering", credits: 138, icon: "Database", accentGradient: "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600", glowColor: "#6366f1", imageSrc: "/dept-cards/dse.jpg" },
  { key: "BBA", label: "BBA", category: "Business", credits: 132, icon: "Briefcase", accentGradient: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500", glowColor: "#10b981", imageSrc: "/dept-cards/bba.jpg" },
  { key: "ENGLISH", label: "B.A. (Hons.) in English", category: "Arts", credits: 130, icon: "BookOpen", accentGradient: "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500", glowColor: "#0ea5e9", imageSrc: "/dept-cards/english.jpg" },
  { key: "ECONOMICS", label: "B.Sc. (Hons.) in Economics", category: "Business", credits: 130, icon: "TrendingUp", accentGradient: "bg-gradient-to-r from-lime-500 via-green-500 to-emerald-500", glowColor: "#84cc16", imageSrc: "/dept-cards/economics.jpg" },
  { key: "LLB", label: "LL.B. (Hons.)", category: "Law", credits: 147, icon: "Scale", accentGradient: "bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500", glowColor: "#eab308", imageSrc: "/dept-cards/llb.jpg" },
];

export function getDepartment(key: string | null | undefined): Department | undefined {
  return DEPARTMENTS.find((d) => d.key === key);
}
