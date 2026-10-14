import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  X, 
  Menu, 
  User, 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  Home,
  Users,
  BookOpen,
  LogIn,
  MessageSquare,
  GraduationCap,
  Sparkles,
  Mail,
  Heart,
  Bug,
  ExternalLink,
  Rss
} from "lucide-react";
import { AlumniNavHeader } from "../ui/nav-header";
import AlumniHomePage from "./pages/AlumniHomePage";
import AlumniNetworkPage from "./pages/AlumniNetworkPage";
import AlumniResourcesPage from "./pages/AlumniResourcesPage";
import AlumniProfilePage from "./pages/AlumniProfilePage";
import AlumniMessagesPage from "./pages/AlumniMessagesPage";
import { FacultyDirectoryPage } from "../Faculty/FacultyDirectoryPage";
import MeetTeamPage from "../Team/MeetTeamPage";
import LegalPage from "../Legal/LegalPage";
import { FeedbackModal } from "../FeedbackModal";
import type { FeedbackCategory } from "../../types";
import { supabase } from "../../lib/supabase";
import { markAllNotificationsRead } from "../../lib/api/notificationsApi";

interface Props {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  userProfile: any;
  setUserProfile: any;
  setIsLoggedIn: any;
  setAuthSession: any;
  setIsAdmin: any;
  showMajorAccessNotification: any;
  mentionNotifications: any[];
  setMentionNotifications: any;
  getUnreadNoticeCount: () => number;
  unreadNotices: any[];
  setUnreadNotices: any;
  authSession: any;
}

