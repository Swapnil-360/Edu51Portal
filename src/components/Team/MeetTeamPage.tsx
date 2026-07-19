import { ArrowLeft, Crown, Code2, Server, Palette, ClipboardCheck } from "lucide-react";
import { ExpandingCards, CardItem } from "../ui/expanding-cards";

// TODO: replace dummy data + /public/team/member-*.svg with real photos & bios
const TEAM: CardItem[] = [
  { id: "member-one", title: "Member One", description: "Project Lead — Owns overall direction, architecture, and delivery.", imgSrc: "/team/member-1.svg", icon: <Crown size={24} />, linkHref: "#" },
  { id: "member-two", title: "Member Two", description: "Frontend Developer — Builds and maintains the UI across the platform.", imgSrc: "/team/member-2.svg", icon: <Code2 size={24} />, linkHref: "#" },
  { id: "member-three", title: "Member Three", description: "Backend Developer — Owns database, auth, and edge functions.", imgSrc: "/team/member-3.svg", icon: <Server size={24} />, linkHref: "#" },
  { id: "member-four", title: "Member Four", description: "UI/UX Designer — Designs layouts, interactions, and visual identity.", imgSrc: "/team/member-4.svg", icon: <Palette size={24} />, linkHref: "#" },
  { id: "member-five", title: "Member Five", description: "QA & Content — Tests features and manages academic content.", imgSrc: "/team/member-5.svg", icon: <ClipboardCheck size={24} />, linkHref: "#" },
];

interface Props {
  isDarkMode: boolean;
  onClose: () => void;
}

export default function MeetTeamPage({ isDarkMode, onClose }: Props) {
  return (
    <div className={`min-h-full px-4 sm:px-8 py-10 transition-colors duration-300 ${isDarkMode ? "bg-[#000000]" : "bg-slate-50"}`}>
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <button onClick={onClose} className={`self-start mb-8 flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
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
