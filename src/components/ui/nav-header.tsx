import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Home, BarChart3, GraduationCap, Bell, BookOpen, MessageSquare, History } from "lucide-react";

type BadgeType = "live" | "new" | "soon";

interface NavTab {
  label: string;
  view: string;
  badge?: BadgeType;
  onClick: () => void;
  isActive: boolean;
  icon?: React.ReactNode;
  hasRedDot?: boolean;
  unreadCount?: number;
  showLabelWithIcon?: boolean;
}

interface SlideNavProps {
  tabs: NavTab[];
  isDarkMode: boolean;
  layoutId?: string;
}

function LiveDot() {
  return (
    <span className="relative flex items-center justify-center w-4 h-4">
      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
    </span>
  );
}

function TabIndicator({
  unreadCount,
  hasRedDot,
  isActive,
  isDarkMode,
}: {
  unreadCount?: number;
  hasRedDot?: boolean;
  isActive: boolean;
  isDarkMode: boolean;
}) {
  if (unreadCount !== undefined && unreadCount > 0) {
    return (
      <span
        className={`ml-1 px-1.5 min-w-[17px] h-[17px] rounded-full text-[10px] font-black flex items-center justify-center leading-none transition-all ${
          isActive
            ? "bg-red-500 text-white"
            : "bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.55)]"
        }`}
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    );
  }

  if (hasRedDot) {
    return (
      <span className="relative flex h-2 w-2 ml-1 items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500 shadow-[0_0_6px_#ef4444]" />
      </span>
    );
  }

  return null;
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

function SlideNav({ tabs, isDarkMode, layoutId }: SlideNavProps) {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });

  return (
    <ul
      className="relative flex items-center p-0.5 gap-1 sm:gap-1.5 select-none"
      onMouseLeave={() => setPosition((pv) => ({ ...pv, opacity: 0 }))}
    >
      {tabs.map((tab) => (
        <NavTab
          key={tab.view}
          tab={tab}
          setPosition={setPosition}
          isDarkMode={isDarkMode}
          layoutId={layoutId}
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
  layoutId = "active-nav-pill",
}: {
  tab: NavTab;
  setPosition: React.Dispatch<React.SetStateAction<{ left: number; width: number; opacity: number }>>;
  isDarkMode: boolean;
  layoutId?: string;
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
          ? "font-semibold text-slate-300 hover:text-white"
          : "font-semibold text-slate-600 hover:text-slate-900"
      }`}
    >
      {tab.icon && (!tab.label || tab.showLabelWithIcon) ? (
        tab.showLabelWithIcon && tab.label ? (
          <>
            <span className="flex-shrink-0">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge === "live" && <LiveDot />}
            {tab.badge === "soon" && <SoonBadge isActive={tab.isActive} isDarkMode={isDarkMode} />}
            <TabIndicator
              unreadCount={tab.unreadCount}
              hasRedDot={tab.hasRedDot}
              isActive={tab.isActive}
              isDarkMode={isDarkMode}
            />
          </>
        ) : (
          tab.icon
        )
      ) : (
        <>
          {tab.badge === "live" && <LiveDot />}
          <span>{tab.label}</span>
          {tab.badge === "soon" && <SoonBadge isActive={tab.isActive} isDarkMode={isDarkMode} />}
          <TabIndicator
            unreadCount={tab.unreadCount}
            hasRedDot={tab.hasRedDot}
            isActive={tab.isActive}
            isDarkMode={isDarkMode}
          />
        </>
      )}

      {/* Active filled pill */}
      {tab.isActive && (
        <motion.span
          layoutId={layoutId}
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
      isDarkMode ? "bg-white/10" : "bg-slate-900/5"
    }`}
  />
);

// Wired-up version for App.tsx
export interface AppNavHeaderProps {
  currentView: string;
  isDarkMode: boolean;
  isLoggedIn: boolean;
  goToView: (view: string) => void;
  showMajorAccessNotification: (type: string, msg: string) => void;
  setShowSignInModal: (v: boolean) => void;
  pendingConnectionsCount?: number;
  unreadMessagesCount?: number;
  unreadResourcesCount?: number;
  hasTeamUpdate?: boolean;
  hasFacultyUpdate?: boolean;
  unreadNoticesCount?: number;
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
  unreadResourcesCount = 0,
  hasTeamUpdate = false,
  hasFacultyUpdate = false,
  unreadNoticesCount = 0,
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
      hasRedDot: unreadNoticesCount > 0,
    },
    {
      label: "Info Hub",
      view: "faculty",
      isActive: currentView === "faculty",
      onClick: () => goToView("faculty"),
      hasRedDot: hasFacultyUpdate || unreadNoticesCount > 0,
    },
    {
      label: "Teams",
      view: "teams",
      isActive: currentView === "teams" || currentView === "team",
      onClick: () => requireLogin("teams", "Team Building"),
      hasRedDot: hasTeamUpdate,
    },
    {
      label: "Network",
      view: "network",
      isActive: currentView === "network",
      onClick: () => requireLogin("network", "My Network"),
      unreadCount: pendingConnectionsCount > 0 ? pendingConnectionsCount : undefined,
      hasRedDot: pendingConnectionsCount > 0,
    },
    {
      label: "Resources",
      view: "shared-resources",
      isActive: currentView === "shared-resources",
      onClick: () => requireLogin("shared-resources", "Shared Resources"),
      unreadCount: unreadResourcesCount > 0 ? unreadResourcesCount : undefined,
      hasRedDot: unreadResourcesCount > 0,
    },
    {
      label: "Alumni",
      view: "alumni",
      isActive: currentView === "alumni",
      onClick: () => requireLogin("alumni", "Alumni Hub"),
      unreadCount: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
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

export interface AlumniNavHeaderProps {
  currentView: string;
  isDarkMode: boolean;
  goToView: (view: string) => void;
  pendingConnectionsCount?: number;
  unreadMessagesCount?: number;
  unreadResourcesCount?: number;
  hasFacultyUpdate?: boolean;
  unreadNoticesCount?: number;
}

export function AlumniNavHeader({
  currentView,
  isDarkMode,
  goToView,
  pendingConnectionsCount = 0,
  unreadMessagesCount = 0,
  unreadResourcesCount = 0,
  hasFacultyUpdate = false,
  unreadNoticesCount = 0,
}: AlumniNavHeaderProps) {
  const tabs: NavTab[] = [
    {
      label: "Home",
      view: "home",
      icon: <Home className="h-4 w-4" />,
      isActive: currentView === "home",
      onClick: () => goToView("home"),
      hasRedDot: unreadNoticesCount > 0,
    },
    {
      label: "Officials & Faculty",
      view: "faculty",
      isActive: currentView === "faculty",
      onClick: () => goToView("faculty"),
      hasRedDot: hasFacultyUpdate || unreadNoticesCount > 0,
    },
    {
      label: "Network",
      view: "network",
      isActive: currentView === "network",
      onClick: () => goToView("network"),
      unreadCount: pendingConnectionsCount > 0 ? pendingConnectionsCount : undefined,
      hasRedDot: pendingConnectionsCount > 0,
    },
    {
      label: "Messages",
      view: "messages",
      isActive: currentView === "messages",
      onClick: () => goToView("messages"),
      unreadCount: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      hasRedDot: unreadMessagesCount > 0,
    },
    {
      label: "Resources",
      view: "resources",
      isActive: currentView === "resources",
      onClick: () => goToView("resources"),
      unreadCount: unreadResourcesCount > 0 ? unreadResourcesCount : undefined,
      hasRedDot: unreadResourcesCount > 0,
    },
  ];

  return <SlideNav tabs={tabs} isDarkMode={isDarkMode} />;
}

export type AdminTabId = "dashboard" | "alumni" | "notices" | "materials" | "feedback" | "logs";

export interface AdminNavHeaderProps {
  activeTab: AdminTabId;
  isDarkMode: boolean;
  onTabChange: (tab: AdminTabId) => void;
  onExitAdmin?: () => void;
  pendingAlumniCount?: number;
  newFeedbackCount?: number;
}

interface AdminTabConfig {
  id: AdminTabId;
  label: string;
  shortLabel: string;
  icon: (className: string) => React.ReactNode;
  badgeCount?: number;
}

export function AdminNavHeader({
  activeTab,
  isDarkMode,
  onTabChange,
  pendingAlumniCount = 0,
  newFeedbackCount = 0,
}: AdminNavHeaderProps) {
  const tabs: AdminTabConfig[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      shortLabel: "Dashboard",
      icon: (cls) => <BarChart3 className={cls} />,
    },
    {
      id: "alumni",
      label: "Alumni Management",
      shortLabel: "Alumni",
      icon: (cls) => <GraduationCap className={cls} />,
      badgeCount: pendingAlumniCount,
    },
    {
      id: "notices",
      label: "Notice & Notifications",
      shortLabel: "Notices",
      icon: (cls) => <Bell className={cls} />,
    },
    {
      id: "materials",
      label: "Study Materials",
      shortLabel: "Materials",
      icon: (cls) => <BookOpen className={cls} />,
    },
    {
      id: "feedback",
      label: "Feedback",
      shortLabel: "Feedback",
      icon: (cls) => <MessageSquare className={cls} />,
      badgeCount: newFeedbackCount,
    },
    {
      id: "logs",
      label: "Audit & Activity Logs",
      shortLabel: "Logs",
      icon: (cls) => <History className={cls} />,
    },
  ];

  return (
    <div className="flex items-center justify-center max-w-full">
      {/* Seamless inline tab row sitting directly inside floating capsule */}
      <ul className="relative flex items-center p-0.5 gap-0.5 sm:gap-1 select-none overflow-hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasBadge = (tab.badgeCount ?? 0) > 0;

          return (
            <li
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative group z-10 flex-shrink-0"
            >
              <button
                type="button"
                className={`relative flex items-center justify-center gap-1 sm:gap-2 rounded-full transition-all duration-200 outline-none focus:outline-none cursor-pointer ${
                  isActive
                    ? isDarkMode
                      ? "px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-sm"
                      : "px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-sm"
                    : isDarkMode
                    ? "w-[30px] h-[30px] sm:w-10 sm:h-10 text-slate-400 hover:text-white hover:bg-white/10"
                    : "w-[30px] h-[30px] sm:w-10 sm:h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-900/5"
                }`}
                title={tab.label}
              >
                {/* Tab Icon with badge */}
                <span className="relative flex items-center justify-center flex-shrink-0">
                  {tab.icon("w-3.5 h-3.5 sm:w-5 sm:h-5")}
                  {!isActive && hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                    </span>
                  )}
                </span>

                {/* Selected tab: show full name */}
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden whitespace-nowrap text-xs sm:text-sm font-bold flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    {hasBadge && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black bg-red-500 text-white">
                        {tab.badgeCount}
                      </span>
                    )}
                  </motion.span>
                )}

                {/* Active pill background */}
                {isActive && (
                  <motion.span
                    layoutId="admin-active-nav-pill"
                    className={`absolute inset-0 rounded-full -z-10 shadow-md ${
                      isDarkMode
                        ? "bg-white shadow-[0_2px_14px_rgba(255,255,255,0.25)]"
                        : "bg-slate-900 shadow-[0_2px_14px_rgba(0,0,0,0.22)]"
                    }`}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </button>

              {/* Hover Tooltip for collapsed icons */}
              {!isActive && (
                <div
                  className={`pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-xs font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-30 shadow-xl ${
                    isDarkMode
                      ? "bg-[#1e2228] text-slate-200 border border-[#2f3336]"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {tab.label}
                  {hasBadge && ` (${tab.badgeCount})`}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