export default function AlumniDashboard({
  isDarkMode,
  toggleDarkMode,
  userProfile,
  setUserProfile,
  setIsLoggedIn,
  setAuthSession,
  setIsAdmin,
  showMajorAccessNotification,
  mentionNotifications,
  setMentionNotifications,
  getUnreadNoticeCount,
  unreadNotices,
  setUnreadNotices,
  authSession
}: Props) {
  const [currentView, setCurrentView] = useState("home");
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("improvement");

  useEffect(() => {
    if (!authSession?.user?.id) return;
    const checkUnread = async () => {
      try {
        const { count, error } = await supabase
          .from("mentor_messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", authSession.user.id)
          .eq("is_read", false);

        if (!error && count !== null) {
          setUnreadMsgCount(count);
        }
      } catch (err) {
        console.error("Error checking unread messages:", err);
      }
    };
    checkUnread();

    const channel = supabase
      .channel("alumni_unread_badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mentor_messages"
        },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authSession]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNoticePanel, setShowNoticePanel] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const noticePanelRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (showNoticePanel && noticePanelRef.current && !noticePanelRef.current.contains(event.target as Node)) {
        // Only close if it's not the bell button itself
        const target = event.target as HTMLElement;
        if (!target.closest("button")?.title?.includes("Notifications")) {
          setShowNoticePanel(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNoticePanel]);

  const handleSignOut = async () => {
    setShowUserDropdown(false);
    setIsLoggedIn(false);
    setAuthSession(null);
    setIsAdmin(false);
    setUserProfile({
      name: "Welcome Student",
      section: "",
      major: "",
      bubtEmail: "",
      notificationEmail: "",
      phone: "",
      password: "",
      profilePic: "",
      avatar_url: "",
    });
    [
      "userProfileBubtEmail",
      "userProfileName",
      "userProfileMajor",
      "userProfileSection",
      "userProfileNotificationEmail",
      "userProfilePhone",
      "userProfilePic",
      "userProfilePassword",
      "userProfileAvatarUrl",
      "userProfile",
      "userProfileIsAlumni",
      "userProfileIsVerified",
    ].forEach((k) => localStorage.removeItem(k));
    
    showMajorAccessNotification(
      "success",
      "Signed out successfully. See you soon!"
    );
    await supabase.auth.signOut().catch((err) =>
      console.error("[SIGN OUT] Supabase error:", err)
    );
  };

  const totalNotifications = getUnreadNoticeCount() + mentionNotifications.length;

  const renderActiveView = () => {
    switch (currentView) {
      case "home":
        return (
          <AlumniHomePage
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            authSession={authSession}
            onNavigate={setCurrentView}
            unreadMessagesCount={unreadMsgCount}
          />
        );
      case "network":
        return (
          <AlumniNetworkPage
            isDarkMode={isDarkMode}
            authSession={authSession}
            userProfile={userProfile}
            onNavigate={setCurrentView}
          />
        );
      case "resources":
        return (
          <AlumniResourcesPage
            isDarkMode={isDarkMode}
            authSession={authSession}
            userProfile={userProfile}
            onViewAlumniProfile={() => setCurrentView("network")}
          />
        );
      case "messages":
        return <AlumniMessagesPage isDarkMode={isDarkMode} authSession={authSession} userProfile={userProfile} />;
      case "profile":
        return <AlumniProfilePage isDarkMode={isDarkMode} authSession={authSession} />;
      case "faculty":
        return (
          <FacultyDirectoryPage
            isDarkMode={isDarkMode}
            onClose={() => setCurrentView("home")}
            hideNotices={true}
          />
        );
      case "team":
        return (
          <MeetTeamPage
            isDarkMode={isDarkMode}
            onClose={() => setCurrentView("home")}
          />
        );
      case "terms":
      case "privacy":
      case "cookie-policy":
      case "disclaimer":
        return (
          <LegalPage
            currentView={currentView as any}
            isDarkMode={isDarkMode}
            goToView={(v) => {
              if (v === "home") setCurrentView("home");
              else setCurrentView(v);
            }}
          />
        );
      default:
        return <AlumniHomePage isDarkMode={isDarkMode} userProfile={userProfile} authSession={authSession} />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#000000]" : "bg-white"}`}>
      {/* Header */}
      <header className="fixed top-2.5 sm:top-3.5 inset-x-0 z-50 px-2.5 sm:px-4 md:px-6 pointer-events-none transition-all duration-300">
        <div className="max-w-7xl mx-auto relative pointer-events-auto">
          {/* Ambient backlight glow for translucent glass depth */}
          <div
            className={`absolute -inset-0.5 rounded-full blur-lg opacity-40 pointer-events-none transition-opacity duration-300 ${
              isDarkMode
                ? "bg-gradient-to-r from-purple-600/30 via-indigo-500/20 to-blue-600/30"
                : "bg-gradient-to-r from-purple-400/30 via-cyan-300/25 to-indigo-300/30"
            }`}
          />
          {/* Real frosted glass capsule */}
          <div
            className={`relative rounded-full transition-all duration-300 nav-glass-capsule ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between h-14 sm:h-16 px-2.5 sm:px-4 md:px-5 gap-2 sm:gap-4 relative">
              
              {/* Left: Hamburger (mobile only) + Logo */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className={`p-2 rounded-xl transition-all duration-200 lg:hidden cursor-pointer ${
                    isDarkMode ? "hover:bg-white/10 text-[#8b98a5]" : "hover:bg-black/5 text-slate-600"
                  }`}
                  title="Menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Logo — desktop only */}
                <button
                  onClick={() => setCurrentView("home")}
                  className="header-logo-btn hidden lg:flex items-center gap-2 focus:outline-none group pl-1 cursor-pointer"
                  title="Alumni Portal Home"
                >
                  <img
                    src="/Edu51Portal.png"
                    alt="Edu51Portal Logo"
                    className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-xl flex-shrink-0 drop-shadow-sm transition-transform group-hover:scale-105"
                    width="36"
                    height="36"
                    decoding="async"
                  />
                  <span
                    className={`text-base sm:text-lg font-bold tracking-tight whitespace-nowrap ${
                      isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"
                    }`}
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                  >
                    Edu<span className="text-red-500">51</span>Portal
                    <span className="text-[9px] sm:text-[10px] ml-1.5 px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
                      ALUMNI
                    </span>
                  </span>
                </button>
              </div>

              {/* Center: Mobile centered logo + Desktop sliding pill nav */}
              <div className="flex-1 min-w-0 flex items-center justify-center px-1 lg:flex-none lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                {/* Mobile: centered logo */}
                <button
                  onClick={() => setCurrentView("home")}
                  className="header-logo-btn flex lg:hidden items-center gap-1.5 focus:outline-none cursor-pointer"
                  title="Alumni Portal Home"
                >
                  <img
                    src="/Edu51Portal.png"
                    alt="Edu51Portal Logo"
                    className="h-7 w-7 object-contain rounded-lg drop-shadow-sm"
                    width="28"
                    height="28"
                    decoding="async"
                  />
                  <span
                    className={`text-sm sm:text-base font-bold tracking-tight whitespace-nowrap ${
                      isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"
                    }`}
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                  >
                    Edu<span className="text-red-500">51</span>Portal
                    <span className="text-[9px] ml-1 px-1 py-0.2 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
                      ALUMNI
                    </span>
                  </span>
                </button>

                {/* Desktop: sliding pill nav */}
                <nav className="hidden lg:flex items-center">
                  <AlumniNavHeader
                    currentView={currentView}
                    isDarkMode={isDarkMode}
                    goToView={setCurrentView}
                    unreadMessagesCount={unreadMsgCount}
                  />
                </nav>
              </div>

              {/* Right: Notification Bell + User profile settings dropdown */}
              <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-shrink-0 pr-0.5 sm:pr-1">
                
                {/* User Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className={`flex items-center gap-1.5 sm:gap-2 pl-1 pr-2.5 sm:pr-3 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
                      isDarkMode ? "bg-[#16181c]/80 border-[#2f3336] text-[#d9d9d9] hover:bg-[#2f3336]" : "bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs sm:text-sm shadow-xs">
                      {userProfile.profilePic || userProfile.avatar_url ? (
                        <img
                          src={userProfile.profilePic || userProfile.avatar_url}
                          alt={userProfile.name}
                          className="w-full h-full object-cover block"
                        />
                      ) : (
                        <span>{userProfile.name?.charAt(0)?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                      <span className="text-xs font-semibold max-w-[110px] truncate">{userProfile.name}</span>
                      <span className="text-[9px] px-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-bold uppercase mt-0.5">Alumni</span>
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 flex-shrink-0 ${showUserDropdown ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserDropdown && (
                    <div className={`absolute right-0 mt-2 w-52 rounded-2xl border shadow-2xl py-2 z-50 transition-all duration-200 backdrop-blur-xl ${
                      isDarkMode ? "bg-[#17181c]/95 border-[#2f3336] text-[#d9d9d9]" : "bg-white/95 border-slate-200 text-slate-700"
                    }`}>
                      <div className={`px-4 py-3 border-b ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
                        <p className="text-xs font-bold truncate">{userProfile.name}</p>
                        <p className={`text-[10px] truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{userProfile.bubtEmail}</p>
                      </div>

                      <button
                        onClick={() => { setCurrentView("profile"); setShowUserDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                          isDarkMode ? "hover:bg-white/5 text-[#d9d9d9] hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <User className="w-4 h-4 text-blue-500" />
                        My Profile
                      </button>

                      <button
                        onClick={() => { setCurrentView("profile"); setShowUserDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                          isDarkMode ? "hover:bg-white/5 text-[#d9d9d9] hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <Settings className="w-4 h-4 text-purple-500" />
                        Account Settings
                      </button>

                      <button
                        onClick={() => { toggleDarkMode(); setShowUserDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                          isDarkMode ? "hover:bg-white/5 text-[#d9d9d9] hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        {isDarkMode ? (
                          <>
                            <Sun className="w-4 h-4 text-yellow-400" />
                            <span>Light Mode</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-4 h-4 text-slate-500" />
                            <span>Dark Mode</span>
                          </>
                        )}
                      </button>

                      <div className="border-t border-opacity-10 border-slate-500 my-1"></div>

                      <button
                        onClick={handleSignOut}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                          isDarkMode ? "hover:bg-red-500/10 text-red-400 hover:text-red-300" : "hover:bg-red-50 text-red-600 hover:text-red-700"
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNoticePanel(!showNoticePanel)}
                    title="Notifications"
                    className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all duration-200 cursor-pointer ${
                      isDarkMode ? "bg-[#16181c]/80 border-[#2f3336] text-[#8b98a5] hover:bg-[#2f3336]" : "bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                    {totalNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-[0_0_8px_#ef4444]">
                        {totalNotifications > 99 ? "99+" : totalNotifications}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNoticePanel && (
                      <motion.div
                        ref={noticePanelRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto rounded-2xl shadow-2xl z-50 backdrop-blur-xl ${
                          isDarkMode ? "bg-[#17181c]/95 border border-[#2f3336] text-[#d9d9d9]" : "bg-white/95 border border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? "border-[#2f3336] bg-[#17181c]" : "border-slate-100 bg-white"}`}>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">Notifications</h3>
                            {totalNotifications > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                                {totalNotifications}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {mentionNotifications.length > 0 && authSession?.user?.id && (
                              <button
                                onClick={() => { markAllNotificationsRead(authSession.user.id); setMentionNotifications([]); }}
                                className={`text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ${isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-500 hover:text-slate-700"}`}
                              >
                                Mark all read
                              </button>
                            )}
                            <button
                              onClick={() => setShowNoticePanel(false)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="divide-y divide-[#2f3336]/10 p-2">
                          {mentionNotifications.length === 0 ? (
                            <div className={`text-center py-8 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                              No new notifications
                            </div>
                          ) : (
                            mentionNotifications.map((n) => (
                              <div key={n.id} className="p-3 text-xs flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[10px] text-purple-400 uppercase tracking-wider">{n.type === 'alumni_approval' ? 'Alumni Approval' : 'Notification'}</span>
                                  <span className={`text-[9px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="font-semibold">{n.title}</p>
                                {n.body && <p className={`italic ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>"{n.body}"</p>}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
              onClick={() => setShowMobileMenu(false)}
            />
            <div className={`fixed top-0 left-0 h-[100dvh] w-[80vw] max-w-xs shadow-2xl z-[120] flex flex-col ${
              isDarkMode ? "bg-gradient-to-b from-gray-900 to-slate-900 text-white" : "bg-gradient-to-b from-slate-50 to-white text-slate-900"
            }`}>
              <div className={`sticky top-0 px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2f3336]" : "border-gray-200"}`}>
                <h2 className="text-lg font-bold">Menu</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className={`p-1 rounded-lg transition-all ${isDarkMode ? "hover:bg-[#2f3336]" : "hover:bg-gray-100"}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-4 space-y-3">
                {/* Home */}
                <button
                  onClick={() => { setCurrentView("home"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "home" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <Home className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-sm">Home</span>
                </button>

                {/* Network */}
                <button
                  onClick={() => { setCurrentView("network"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "network" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <Users className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-sm">Network</span>
                </button>

                {/* Feed */}
                <button
                  onClick={() => { setCurrentView("resources"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "resources" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <Rss className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-sm">Feed</span>
                </button>

                {/* Messages */}
                <button
                  onClick={() => { setCurrentView("messages"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "messages" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                    <span className="font-semibold text-sm">Messages</span>
                  </div>
                  {unreadMsgCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1e9df1] text-white">
                      {unreadMsgCount}
                    </span>
                  )}
                </button>

                {/* Profile */}
                <button
                  onClick={() => { setCurrentView("profile"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "profile" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <User className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-sm">My Profile</span>
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <main className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto min-h-[calc(100vh-220px)]">
        {renderActiveView()}
      </main>

      {/* Modern Alumni Portal Footer */}
      <footer className={`border-t transition-colors mt-auto ${
        isDarkMode ? "bg-[#0b0c0e] border-[#2f3336]/60 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-6 sm:gap-y-8">
            
            {/* Col 1: Platform & Brand */}
            <div className="col-span-2 lg:col-span-1 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <img
                  src="/Edu51Portal.png"
                  alt="Edu51Portal Logo"
                  className="h-8 w-8 sm:h-9 sm:w-9 object-contain flex-shrink-0"
                />
                <span
                  className={`text-base sm:text-lg font-bold tracking-tight whitespace-nowrap ${isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"}`}
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                >
                  Edu<span className="text-red-500">51</span>Portal
                  <span className="text-[9px] ml-1.5 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">ALUMNI</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 max-w-md">
                The centralized alumni &amp; student networking bridge for Bangladesh University of Business and Technology (BUBT).
              </p>
              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  Built with 💖 by <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>CoreWe5(intake-51)</span>
                </span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-[10px] text-slate-500">Mirpur-2, Dhaka · BUBT</span>
              </div>
            </div>

            {/* Col 2: Alumni Portal Navigation */}
            <div className="col-span-1 space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Alumni Portal
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <button onClick={() => { setCurrentView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-[#1e9df1] transition-colors cursor-pointer text-left">
                    Alumni Home
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView("network"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-[#1e9df1] transition-colors cursor-pointer text-left">
                    Alumni Hub &amp; Network
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView("resources"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-[#1e9df1] transition-colors cursor-pointer text-left">
                    Shared Knowledge
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView("messages"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-[#1e9df1] transition-colors cursor-pointer text-left">
                    Direct Mentee Chats
                  </button>
                </li>
                <li>
                  <button onClick={() => { setCurrentView("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-[#1e9df1] transition-colors cursor-pointer text-left">
                    My Alumni Profile
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Campus Directory, Builder Team & Contact */}
            <div className="col-span-1 space-y-3.5">
              {/* Campus Directory */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Campus Directory
                </h4>
                <ul className="space-y-1.5 text-xs">
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("faculty");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-[#1e9df1] transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-purple-400 hover:text-purple-300 text-left"
                    >
                      <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Officials &amp; Faculty</span>
                    </button>
                  </li>
                  <li>
                    <a
                      href="https://www.bubt.edu.bd"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#1e9df1] transition-colors cursor-pointer flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                      <span>BUBT Website</span>
                      <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://annex.bubt.edu.bd"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#1e9df1] transition-colors cursor-pointer flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                      <span>Annex Portal</span>
                      <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
                    </a>
                  </li>
                </ul>
              </div>

              {/* Builder Team */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Builder Team
                </h4>
                <div>
                  <button
                    onClick={() => {
                      setCurrentView("team");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="font-semibold text-[#ef4444] hover:underline underline-offset-2 transition-colors hover:text-red-500 cursor-pointer text-xs inline-flex items-center gap-1 text-left"
                  >
                    <span>Meet the Team (CoreWe5)</span>
                  </button>
                </div>
              </div>

              {/* Contact (Icon-only) */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Contact
                </h4>
                <div className="flex items-center gap-2">
                  <a
                    href="mailto:edu51portal.noreply@gmail.com?subject=Want%20to%20talk%20about%20Edu51Portal&body=Hi%20Swapnil%20%26%20CoreWe5%20team,%0A%0AI%20want%20to%20talk%20about%20Edu51Portal."
                    title="Email (edu51portal.noreply@gmail.com)"
                    aria-label="Email Edu51Portal"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      isDarkMode
                        ? "bg-[#16181c] hover:bg-red-600 text-slate-400 hover:text-white"
                        : "bg-slate-100 hover:bg-red-600 text-slate-500 hover:text-white"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  <a
                    href="https://wa.me/8801318090383?text=Hi%20Swapnil,%20I%20want%20to%20talk%20about%20Edu51Portal"
                    target="_blank"
                    rel="noreferrer"
                    title="WhatsApp Chat (+8801318090383)"
                    aria-label="WhatsApp Swapnil"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      isDarkMode
                        ? "bg-[#16181c] hover:bg-emerald-600 text-slate-400 hover:text-white"
                        : "bg-slate-100 hover:bg-emerald-600 text-slate-500 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Col 4: Feedback & Support */}
            <div className="col-span-2 lg:col-span-1 space-y-2.5 pt-3 lg:pt-0 border-t border-slate-700/20 lg:border-t-0">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Feedback &amp; Support
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                Have ideas or suggestions for Edu51Portal? Send your thoughts directly to our team.
              </p>
              <div className="space-y-2 pt-0.5">
                <button
                  onClick={() => {
                    setFeedbackCategory("improvement");
                    setShowFeedbackModal(true);
                  }}
                  className="w-full py-2 px-3.5 rounded-xl text-xs font-semibold text-white bg-[#1e9df1] hover:bg-[#1a8cd8] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Platform Feedback</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFeedbackCategory("bug");
                      setShowFeedbackModal(true);
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      isDarkMode
                        ? "border-[#2f3336] bg-[#16181c] text-slate-300 hover:text-white hover:border-slate-500"
                        : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400"
                    }`}
                  >
                    Report Bug
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackCategory("feature");
                      setShowFeedbackModal(true);
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      isDarkMode
                        ? "border-[#2f3336] bg-[#16181c] text-slate-300 hover:text-white hover:border-slate-500"
                        : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400"
                    }`}
                  >
                    Suggest Feature
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Copyright & Legal bar */}
          <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-[#2f3336]/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 text-center sm:text-left">
            <p>
              © {new Date().getFullYear()} Edu<span className="text-red-500">51</span>Portal · Built with 💖 by <span className="text-[#1e9df1] font-semibold">CoreWe5(intake-51)</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-3 text-[11px]">
              <button onClick={() => { setCurrentView("terms"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition-colors cursor-pointer">
                Terms &amp; Conditions
              </button>
              <span>·</span>
              <button onClick={() => { setCurrentView("privacy"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition-colors cursor-pointer">
                Privacy Policy
              </button>
              <span>·</span>
              <button onClick={() => { setCurrentView("cookie-policy"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition-colors cursor-pointer">
                Cookies
              </button>
              <span>·</span>
              <button onClick={() => { setCurrentView("disclaimer"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition-colors cursor-pointer">
                Disclaimer
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Direct Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        isDarkMode={isDarkMode}
        currentUserId={authSession?.user?.id}
        currentUserName={userProfile?.name}
        currentUserEmail={userProfile?.bubtEmail}
        initialCategory={feedbackCategory}
        onResult={(type, msg) => {
          showMajorAccessNotification?.(type, msg);
        }}
      />
    </div>
  );
}
