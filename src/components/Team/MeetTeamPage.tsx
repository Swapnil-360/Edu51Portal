import { ArrowLeft, Crown, Server, Palette, Sparkles, ClipboardCheck } from "lucide-react";
import { ExpandingCards, CardItem } from "../ui/expanding-cards";

// TODO: replace /public/team/member-*.svg placeholders with real photos
const TEAM: CardItem[] = [
  {
    id: "swapnil",
    title: "Md. Miftahur Rahman Swapnil",
    description: "Project Manager & Overall Project Lead — Project roadmap, team coordination, and core frontend development.",
    imgSrc: "/team/member-1.svg",
    icon: <Crown size={24} />,
    linkHref: "#",
  },
  {
    id: "nila",
    title: "Sheikh Shamia Hassan Nila",
    description: "UI/UX, System Architect & Documentation — System architecture, visual design, and all project documentation.",
    imgSrc: "/team/member-2.svg",
    icon: <Palette size={24} />,
    linkHref: "#",
  },
  {
    id: "asif-ali",
    title: "Md Asif Ali",
    description: "Backend Developer & Database — Server-side logic, API endpoints, and authentication/user validation systems.",
    imgSrc: "/team/member-3.svg",
    icon: <Server size={24} />,
    linkHref: "#",
  },
  {
    id: "jahidul",
    title: "Md Jahidul Kamal Islam",
    description: "AI Integration & Frontend Developer — AI (Gemini) chatbot logic and frontend component development.",
    imgSrc: "/team/member-4.svg",
    icon: <Sparkles size={24} />,
    linkHref: "#",
  },
  {
    id: "sara",
    title: "Nishat Anjum Sara",
    description: "QA, Tester & Database — Database maintenance, quality assurance, and end-to-end testing.",
    imgSrc: "/team/member-5.svg",
    icon: <ClipboardCheck size={24} />,
    linkHref: "#",
  },
];

interface Props {
  isDarkMode: boolean;
  onClose: () => void;
}

export default function MeetTeamPage({ isDarkMode, onClose }: Props) {
  return (
    <div className={`min-h-full px-4 sm:px-8 py-10 transition-colors duration-300 ${isDarkMode ? "bg-[#000000]" : "bg-slate-50"}`}>
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <button
          onClick={onClose}
          className={`self-start mb-8 flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`} style={{ fontFamily: "'Exo 2', sans-serif" }}>
            Meet Our Team
          </h1>
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            The people building Edu<span className="text-[#ef4444]">51</span>Portal
          </p>
        </div>

        <ExpandingCards items={TEAM} defaultActiveIndex={0} />
      </div>
    </div>
  );
}
