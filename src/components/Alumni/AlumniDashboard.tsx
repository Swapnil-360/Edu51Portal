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
  Compass, 
  BookOpen, 
  LogIn,
  MessageSquare
} from "lucide-react";
import { AlumniNavHeader } from "../ui/nav-header";
import AlumniHomePage from "./pages/AlumniHomePage";
import AlumniNetworkPage from "./pages/AlumniNetworkPage";
import AlumniTeamsPage from "./pages/AlumniTeamsPage";
import AlumniResourcesPage from "./pages/AlumniResourcesPage";
import AlumniProfilePage from "./pages/AlumniProfilePage";
import AlumniMessagesPage from "./pages/AlumniMessagesPage";
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
        return <AlumniHomePage isDarkMode={isDarkMode} userProfile={userProfile} authSession={authSession} />;
      case "network":
        return <AlumniNetworkPage isDarkMode={isDarkMode} authSession={authSession} userProfile={userProfile} />;
      case "teams":
        return <AlumniTeamsPage isDarkMode={isDarkMode} />;
      case "resources":
        return <AlumniResourcesPage isDarkMode={isDarkMode} authSession={authSession} userProfile={userProfile} />;
      case "messages":
        return <AlumniMessagesPage isDarkMode={isDarkMode} authSession={authSession} userProfile={userProfile} />;
      case "profile":
        return <AlumniProfilePage isDarkMode={isDarkMode} authSession={authSession} />;
      default:
        return <AlumniHomePage isDarkMode={isDarkMode} userProfile={userProfile} authSession={authSession} />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#000000]" : "bg-white"}`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 w-full z-50 border-b backdrop-blur-md transition-all duration-300 ${
        isDarkMode ? "bg-[#000000]/80 border-[#2f3336]/50 text-white" : "bg-white/80 border-slate-200/50 text-gray-900 shadow-sm"
      }`}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative">
          <div className="flex items-center justify-between h-[72px] lg:h-20 gap-4">
            
            {/* Left: Hamburger (mobile) + Logo (desktop) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`p-2 rounded-xl transition-all duration-200 lg:hidden ${
                  isDarkMode ? "hover:bg-white/10 text-[#8b98a5]" : "hover:bg-black/5 text-slate-600"
                }`}
                title="Menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              <button
                onClick={() => setCurrentView("home")}
                className="hidden lg:flex items-center focus:outline-none"
                title="Alumni Portal Home"
              >
                <img
                  src="/Edu51Portal.png"
                  alt="Edu51Portal Logo"
                  className="h-20 w-20 object-cover flex-shrink-0"
                  width="80"
                  height="80"
                />
                <span
                  className={`text-xl font-bold tracking-tight whitespace-nowrap ${isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"}`}
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                >
                  Edu<span className="text-red-500">51</span>Portal
                  <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30">ALUMNI</span>
                </span>
              </button>
            </div>

            {/* Center: Mobile Logo + Desktop sliding pill navbar */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              {/* Mobile center logo */}
              <button
                onClick={() => setCurrentView("home")}
                className="flex lg:hidden items-center focus:outline-none"
                title="Alumni Portal Home"
              >
                <img
                  src="/Edu51Portal.png"
                  alt="Edu51Portal Logo"
                  className="h-14 w-14 object-cover"
                  width="56"
                  height="56"
                />
                <span
                  className={`text-lg font-bold tracking-tight whitespace-nowrap ${isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"}`}
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                >
                  Edu<span className="text-red-500">51</span>Portal
                </span>
              </button>

              {/* Desktop slide navigation */}
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
            <div className="flex items-center gap-2 justify-end flex-shrink-0">
              
              {/* User Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 ${
                    isDarkMode ? "bg-[#16181c] border-[#2f3336] text-[#d9d9d9] hover:bg-[#2f3336]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
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
                  <div className={`absolute right-0 mt-2 w-52 rounded-xl border shadow-xl py-2 z-50 transition-all duration-200 ${
                    isDarkMode ? "bg-[#17181c] border-[#2f3336] text-[#d9d9d9]" : "bg-white border-slate-200 text-slate-700"
                  }`}>
                    <div className={`px-4 py-3 border-b ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
                      <p className="text-xs font-bold truncate">{userProfile.name}</p>
                      <p className={`text-[10px] truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{userProfile.bubtEmail}</p>
                    </div>

                    <button
                      onClick={() => { setCurrentView("profile"); setShowUserDropdown(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                        isDarkMode ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      <User className="w-4 h-4 text-blue-500" />
                      My Profile
                    </button>

                    <button
                      onClick={() => { setCurrentView("profile"); setShowUserDropdown(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                        isDarkMode ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-purple-500" />
                      Account Settings
                    </button>

                    <button
                      onClick={() => { toggleDarkMode(); setShowUserDropdown(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                        isDarkMode ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
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
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                        isDarkMode ? "hover:bg-[#16181c] text-red-400 hover:text-red-300" : "hover:bg-slate-100 text-red-600 hover:text-red-700"
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
                  className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
                    isDarkMode ? "bg-[#16181c] border-[#2f3336] text-[#8b98a5] hover:bg-[#2f3336]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
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
                      className={`absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto rounded-xl shadow-xl z-50 ${
                        isDarkMode ? "bg-[#17181c] border border-[#2f3336] text-[#d9d9d9]" : "bg-white border border-slate-200 text-slate-700"
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
                              className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              Mark all read
                            </button>
                          )}
                          <button
                            onClick={() => setShowNoticePanel(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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

                {/* Teams */}
                <button
                  onClick={() => { setCurrentView("teams"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "teams" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <Compass className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-sm">Teams</span>
                </button>

                {/* Resources */}
                <button
                  onClick={() => { setCurrentView("resources"); setShowMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left ${
                    isDarkMode ? "hover:bg-[#16181c]/50 border-[#2f3336]/50" : "hover:bg-slate-100/50 border-gray-200/50"
                  } ${currentView === "resources" ? (isDarkMode ? "bg-[#16181c]" : "bg-slate-100") : ""}`}
                >
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-sm">Resources</span>
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
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto">
        {renderActiveView()}
      </main>
    </div>
  );
}
