import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

type BadgeType = "live" | "new" | "soon";

interface NavTab {
  label: string;
  view: string;
  badge?: BadgeType;
  onClick: () => void;
  isActive: boolean;
  icon?: React.ReactNode;
  hasRedDot?: boolean;
}

interface SlideNavProps {
  tabs: NavTab[];
  isDarkMode: boolean;
}

function LiveDot() {
  return (
    <span className="relative flex items-center justify-center w-4 h-4">
      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
    </span>
  );
}

function NewBadge({ isActive, isDarkMode }: { isActive: boolean; isDarkMode: boolean }) {
  return (
    <span
      className={`relative overflow-hidden px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none tracking-wide ${
        isActive
          ? isDarkMode
            ? "bg-emerald-500 text-white"        // dark mode: white pill → green badge
            : "bg-white/25 text-white"            // light mode: dark pill → white badge
          : isDarkMode
          ? "bg-emerald-400 text-slate-900"
          : "bg-emerald-500 text-white"
      }`}
    >
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      NEW
    </span>
  );
}

function SoonBadge({ isActive, isDarkMode }: { isActive: boolean; isDarkMode: boolean }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none tracking-wide border ${
        isActive
          ? isDarkMode
            ? "border-slate-500 text-slate-600"  // dark mode: white pill → dark border+text
            : "border-white/40 text-white/80"     // light mode: dark pill → white border+text
          : isDarkMode
          ? "border-slate-400 text-[#8b98a5]"
          : "border-slate-400 text-slate-500"
      }`}
    >
      SOON
    </span>
  );
}

function SlideNav({ tabs, isDarkMode }: SlideNavProps) {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });

  return (
    <ul
      className={`relative flex items-center rounded-full px-1.5 py-1.5 gap-0.5 border transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#16181c] border-[#2f3336] shadow-lg shadow-black/30"
          : "bg-white border-slate-200 shadow-md shadow-black/8"
      }`}
      onMouseLeave={() => setPosition((pv) => ({ ...pv, opacity: 0 }))}
    >
      {tabs.map((tab) => (
        <NavTab
          key={tab.view}
          tab={tab}
          setPosition={setPosition}
          isDarkMode={isDarkMode}
        />
      ))}
      <Cursor position={position} isDarkMode={isDarkMode} />
    </ul>
  );
}

const NavTab = ({
  tab,
  setPosition,
  isDarkMode,
}: {
  tab: NavTab;
  setPosition: React.Dispatch<React.SetStateAction<{ left: number; width: number; opacity: number }>>;
  isDarkMode: boolean;
}) => {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={ref}
      onClick={tab.onClick}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft });
      }}
      className={`relative z-10 flex items-center gap-1.5 cursor-pointer select-none px-3.5 py-1.5 text-sm rounded-full transition-all duration-150 whitespace-nowrap ${
        tab.isActive
          ? isDarkMode
            ? "font-bold text-slate-900"
            : "font-bold text-white"
          : isDarkMode
          ? "font-medium text-[#71767b] hover:text-[#e7e9ea]"
          : "font-medium text-slate-500 hover:text-slate-800"
      }`}
    >
      {tab.icon ? tab.icon : (
        <>
          {tab.badge === "live" && <LiveDot />}
          <span>{tab.label}</span>
          {tab.badge === "new" && !tab.hasRedDot && <NewBadge isActive={tab.isActive} isDarkMode={isDarkMode} />}
          {tab.badge === "soon" && <SoonBadge isActive={tab.isActive} isDarkMode={isDarkMode} />}
          {tab.hasRedDot && (
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_6px_#ef4444]"></span>
            </span>
          )}
        </>
      )}

      {/* Active filled pill */}
      {tab.isActive && (
        <motion.span
          layoutId="active-nav-pill"
          className={`absolute inset-0 rounded-full -z-10 shadow-md ${
            isDarkMode ? "bg-white shadow-white/10" : "bg-[#17181c] shadow-black/20"
          }`}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
    </li>
  );
};

const Cursor = ({
  position,
  isDarkMode,
}: {
  position: { left: number; width: number; opacity: number };
  isDarkMode: boolean;
}) => (
  <motion.li
    animate={position}
    transition={{ type: "spring", stiffness: 350, damping: 30 }}
    className={`absolute z-0 h-8 rounded-full pointer-events-none ${
      isDarkMode ? "bg-[#2f3336]/60" : "bg-slate-100"
    }`}
  />
);

// Wired-up version for App.tsx
interface AppNavHeaderProps {
  currentView: string;
  isDarkMode: boolean;
  isLoggedIn: boolean;
  goToView: (view: string) => void;
  showMajorAccessNotification: (type: string, msg: string) => void;
  setShowSignInModal: (v: boolean) => void;
  pendingConnectionsCount?: number;
  unreadMessagesCount?: number;
  isBanned?: boolean;
}

export function AppNavHeader({
  currentView,
  isDarkMode,
  isLoggedIn,
  goToView,
  showMajorAccessNotification,
  setShowSignInModal,
  pendingConnectionsCount = 0,
  unreadMessagesCount = 0,
  isBanned = false,
}: AppNavHeaderProps) {
  const requireLogin = (view: string, label: string) => {
    if (!isLoggedIn) {
      showMajorAccessNotification("error", `Please sign in to access ${label}`);
      setShowSignInModal(true);
      return;
    }
    goToView(view);
  };

  // Banned users are restricted to Home (Study Materials) — hide every other tab
  if (isBanned) {
    const homeOnly: NavTab[] = [
      {
        label: "Home",
        view: "home",
        icon: <Home className="h-4 w-4" />,
        isActive: currentView === "home",
        onClick: () => goToView("home"),
      },
    ];
    return <SlideNav tabs={homeOnly} isDarkMode={isDarkMode} />;
  }

  const tabs: NavTab[] = [
    {
      label: "Home",
      view: "home",
      icon: <Home className="h-4 w-4" />,
      isActive: currentView === "home",
      onClick: () => goToView("home"),
    },
    {
      label: "Semester",
      view: "semester",
      isActive: currentView === "semester",
      onClick: () => requireLogin("semester", "Semester Tracker"),
    },
    {
      label: "Teams",
      view: "teams",
      badge: "new",
      isActive: currentView === "teams" || currentView === "team",
      onClick: () => requireLogin("teams", "Team Building"),
    },
    {
      label: "Network",
      view: "network",
      badge: "new",
      isActive: currentView === "network",
      onClick: () => requireLogin("network", "My Network"),
      hasRedDot: pendingConnectionsCount > 0,
    },
    {
      label: "Resources",
      view: "shared-resources",
      badge: "new",
      isActive: currentView === "shared-resources",
      onClick: () => requireLogin("shared-resources", "Shared Resources"),
    },
    {
      label: "Alumni",
      view: "alumni",
      badge: "new",
      isActive: currentView === "alumni",
      onClick: () => requireLogin("alumni", "Alumni Hub"),
      hasRedDot: unreadMessagesCount > 0,
    },
    {
      label: "Routine",
      view: "custom",
      isActive: currentView === "custom",
      onClick: () => requireLogin("custom", "Custom Routine"),
    },
  ];

  return <SlideNav tabs={tabs} isDarkMode={isDarkMode} />;
}

interface AlumniNavHeaderProps {
  currentView: string;
  isDarkMode: boolean;
  goToView: (view: string) => void;
  pendingConnectionsCount?: number;
  unreadMessagesCount?: number;
}

export function AlumniNavHeader({
  currentView,
  isDarkMode,
  goToView,
  pendingConnectionsCount = 0,
  unreadMessagesCount = 0,
}: AlumniNavHeaderProps) {
  const tabs: NavTab[] = [
    {
      label: "Home",
      view: "home",
      icon: <Home className="h-4 w-4" />,
      isActive: currentView === "home",
      onClick: () => goToView("home"),
    },
    {
      label: "Network",
      view: "network",
      badge: "new",
      isActive: currentView === "network",
      onClick: () => goToView("network"),
      hasRedDot: pendingConnectionsCount > 0,
    },
    {
      label: "Messages",
      view: "messages",
      isActive: currentView === "messages",
      onClick: () => goToView("messages"),
      hasRedDot: unreadMessagesCount > 0,
    },
    {
      label: "Resources",
      view: "resources",
      badge: "new",
      isActive: currentView === "resources",
      onClick: () => goToView("resources"),
    },
  ];

  return <SlideNav tabs={tabs} isDarkMode={isDarkMode} />;
}
