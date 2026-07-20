import { ArrowLeft, Crown, Server, Palette, Sparkles, ClipboardCheck } from "lucide-react";
import { ExpandingCards, CardItem } from "../ui/expanding-cards";

// TODO: replace /public/team/member-*.svg placeholders with real photos.
// TODO: skills below are inferred from each member's stated responsibilities,
// not confirmed by them — check with each person before treating as final.
const TEAM: CardItem[] = [
  {
    id: "swapnil",
    title: "Md. Miftahur Rahman Swapnil",
    shortTitle: "Swapnil",
    meta: "ID: 22235103183 · Intake 51",
    description: "Project Manager & Overall Project Lead — Project roadmap, team coordination, and core frontend development.",
    skills: ["React", "TypeScript", "Project Management", "Supabase"],
    imgSrc: "/team/member-1.jpg",
    icon: <Crown size={24} />,
    linkHref: "#",
  },
  {
    id: "nila",
    title: "Sheikh Shamia Hassan Nila",
    shortTitle: "Nila",
    meta: "ID: 22235103635 · Intake 51",
    description: "UI/UX, System Architect & Documentation — Visual design, UI/UX decisions, and all project documentation.",
    skills: ["UI/UX Design", "Figma", "System Architecture", "Documentation"],
    imgSrc: "/team/member-2.svg",
    icon: <Palette size={24} />,
    linkHref: "#",
  },
  {
    id: "asif-ali",
    title: "Md Asif Ali",
    shortTitle: "Asif",
    meta: "ID: 22235103194 · Intake 51",
    description: "Backend Developer & Database — Server-side logic, API endpoints, and authentication/user validation systems.",
    skills: ["Node.js", "PostgreSQL", "API Design", "Authentication"],
    imgSrc: "/team/member-3.svg",
    icon: <Server size={24} />,
    linkHref: "#",
  },
  {
    id: "jahidul",
    title: "Md Jahidul Kamal Islam",
    shortTitle: "Jahid",
    meta: "ID: 22235103214 · Intake 51",
    description: "AI Integration & Frontend Developer — AI (Gemini) chatbot logic and frontend component development.",
    skills: ["Gemini AI", "React", "Prompt Engineering", "Frontend"],
    imgSrc: "/team/member-4.svg",
    icon: <Sparkles size={24} />,
    linkHref: "#",
  },
  {
    id: "sara",
    title: "Nishat Anjum Sara",
    shortTitle: "Sara",
    meta: "ID: 21225103465 · Intake 49",
    description: "QA, Tester & Database — Database maintenance, quality assurance, and end-to-end testing.",
    skills: ["QA Testing", "SQL", "Database Maintenance", "Test Planning"],
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

        <div className="w-full max-w-4xl mt-16 space-y-10">
          <section>
            <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Project Goal
            </h2>
            <p className={`leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Edu<span className="text-[#ef4444] font-semibold">51</span>Portal exists to solve a problem we lived through ourselves — not having one reliable place for class notes and study materials. What started as a fix for our own section has grown into a bigger goal: give every BUBT student, across every department, a single structured hub for academic resources.
            </p>
          </section>

          <section>
            <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Description
            </h2>
            <p className={`leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              It began when our section kept facing the same problem — study materials and resources scattered across group chats and Drive links with no central place to find them. We built a simple tool just for our own section to maintain class notes, and used it for about a year. Seeing how much it helped, we expanded it to cover our entire intake. Then, in our final year, as our Software Development Project (SDP) under our course teacher, we decided to rebuild it into a platform for all departments at BUBT — so it could help students well beyond our own batch. Today Edu<span className="text-[#ef4444] font-semibold">51</span>Portal combines study materials organized by department and semester, real-time notices, a team collaboration suite (tasks, chat, shared files), a student network, a custom routine planner, and an AI study assistant — all built and maintained entirely by students.
            </p>
          </section>

          <section>
            <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Future Plan
            </h2>
            <p className={`leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              We're continuing to expand department coverage, add more AI-assisted study tools, and — pending university approval — build a verified Alumni Connection network linking current students with BUBT graduates for mentorship and guidance. Feedback from students directly shapes what gets built next — use the Feedback button in the footer to help steer the roadmap.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
