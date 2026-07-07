import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, startTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "./lib/supabase";
import { Notice } from "./types";
import {
  getGoogleDriveLink,
  getCourseCategories,
  getCategoryInfo,
  getCourseFiles,
} from "./config/googleDrive";
import { getCurrentSemesterStatus } from "./config/semester";
const SemesterTracker = lazy(() => import("./components/SemesterTracker"));
const CustomRoutine = lazy(() => import("./components/Student/CustomRoutine"));
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  savePushSubscription,
  isPushNotificationSupported,
  getNotificationPermission,
  isPushSubscribed,
  validateCurrentSubscription,
} from "./lib/pushNotifications";
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "./lib/api/notificationsApi";
import {
  sendEmailToAllStudents,
  sendEmailNotification,
  EmailNotification,
} from "./lib/emailNotifications";
import { SignUpModal } from "./components/SignUpModal";
import { AppNavHeader } from "./components/ui/nav-header";
import { ResetPasswordModal } from "./components/ResetPasswordModal";
import { SetNewPasswordModal } from "./components/SetNewPasswordModal";
import { ChangeEmailModal } from "./components/ChangeEmailModal";
import { SignInModal } from "./components/SignInModal";
import { FeedbackModal } from "./components/FeedbackModal";
import {
  listFeedback,
  updateFeedbackStatus,
} from "./lib/api/feedbackApi";
import { uploadRoutineAttachment } from "./lib/storage";
import type { Feedback, FeedbackStatus } from "./types";
import MarqueeTicker from "./components/MarqueeTicker";
import { MajorCardStack } from "./components/ui/MajorCardStack";
import { Tiles } from "./components/ui/tiles";
const PDFViewer = lazy(() => import("./components/PDFViewer"));
const AdminDashboard = lazy(() => import("./components/Admin/AdminDashboard"));
const GDriveFolderBrowser = lazy(() => import("./components/Student/GDriveFolderBrowser").then(m => ({ default: m.GDriveFolderBrowser })));
const GDriveCourseView = lazy(() => import("./components/Student/GDriveCourseView").then(m => ({ default: m.GDriveCourseView })));
const AIAssistant = lazy(() => import("./components/AIAssistant/AIAssistant").then(m => ({ default: m.AIAssistant })));
import {
  FileText,
  Play,
  Tag,
  Eye,
  Download,
  Trash2,
  Plus,
  Upload,
  Bell,
  X,
  FolderOpen,
  BookOpen,
  Calendar,
  ExternalLink,
  ImageIcon,
  Clock,
  Moon,
  Sun,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader,
  LogOut,
  LogIn,
  UserPlus,
  Users,
  GraduationCap,
  Trophy,
  User,
  Settings,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Info,
  CreditCard,
  ToggleLeft,
  HelpCircle,
  Home,
} from "lucide-react";
const ProfilePage = lazy(() => import("./components/Profile/ProfilePage"));
const NetworkPage = lazy(() => import("./components/Network/NetworkPage"));
const TeamsPage = lazy(() => import("./components/Teams/TeamsPage"));
const TeamPage = lazy(() => import("./components/Teams/TeamPage"));
const PublicFilesPage = lazy(() => import("./components/Teams/PublicFilesPage"));
const WorldCupPage = lazy(() => import("./components/WorldCup/WorldCupPage").then(m => ({ default: m.WorldCupPage })));
const WC26IntroModal = lazy(() => import("./components/WorldCup/WC26IntroModal").then(m => ({ default: m.WC26IntroModal })));
const AlumniDirectoryPage = lazy(() => import("./components/Alumni/AlumniDirectoryPage"));
const AlumniProfilePage = lazy(() => import("./components/Alumni/AlumniProfilePage"));
const AlumniRegisterForm = lazy(() => import("./components/Alumni/AlumniRegisterForm"));

interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  file_url: string | null;
  video_url: string | null;
  type: string;
  course_code: string;
  size: string | null;
  exam_period?: "midterm" | "final"; // NEW: For filtering by exam period
  uploaded_by?: string; // NEW: Admin email who uploaded
  download_url?: string; // NEW: Separate download link
  created_at: string;
}

function App() {
  // Dark mode state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newValue = !prev;
      localStorage.setItem("darkMode", JSON.stringify(newValue));
      return newValue;
    });
  };

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Removed unused navigate and location from partial router migration
  // --- Browser history sync for currentView ---
  const [currentView, setCurrentView] = useState<
    | "admin"
    | "section5"
    | "ai"
    | "software"
    | "networking"
    | "course"
    | "home"
    | "semester"
    | "privacy"
    | "custom"
    | "profile"
    | "network"
    | "teams"
    | "team"
    | "alumni"
    | "wc26"
    | "shared-resources"
  >(() => {
    const path = window.location.pathname;
    if (path === "/admin") return "admin";
    if (path === "/section5" || path === "/ai") return "ai";
    if (path === "/software") return "software";
    if (path === "/networking") return "networking";
    if (path === "/semester") return "semester";
    if (path === "/custom-routine") return "custom";
    if (path === "/privacy") return "privacy";
    if (path.startsWith("/course/")) return "course";
    if (path === "/profile" || path.startsWith("/u/")) return "profile";
    if (path === "/network") return "network";
    if (path.startsWith("/teams/")) return "team";
    if (path === "/teams") return "teams";
    if (path === "/alumni") return "alumni";
    if (path === "/wc26") return "wc26";
    if (path === "/shared-resources") return "shared-resources";
    // Always treat root, /home, or empty as home
    if (path === "/" || path === "/home" || path === "" || !path) return "home";
    // Fallback: if path is not recognized, force home view
    return "home";
  });

  // V2 social routing params (parsed from path, mirrors /course/:id pattern)
  const [viewedUsername, setViewedUsername] = useState<string | null>(() => {
    const path = window.location.pathname;
    return path.startsWith("/u/") ? decodeURIComponent(path.slice(3)) : null;
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    const path = window.location.pathname;
    return path.startsWith("/teams/") ? path.slice(7) : null;
  });

  const [alumniSubView, setAlumniSubView] = useState<"directory" | "profile" | "register">("directory");
  const [selectedAlumniId, setSelectedAlumniId] = useState<string | null>(null);

  // Helper to change view and update browser history (memoized)
  const goToView = useCallback(
    (
      view:
        | "admin"
        | "section5"
        | "ai"
        | "software"
        | "networking"
        | "course"
        | "home"
        | "semester"
        | "privacy"
        | "terms"
        | "custom"
        | "profile"
        | "network"
        | "teams"
        | "team"
        | "alumni"
        | "wc26"
        | "shared-resources",
      extra?: string | null,
    ) => {
      let path = "/";
      if (view === "admin") path = "/admin";
      else if (view === "section5" || view === "ai") path = "/ai";
      else if (view === "software") path = "/software";
      else if (view === "networking") path = "/networking";
      else if (view === "semester") path = "/semester";
      else if (view === "privacy") path = "/privacy";
      else if (view === "custom") path = "/custom-routine";
      else if (view === "course" && extra) path = `/course/${extra}`;
      else if (view === "profile") {
        path = extra ? `/u/${encodeURIComponent(extra)}` : "/profile";
        setViewedUsername(extra ?? null);
      } else if (view === "network") path = "/network";
      else if (view === "team" && extra) {
        path = `/teams/${extra}`;
        setSelectedTeamId(extra);
      } else if (view === "teams") path = "/teams";
      else if (view === "alumni") {
        path = "/alumni";
        setAlumniSubView("directory");
        setSelectedAlumniId(null);
      }
      else if (view === "wc26") path = "/wc26";
      else if (view === "shared-resources") path = "/shared-resources";
      else if (view === "home") path = "/home";
      window.history.pushState({}, "", path);
      // Dismiss any lingering toast when navigating away
      if (!["ai", "section5"].includes(view)) setMajorAccessMessage(null);
      startTransition(() => setCurrentView(view));
    },
    [setAlumniSubView, setSelectedAlumniId],
  );

  // Admin status is DB-driven (profiles.is_admin), applied after the profile loads.
  const [isAdmin, setIsAdmin] = useState(false);

  // Route guard: non-admins can never sit on the admin view. Covers direct
  // /admin deep-links and live demotion — there is no public admin page anymore.
  useEffect(() => {
    if (currentView === "admin" && !isAdmin) {
      setCurrentView("home");
      window.history.replaceState({}, "", "/home");
    }
  }, [currentView, isAdmin]);

  // Listen for browser back/forward events
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      startTransition(() => {
        if (path === "/admin") setCurrentView("admin");
        else if (path === "/section5" || path === "/ai") setCurrentView("ai");
        else if (path === "/software") setCurrentView("software");
        else if (path === "/networking") setCurrentView("networking");
        else if (path === "/semester") setCurrentView("semester");
        else if (path === "/custom-routine") setCurrentView("custom");
        else if (path === "/privacy") setCurrentView("privacy");
        else if (path.startsWith("/course/")) setCurrentView("course");
        else if (path === "/profile") {
          setViewedUsername(null);
          setCurrentView("profile");
        } else if (path.startsWith("/u/")) {
          setViewedUsername(decodeURIComponent(path.slice(3)));
          setCurrentView("profile");
        } else if (path === "/network") setCurrentView("network");
        else if (path.startsWith("/teams/")) {
          setSelectedTeamId(path.slice(7));
          setCurrentView("team");
        } else if (path === "/teams") setCurrentView("teams");
        else if (path === "/alumni") {
          setAlumniSubView("directory");
          setSelectedAlumniId(null);
          setCurrentView("alumni");
        }
        else if (path === "/wc26") setCurrentView("wc26");
        else if (path === "/" || path === "/home" || path === "" || !path)
          setCurrentView("home");
        else setCurrentView("home");
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAdmin, setAlumniSubView, setSelectedAlumniId]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalMaterialsCount, setTotalMaterialsCount] = useState<number>(0);
  // Real-time admin platform stats (from get_admin_stats RPC)
  const [adminStats, setAdminStats] = useState<{
    storage_bytes: number;
    storage_by_bucket: { bucket: string; bytes: number; files: number }[];
    users: number;
    teams: number;
    materials: number;
  } | null>(null);
  // Admin Users management (promote/demote)
  const [adminUsers, setAdminUsers] = useState<
    { id: string; name: string | null; bubt_email: string | null; is_admin: boolean }[]
  >([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  // User feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);
  const hasLoadedInitialNotices = useRef(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<
    Array<{ id: string; message: string; status: string; created_at: string }>
  >([]);
  const [emergencyLinks, setEmergencyLinks] = useState<
    Array<{
      id: string;
      title: string;
      url: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDriveCourse, setSelectedDriveCourse] = useState<{
    courseCode: string;
    courseName: string;
    folderId: string;
    folderLink: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [semesterStatus, setSemesterStatus] = useState(
    getCurrentSemesterStatus(),
  );
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [showCreateNotice, setShowCreateNotice] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showNoticePanel, setShowNoticePanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showSetNewPasswordModal, setShowSetNewPasswordModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState<boolean>(
    () => localStorage.getItem("edu51five_banner_update1_dismissed") !== "true"
  );
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestMajor, setGuestMajor] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authSession, setAuthSession] = useState<any>(null);
  const [unreadNotices, setUnreadNotices] = useState<string[]>([]);
  const [showWC26Intro, setShowWC26Intro] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Authoritative admin check: only an authenticated Supabase session whose
  // profile has is_admin=true grants admin. This mirrors exactly what the DB
  // enforces on admin RPCs/RLS, so the admin UI is never shown without real
  // access (a profile loaded by email without a session must NOT grant admin).
  useEffect(() => {
    let cancelled = false;
    const resolveAdmin = async () => {
      if (!authSession?.user?.id) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc("is_app_admin");
      if (!cancelled) setIsAdmin(!error && data === true);
    };
    resolveAdmin();
    return () => {
      cancelled = true;
    };
  }, [authSession]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // User profile state
  const [userProfile, setUserProfile] = useState({
    name: localStorage.getItem("userProfileName") || "Welcome Student",
    section:
      localStorage.getItem("userProfileSection") || "Intake 51, Section 2 (AI)",
    major: localStorage.getItem("userProfileMajor") || "",
    bubtEmail: localStorage.getItem("userProfileBubtEmail") || "",
    notificationEmail:
      localStorage.getItem("userProfileNotificationEmail") || "",
    phone: localStorage.getItem("userProfilePhone") || "",
    password: localStorage.getItem("userProfilePassword") || "",
    profilePic: localStorage.getItem("userProfilePic") || "",
    avatar_url: localStorage.getItem("userProfileAvatarUrl") || "",
    isAlumni: localStorage.getItem("userProfileIsAlumni") === "true",
    isVerified: localStorage.getItem("userProfileIsVerified") === "true",
  });

  const activeMajor = isLoggedIn ? userProfile.major : guestMajor;

  // Major access notification state
  const [majorAccessMessage, setMajorAccessMessage] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);

  // Connections requests notification state
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);

  const _toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const _welcomeShown = useRef(false);
  const showMajorAccessNotification = (
    type: "error" | "success" | "info",
    message: string,
  ) => {
    if (_toastTimer.current) clearTimeout(_toastTimer.current);
    setMajorAccessMessage({ type, message });
    _toastTimer.current = setTimeout(() => setMajorAccessMessage(null), type === "error" ? 4000 : 2000);
  };

  useEffect(() => {
    if (isLoggedIn && guestMajor) {
      setGuestMajor("");
    }
  }, [isLoggedIn, guestMajor]);

  // Extract BUBT ID from email (22235103183 from 22235103183@cse.bubt.edu.bd)
  const extractBubtId = (email?: string) => {
    if (!email) return "";
    const local = email.split("@")[0] || "";
    const match = local.match(/^\d+/);
    return match ? match[0] : local;
  };

  // Columns to fetch for profile metadata — deliberately excludes profile_pic
  // because it's a 400KB+ base64 blob that causes timeouts on free-tier Supabase.
  // profile_pic is served from localStorage cache and refreshed in the background.
  // avatar_url (Storage URL) is short and included so it's cached immediately on login.
  const PROFILE_META_COLS =
    "id,name,section,major,bubt_email,notification_email,phone,created_at,last_login_at,avatar_url,is_admin,is_alumni,is_verified";

  const applyProfileData = (profileData: any, email: string, password: string) => {
    // NOTE: admin status is NOT set from this profile fetch — it's resolved
    // authoritatively against the live Supabase session (see the isAdmin effect),
    // because a profile can be loaded by email without an authenticated session,
    // and admin RPCs require a real session to work.
    const cachedPic = localStorage.getItem("userProfilePic") || "";
    const cachedAvatarUrl = localStorage.getItem("userProfileAvatarUrl") || "";
    // Prefer Supabase Storage URL (avatar_url) over legacy base64 (profile_pic)
    const avatarUrl = profileData?.avatar_url || cachedAvatarUrl;
    const pic = avatarUrl || profileData?.profile_pic || cachedPic;
    const updatedProfile = {
      name: profileData?.name || "Welcome Student",
      section: profileData?.section || "",
      major: profileData?.major || "",
      bubtEmail: profileData?.bubt_email || email,
      notificationEmail: profileData?.notification_email || "",
      phone: profileData?.phone || "",
      password,
      profilePic: pic,
      avatar_url: pic,
      isAlumni: profileData?.is_alumni || false,
      isVerified: profileData?.is_verified || false,
    };
    localStorage.setItem("userProfileBubtEmail", updatedProfile.bubtEmail);
    localStorage.setItem("userProfileName", updatedProfile.name);
    localStorage.setItem("userProfileSection", updatedProfile.section);
    localStorage.setItem("userProfileMajor", updatedProfile.major);
    localStorage.setItem("userProfileNotificationEmail", updatedProfile.notificationEmail);
    localStorage.setItem("userProfilePhone", updatedProfile.phone);
    localStorage.setItem("userProfileIsAlumni", updatedProfile.isAlumni ? "true" : "false");
    localStorage.setItem("userProfileIsVerified", updatedProfile.isVerified ? "true" : "false");
    if (avatarUrl) {
      localStorage.setItem("userProfileAvatarUrl", avatarUrl);
      // Preload the image so it's in browser cache when the profile page opens
      if (avatarUrl.startsWith("http")) {
        const img = new Image();
        img.src = avatarUrl;
      }
    }
    if (pic && !avatarUrl) {
      localStorage.setItem("userProfilePic", pic);
    }
    if (password) localStorage.setItem("userProfilePassword", password);
    setUserProfile(updatedProfile);
  };

  // Load profile from Supabase by email and update state/localStorage
  const loadProfileFromSupabase = async (
    email: string,
    password: string = "",
  ): Promise<boolean> => {
    try {
      if (!email) return false;
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(PROFILE_META_COLS)
        .eq("bubt_email", email.toLowerCase())
        .single();

      if (error) {
        console.warn("Profile fetch error:", error.message);
        return false;
      }

      let isVerifiedVal = profileData?.is_verified || false;
      if (profileData?.is_alumni) {
        const { data: alumniProfile } = await supabase
          .from("alumni_profiles")
          .select("is_verified")
          .eq("id", profileData.id)
          .maybeSingle();
        if (alumniProfile) {
          isVerifiedVal = alumniProfile.is_verified || false;
        }
      }

      applyProfileData({ ...profileData, is_verified: isVerifiedVal }, email, password);
      console.log("Profile loaded from Supabase");

      // Refresh profile_pic in background so next session gets latest image
      if (profileData?.id) {
        supabase.from("profiles").select("profile_pic").eq("id", profileData.id).single()
          .then(({ data: picRow }: { data: any }) => {
            if (picRow?.profile_pic) {
              localStorage.setItem("userProfilePic", picRow.profile_pic);
              localStorage.setItem("userProfileAvatarUrl", picRow.profile_pic);
              setUserProfile((prev: any) => ({ ...prev, profilePic: picRow.profile_pic, avatar_url: picRow.profile_pic }));
            }
          });
      }
      return true;
    } catch (err) {
      console.error("Error loading profile from Supabase:", err);
      return false;
    }
  };

  // Load profile using Supabase user id (preferred)
  const loadProfileFromSupabaseById = async (
    userId: string,
    password: string = "",
  ): Promise<boolean> => {
    try {
      if (!userId) return false;
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(PROFILE_META_COLS)
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile fetch by ID error:", error.message);
        return false;
      }

      let isVerifiedVal = profileData?.is_verified || false;
      if (profileData?.is_alumni) {
        const { data: alumniProfile } = await supabase
          .from("alumni_profiles")
          .select("is_verified")
          .eq("id", userId)
          .maybeSingle();
        if (alumniProfile) {
          isVerifiedVal = alumniProfile.is_verified || false;
        }
      }

      applyProfileData({ ...profileData, is_verified: isVerifiedVal }, profileData?.bubt_email || "", password);
      console.log("Profile loaded from Supabase by ID");

      // Refresh profile_pic in background
      supabase.from("profiles").select("profile_pic").eq("id", userId).single()
        .then(({ data: picRow }: { data: any }) => {
          if (picRow?.profile_pic) {
            localStorage.setItem("userProfilePic", picRow.profile_pic);
            localStorage.setItem("userProfileAvatarUrl", picRow.profile_pic);
            setUserProfile((prev: any) => ({ ...prev, profilePic: picRow.profile_pic, avatar_url: picRow.profile_pic }));
          }
        });
      return true;
    } catch (err) {
      console.error("Error loading profile by ID from Supabase:", err);
      return false;
    }
  };

  // Load user avatar/profile picture from Supabase `profiles` table
  // Note: the DB column is `profile_pic` (not `avatar_url`) in our schema.
  const loadUserAvatarFromSupabase = async () => {
    try {
      const email =
        userProfile.bubtEmail || localStorage.getItem("userProfileBubtEmail");
      if (!email) return;
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("profile_pic")
        .eq("bubt_email", email)
        .limit(1);
      if (error) {
        console.warn("Supabase error when loading profile picture", error);
        return;
      }
      if (profiles && profiles[0]?.profile_pic) {
        const profilePic = profiles[0].profile_pic;
        // Keep both keys for backwards compatibility with older code/pathways
        localStorage.setItem("userProfilePic", profilePic);
        localStorage.setItem("userProfileAvatarUrl", profilePic);
        setUserProfile((prev) => ({
          ...prev,
          profilePic: profilePic,
          avatar_url: profilePic,
        }));
      }
    } catch (e) {
      console.warn("Failed to load avatar/profile picture from Supabase", e);
    }
  };

  // Initialize Supabase auth session listener
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // Direct parse of URL hash/search for recovery parameter to bypass auth listener race conditions
        const isRecoveryInit = 
          window.location.hash.includes('type=recovery') || 
          window.location.hash.includes('recovery') || 
          window.location.search.includes('type=recovery');
        if (isRecoveryInit) {
          console.log("Found password recovery parameter in URL on initialization");
          setShowSetNewPasswordModal(true);
        }

        if (error) {
          console.error("Auth session error:", error);
          setAuthLoading(false);
          return;
        }

        if (session && session.user) {
          setAuthSession(session);
          setIsLoggedIn(true);

          // Show WC26 intro once per device if not dismissed before
          if (!localStorage.getItem("wc26_intro_dismissed")) {
            setTimeout(() => setShowWC26Intro(true), 2000);
          }

          // Try loading profile by auth user id first, then fall back to email.
          // This handles both: tables where id = auth UUID, and tables where the
          // profile was created with a different id but bubt_email matches.
          let profileLoaded = await loadProfileFromSupabaseById(session.user.id);
          if (!profileLoaded && session.user.email) {
            profileLoaded = await loadProfileFromSupabase(
              session.user.email.toLowerCase(),
            );
          }
          if (!profileLoaded) {
            console.warn(
              "Profile not found in database for user:",
              session.user.id,
              session.user.email,
            );
            // Supabase may be slow/paused. Use user_metadata (set at signup) so
            // the sidebar never shows "Welcome Student" for a real signed-in user.
            const meta = session.user.user_metadata || {};
            const cachedName = localStorage.getItem("userProfileName");
            const fallbackName =
              meta.name ||
              cachedName ||
              session.user.email?.split("@")[0] ||
              "Student";
            setUserProfile((prev: any) => ({
              ...prev,
              name: fallbackName,
              bubtEmail: prev.bubtEmail || session.user.email || "",
              section: prev.section || meta.section || "",
              major: prev.major || meta.major || "",
              phone: prev.phone || meta.phone || "",
              notificationEmail:
                prev.notificationEmail || meta.notificationEmail || "",
              isAlumni: prev.isAlumni || meta.is_alumni || false,
            }));
            // Retry profile load after 15s — gives Supabase cold-start time to wake up
            setTimeout(async () => {
              const retried = await loadProfileFromSupabaseById(session.user.id);
              if (!retried && session.user.email) {
                await loadProfileFromSupabase(session.user.email.toLowerCase());
              }
            }, 15000);
          } else {
            // Update last login timestamp in background
            supabase
              .from("profiles")
              .update({ last_login_at: new Date().toISOString() })
              .eq("id", session.user.id)
              .then(({ error: e }: { error: any }) => {
                if (e) console.warn("last_login_at update failed:", e.message);
              });
          }
        } else {
          // No session, check localStorage fallback
          const storedEmail = localStorage.getItem("userProfileBubtEmail");
          if (storedEmail) {
            setIsLoggedIn(true);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log("Auth state change:", event);

      if (event === "SIGNED_IN" && session) {
        setAuthSession(session);
        setIsLoggedIn(true);
        setShowSignInModal(false); // Always close sign-in modal on successful auth

        // Show WC26 intro once per device if not dismissed before
        if (!localStorage.getItem("wc26_intro_dismissed")) {
          setTimeout(() => setShowWC26Intro(true), 1500);
        }

        // Secondary fallback for recovery redirect when SIGNED_IN is fired instead of PASSWORD_RECOVERY
        const isRecoveryRedirect = 
          window.location.hash.includes('type=recovery') || 
          window.location.hash.includes('recovery') || 
          window.location.search.includes('type=recovery');
        if (isRecoveryRedirect) {
          console.log("SIGNED_IN event with recovery hash parameters. Showing reset modal.");
          setShowSetNewPasswordModal(true);
        }

        // IMMEDIATELY apply user_metadata so sidebar never shows "Welcome Student"
        // while we wait for the DB profile query to complete.
        const meta = session.user.user_metadata || {};
        const cachedName = localStorage.getItem("userProfileName");
        const cachedPic  = localStorage.getItem("userProfilePic") || "";
        const cachedAvatarUrl = localStorage.getItem("userProfileAvatarUrl") || "";
        const quickName  =
          meta.name ||
          cachedName ||
          session.user.email?.split("@")[0] ||
          "Student";
        if (quickName && quickName !== "Welcome Student") {
          setUserProfile((prev: any) => ({
            ...prev,
            name: quickName,
            bubtEmail: prev.bubtEmail || session.user.email || "",
            section: prev.section || meta.section || "",
            major: prev.major || meta.major || "",
            phone: prev.phone || meta.phone || "",
            notificationEmail: prev.notificationEmail || meta.notificationEmail || "",
            profilePic: prev.profilePic || cachedAvatarUrl || cachedPic,
            avatar_url: prev.avatar_url || cachedAvatarUrl || cachedPic,
            isAlumni: prev.isAlumni || meta.is_alumni || (localStorage.getItem("userProfileIsAlumni") === "true") || false,
            isVerified: prev.isVerified || (localStorage.getItem("userProfileIsVerified") === "true") || false,
          }));
          localStorage.setItem("userProfileName", quickName);
        }

        // Load full profile from DB in background (non-blocking).
        // loadProfileFromSupabase* helpers set state and persist all fields to localStorage.
        const loadInBackground = async () => {
          let loaded = await loadProfileFromSupabaseById(session.user.id);
          if (!loaded && session.user.email) {
            loaded = await loadProfileFromSupabase(session.user.email.toLowerCase());
          }
          if (!loaded) {
            // Retry after 15s — gives Supabase cold-start time to wake up
            setTimeout(async () => {
              const retried = await loadProfileFromSupabaseById(session.user.id);
              if (!retried && session.user.email) {
                await loadProfileFromSupabase(session.user.email.toLowerCase());
              }
            }, 15000);
          }
        };
        loadInBackground();
      } else if (event === "PASSWORD_RECOVERY") {
        setShowSetNewPasswordModal(true);
      } else if (event === "SIGNED_OUT") {
        setAuthSession(null);
        setIsLoggedIn(false);
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
          isAlumni: false,
          isVerified: false,
        });

        // Clear localStorage
        localStorage.removeItem("userProfileBubtEmail");
        localStorage.removeItem("userProfileName");
        localStorage.removeItem("userProfileMajor");
        localStorage.removeItem("userProfileSection");
        localStorage.removeItem("userProfileNotificationEmail");
        localStorage.removeItem("userProfilePhone");
        localStorage.removeItem("userProfilePic");
        localStorage.removeItem("userProfileAvatarUrl");
        localStorage.removeItem("userProfilePassword");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("userProfileIsAlumni");
        localStorage.removeItem("userProfileIsVerified");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userProfile.bubtEmail) {
      loadUserAvatarFromSupabase();
    }
  }, [userProfile.bubtEmail]);

  // Real-time active users tracking
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const sessionIdRef = useRef<string>("");

  // Push notification states
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");
  const hasInitializedPush = useRef(false);

  // In-app mention notifications
  const [mentionNotifications, setMentionNotifications] = useState<AppNotification[]>([]);

  // Admin broadcast push notification state
  const [broadcastPush, setBroadcastPush] = useState({
    title: "",
    body: "",
    url: "/",
  });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Exam period selection state - Auto-detect based on current semester phase
  const [selectedExamPeriod, setSelectedExamPeriod] = useState<
    "midterm" | "final"
  >(() => {
    const status = getCurrentSemesterStatus();
    // Show 'final' tab if we're in Final Exam Preparation or Final Examinations period
    return status.currentPhase === "Final Exam Preparation" ||
      status.currentPhase === "Final Examinations"
      ? "final"
      : "midterm";
  });

  // File viewer modal states
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>("");
  const [currentFileName, setCurrentFileName] = useState<string>("");

  // Material viewer modal state
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  );
  const [showMaterialViewer, setShowMaterialViewer] = useState(false);

  // Material viewer enhancement states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isViewerLoading, setIsViewerLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // ===== MEMOIZED HOOKS (AFTER state declarations) =====
  // Memoize filtered materials for current exam period
  const filteredMaterials = useMemo(
    () =>
      materials.filter(
        (m) => (m.exam_period || "midterm") === selectedExamPeriod,
      ),
    [materials, selectedExamPeriod],
  );

  // Memoize active notices count
  const activeNotices = useMemo(
    () => notices.filter((n) => n.is_active),
    [notices],
  );

  // Memoize unread notice count
  const unreadCount = useMemo(
    () =>
      notices.filter(
        (notice) => notice.is_active && !unreadNotices.includes(notice.id),
      ).length,
    [notices, unreadNotices],
  );

  const [newCourse, setNewCourse] = useState({
    name: "",
    code: "",
    description: "",
    section_id: "1",
  });
  const [newMaterial, setNewMaterial] = useState({
    title: "",
    course_id: "",
    type: "pdf" as Material["type"],
    file: null as File | null,
    video_url: "",
    description: "",
    exam_period: "midterm" as "midterm" | "final", // Default to midterm
  });
  const [newNotice, setNewNotice] = useState({
    title: "",
    content: "",
    type: "info" as "info" | "warning" | "success" | "error",
    category: "announcement" as
      | "random"
      | "exam"
      | "event"
      | "information"
      | "academic"
      | "announcement",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    exam_type: null as "midterm" | "final" | null,
    event_date: "",
    is_active: true,
    attachment_url: null as string | null,
    attachment_type: null as "image" | "pdf" | null,
  });
  // Pending routine attachment file (uploaded on save)
  const [routineFile, setRoutineFile] = useState<File | null>(null);
  const [routineUploading, setRoutineUploading] = useState(false);

  // Generate or get session ID
  const getSessionId = () => {
    if (!sessionIdRef.current) {
      // Try to get existing device ID from localStorage
      let deviceId = localStorage.getItem("device_id");

      // If not found, create new device ID and persist it
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem("device_id", deviceId);
      }

      sessionIdRef.current = deviceId;
    }
    return sessionIdRef.current;
  };

  // Track user presence on student/admin page
  const trackUserPresence = async (page: string) => {
    try {
      const sessionId = getSessionId();
      const now = new Date().toISOString();
      console.log(
        `📝 Inserting presence: session=${sessionId}, page=${page}, time=${now}`,
      );

      const { error, data } = await supabase.from("active_users").upsert(
        {
          session_id: sessionId,
          page_name: page,
          last_seen: now,
          updated_at: now,
          user_agent: navigator.userAgent,
        },
        { onConflict: "session_id" },
      );

      if (error) {
        console.error("❌ Upsert error:", error.message, error.code);
      } else {
        console.log(
          `✅ Presence tracked: ${page} (${sessionId.slice(0, 12)}...)`,
        );
      }
    } catch (err) {
      // Silently fail if table doesn't exist yet
      console.error("❌ Presence tracking exception:", err);
    }
  };

  // Remove user session on unmount
  const removeUserSession = async () => {
    try {
      const sessionId = getSessionId();
      await supabase.from("active_users").delete().eq("session_id", sessionId);
    } catch (err) {
      // Silently fail
    }
  };

  // Get active users count (only unique devices active in last 30 seconds - INSTANT real-time)
  const fetchActiveUsersCount = async () => {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();

      // FIRST: Delete stale sessions (older than 30 seconds) - handles closed browsers INSTANTLY
      const { error: deleteError } = await supabase
        .from("active_users")
        .delete()
        .lt("updated_at", thirtySecondsAgo);

      if (deleteError) {
        console.warn("⚠️ Cleanup failed:", deleteError.message);
      }

      // THEN: Count remaining active users (all remaining records are fresh)
      const { count, error } = await supabase
        .from("active_users")
        .select("session_id", { count: "exact", head: true })
        .eq("page_name", "student");

      if (error) {
        console.error("❌ Count query error:", error);
        setActiveUsersCount(0);
        return;
      }

      console.log(`⚡ Active users: ${count}`);
      setActiveUsersCount(count || 0);
    } catch (err) {
      console.error("❌ Exception fetching user count:", err);
      setActiveUsersCount(0);
    }
  };

  // Initialize push notifications
  const initializePushNotifications = async () => {
    if (!isPushNotificationSupported() || hasInitializedPush.current) {
      return;
    }

    hasInitializedPush.current = true;

    try {
      // Register service worker
      await registerServiceWorker();

      // Check current permission
      const currentPermission = getNotificationPermission();
      setPushPermission(currentPermission);

      // Check if already subscribed
      const isSubscribed = await isPushSubscribed();
      setIsPushEnabled(isSubscribed);

      // Auto-validate and repair subscriptions if already subscribed
      if (isSubscribed && currentPermission === "granted") {
        const sessionId = getSessionId();
        console.log("🔍 Validating current subscription...");
        const isValid = await validateCurrentSubscription(sessionId);
        if (isValid) {
          console.log("✅ Subscription is valid and has encryption keys");
        } else {
          console.log(
            "⚠️ Subscription was repaired (fresh subscription created)",
          );
          setIsPushEnabled(true); // Ensure state reflects fresh subscription
        }
      }

      console.log("Push notifications initialized:", {
        permission: currentPermission,
        subscribed: isSubscribed,
      });
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
    }
  };

  // Enable push notifications
  const enablePushNotifications = async () => {
    try {
      // Request permission
      const permission = await requestNotificationPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        alert(
          "Notification permission denied. Please enable notifications in your browser settings.",
        );
        return false;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications();

      if (!subscription) {
        alert("Failed to subscribe to push notifications");
        return false;
      }

      // Save subscription to database (include user_id for targeted push)
      const sessionId = getSessionId();
      const saved = await savePushSubscription(subscription, sessionId, authSession?.user?.id);

      if (saved) {
        // Validate the new subscription has encryption keys
        const isValid = await validateCurrentSubscription(sessionId);

        if (isValid) {
          setIsPushEnabled(true);
          console.log(
            "Push notifications enabled successfully with valid encryption keys",
          );
          return true;
        } else {
          alert("Failed to validate push subscription. Please try again.");
          return false;
        }
      } else {
        alert("Failed to save notification subscription");
        return false;
      }
    } catch (error) {
      console.error("Error enabling push notifications:", error);
      alert("Failed to enable push notifications: " + String(error));
      return false;
    }
  };

  // Send web push notification when a notice is created (admin only).
  // Emails are NOT sent here — use the Broadcast composer for that.
  const sendNoticeNotification = async (notice: Notice) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-push-notification",
        {
          body: {
            noticeId: notice.id,
            noticeType: notice.id,
            title: notice.title,
            body: notice.content.substring(0, 100),
            url: "/",
          },
        },
      );
      if (!error) {
        console.log("✅ Push notification sent:", data);
      }
    } catch (pushError) {
      console.warn("⚠️ Push notification (non-blocking):", pushError);
    }
  };

  // Suppress Google API console errors (they're logged but won't clutter console)
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Suppress Google API discovery errors (502 Bad Gateway)
      if (
        args[0]?.includes?.("GapiClientError") ||
        args[0]?.includes?.("API discovery") ||
        args[0]?.message?.includes?.("API discovery")
      ) {
        return; // Silently ignore these errors
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  // Load courses, notices, and initialize on component mount (once)
  useEffect(() => {
    if (hasLoadedInitialNotices.current) {
      return; // Prevent StrictMode from causing duplicate calls
    }
    hasLoadedInitialNotices.current = true;
    initializeDatabase();
    loadCourses();
    loadNotices();
    loadEmergencyData();
  }, []); // Run only once on mount

  // Load materials when selectedCourse changes
  useEffect(() => {
    if (selectedCourse) {
      loadMaterials(selectedCourse.code);
    }
  }, [selectedCourse]);

  // Load total materials count + platform stats + user list when accessing admin panel
  useEffect(() => {
    if (currentView === "admin" && isAdmin) {
      loadTotalMaterialsCount();
      loadAdminStats();
      loadAdminUsers();
      loadFeedback();
    }
  }, [currentView, isAdmin]);

  // Update semester status only when it changes (check every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = getCurrentSemesterStatus();
      setSemesterStatus((prev) => 
        JSON.stringify(prev) !== JSON.stringify(newStatus) ? newStatus : prev
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // No longer auto-create welcome notice - Admin must manually create notices
  // useEffect removed to prevent automatic welcome notice spam

  // Auto-refresh notices and emergency data every 2 minutes for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing notices and emergency data...");
      loadNotices();
      loadEmergencyData();
    }, 120000); // 2 minutes (reduced from 30s to minimize unnecessary calls)

    return () => clearInterval(interval);
  }, []);

  // Track user presence and setup realtime subscription for active users
  useEffect(() => {
    let sessionId: string | null = null;

    // Track presence on student OR admin pages
    if (
      currentView === "section5" ||
      currentView === "ai" ||
      currentView === "software" ||
      currentView === "networking" ||
      currentView === "course" ||
      currentView === "home" ||
      (currentView === "admin" && isAdmin)
    ) {
      sessionId = getSessionId();
      const pageType = currentView === "admin" && isAdmin ? "admin" : "student";
      trackUserPresence(pageType);
      console.log(`✅ Tracking user presence as ${pageType}`, sessionId);

      // Update presence every 5 seconds for INSTANT real-time tracking
      const presenceInterval = setInterval(() => {
        trackUserPresence(pageType);
      }, 5000);

      // Cleanup on unmount or view change
      return () => {
        clearInterval(presenceInterval);
        removeUserSession();
        console.log(`❌ Stopped tracking user presence`);
      };
    } else {
      // If not on tracked page, clean up the session immediately
      removeUserSession();
    }
  }, [currentView, isAdmin]);

  // Subscribe to active users changes (for admin panel) - INSTANT real-time updates
  useEffect(() => {
    if (isAdmin && currentView === "admin") {
      // Initial fetch
      fetchActiveUsersCount();

      // Periodic cleanup every 10 seconds to remove stale sessions INSTANTLY
      const cleanupInterval = setInterval(() => {
        fetchActiveUsersCount();
      }, 10000);

      // Setup realtime subscription for INSTANT updates when users join/leave
      const channel = supabase
        .channel("active_users_realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "active_users",
          },
          (_payload: any) => {
            // New user joined - fetch updated count instantly
            console.log("➕ User joined");
            fetchActiveUsersCount();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "active_users",
          },
          (_payload: any) => {
            // User activity updated - recount
            fetchActiveUsersCount();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "active_users",
          },
          (_payload: any) => {
            // User left - fetch updated count instantly
            console.log("➖ User left");
            fetchActiveUsersCount();
          },
        )
        .subscribe();

      return () => {
        clearInterval(cleanupInterval);
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, currentView]);

  // Listen for storage changes to instantly update notices when admin adds/edits them
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadNotices();
        loadEmergencyData();
      }, 500); // Wait 500ms before reloading to batch rapid changes
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "edu51five_notices" ||
        e.key === "emergency_alerts" ||
        e.key === "emergency_links"
      ) {
        console.log("📦 Storage changed, scheduling reload:", e.key);
        debouncedReload();
      }
    };

    // Listen for custom event (same-window updates)
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log(
        "⚡ Custom event received, scheduling reload:",
        customEvent.detail.type,
      );
      debouncedReload();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("edu51five-data-updated", handleCustomEvent);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("edu51five-data-updated", handleCustomEvent);
    };
  }, []);

  // Duplicate semester tracking effect removed for performance optimization.

  // Keyboard shortcuts for material viewer
  useEffect(() => {
    if (!showMaterialViewer) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === "Escape") {
        closeMaterialViewer();
      }
      // Arrow keys for page navigation (for PDFs)
      else if (e.key === "ArrowRight") {
        nextPage();
      } else if (e.key === "ArrowLeft") {
        previousPage();
      }
      // + for zoom in
      else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      }
      // - for zoom out
      else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      }
      // 0 to reset zoom
      else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
      // F for fullscreen
      else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showMaterialViewer]);

  // Initialize push notifications on mount (student pages only)
  useEffect(() => {
    if (currentView !== "admin" && !isAdmin) {
      initializePushNotifications();
    }
  }, [currentView, isAdmin]);

  // On login: load mention notifications, subscribe realtime, auto-prompt push
  useEffect(() => {
    const userId = authSession?.user?.id;
    if (!userId) {
      setMentionNotifications([]);
      setPendingConnectionsCount(0);
      return;
    }

    // Load unread notifications
    getUnreadNotifications(userId).then(setMentionNotifications);

    // Load initial pending connection requests count
    supabase
      .from("connections")
      .select("id", { count: "exact" })
      .eq("addressee_id", userId)
      .eq("status", "pending")
      .then(({ count }) => {
        if (count !== null) setPendingConnectionsCount(count);
      });

    // Realtime: get new mention notifications as they arrive
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setMentionNotifications((prev) => [payload.new as AppNotification, ...prev]);
        },
      )
      .subscribe();

    // Realtime: get new connection requests as they arrive
    const connChannel = supabase
      .channel(`user-connections-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "connections", filter: `addressee_id=eq.${userId}` },
        async (payload: any) => {
          const requesterId = payload.new.requester_id;
          if (requesterId) {
            const { data } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", requesterId)
              .single();
            const senderName = data?.name || "Someone";
            showMajorAccessNotification("info", `🌐 ${senderName} sent you a connection request!`);
            setPendingConnectionsCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    // Auto-prompt for push permission 3 s after login (non-intrusive)
    const promptTimer = setTimeout(async () => {
      if (!isPushNotificationSupported()) return;
      const perm = getNotificationPermission();
      if (perm === "default") {
        const granted = await requestNotificationPermission();
        setPushPermission(granted);
        if (granted === "granted") {
          const sub = await subscribeToPushNotifications();
          if (sub) {
            const sid = getSessionId();
            await savePushSubscription(sub, sid, userId);
            setIsPushEnabled(true);
          }
        }
      }
    }, 3000);

    return () => {
      clearTimeout(promptTimer);
      channel.unsubscribe();
      connChannel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.user?.id]);

  // Handle click outside to close mobile menu and notification panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Close mobile menu if clicking outside of it
      if (showMobileMenu) {
        const mobileMenuButton = document.querySelector('[title="Menu"]');
        const mobileMenuDropdown = document.querySelector(
          ".mobile-menu-dropdown",
        );

        if (mobileMenuButton && mobileMenuDropdown) {
          if (
            !mobileMenuButton.contains(target) &&
            !mobileMenuDropdown.contains(target)
          ) {
            setShowMobileMenu(false);
          }
        }
      }

      // Close notification panel if clicking outside of it
      if (showNoticePanel) {
        const notificationButton = document.querySelector(
          '[title="Notifications"]',
        );
        const notificationPanel = document.querySelector(".notification-panel");

        if (notificationButton && notificationPanel) {
          if (
            !notificationButton.contains(target) &&
            !notificationPanel.contains(target)
          ) {
            setShowNoticePanel(false);
          }
        }
      }
    };

    if (showMobileMenu || showNoticePanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMobileMenu, showNoticePanel]);

  // Lock background scrolling when any overlay/modal/panel is open
  useEffect(() => {
    const overlaysOpen =
      showNoticePanel ||
      showNoticeModal ||
      showCreateNotice ||
      showUploadFile ||
      showCreateCourse ||
      showFileViewer ||
      showMobileMenu ||
      showMaterialViewer;
    if (overlaysOpen) {
      const previousOverflow = document.body.style.overflow;
      const previousPaddingRight = document.body.style.paddingRight || "";
      // Compensate for scrollbar disappearance to avoid layout shift
      const scrollBarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
      };
    }
    return;
  }, [
    showNoticePanel,
    showNoticeModal,
    showCreateNotice,
    showUploadFile,
    showCreateCourse,
    showFileViewer,
    showMobileMenu,
    showMaterialViewer,
  ]);

  // Initialize database tables if they don't exist
  const initializeDatabase = async () => {
    try {
      // Test if tables exist by trying to select from them
      await supabase.from("courses").select("*").limit(1);
      await supabase.from("materials").select("*").limit(1);

      // Test notices table specifically and create if needed
      const { error } = await supabase.from("notices").select("*").limit(1);
      if (error) {
        console.error("Notices table not accessible:", error);
        console.log("=".repeat(60));
        console.log(
          "NOTICES TABLE MISSING! Please run this SQL in your Supabase dashboard:",
        );
        console.log("=".repeat(60));
        console.log(`
CREATE TABLE notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) NOT NULL,
  category TEXT CHECK (category IN ('random', 'exam', 'event', 'information', 'academic', 'announcement')) DEFAULT 'announcement',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  exam_type TEXT CHECK (exam_type IN ('midterm', 'final')) DEFAULT NULL,
  event_date DATE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
CREATE POLICY "Allow all operations on notices" ON notices
FOR ALL USING (true) WITH CHECK (true);
        `);
        console.log("=".repeat(60));

        // Try to create the table programmatically (this might not work without proper permissions)
        try {
          await supabase.rpc("create_notices_table");
        } catch (rpcError) {
          console.log(
            "Could not create table automatically. Please run the SQL manually.",
          );
        }
      } else {
        console.log("Database tables accessible, notices table working");
      }
    } catch (error) {
      console.log("Database connection issue:", error);
    }
  };

  const loadCourses = async () => {
    if (!authSession || !isLoggedIn) {
      setCourses([]);
      return;
    }
    try {
      setLoading(true);
      setCourses([]);
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Load materials for a specific course
  const loadMaterials = async (courseCode: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("course_code", courseCode)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error loading materials:", error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Load total materials count for admin dashboard
  const loadTotalMaterialsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("materials")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setTotalMaterialsCount(count || 0);
    } catch (error) {
      console.error("Error loading total materials count:", error);
      setTotalMaterialsCount(0);
    }
  };

  // Load real-time platform stats (storage usage, user/team counts) for the dashboard
  const loadAdminStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      setAdminStats(data as any);
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  };

  // Load the user list for the Admin Users management section (admin-only RPC)
  const loadAdminUsers = async () => {
    try {
      setAdminUsersLoading(true);
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      setAdminUsers((data as any) || []);
    } catch (error) {
      console.error("Error loading admin users:", error);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  // Promote/demote a user (admin-only RPC, atomic + guarded server-side)
  const handleToggleUserAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      const { error } = await supabase.rpc("set_user_admin", {
        target: userId,
        make_admin: makeAdmin,
      });
      if (error) throw error;
      // Optimistic update + refresh
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: makeAdmin } : u)),
      );
      showMajorAccessNotification(
        "success",
        makeAdmin ? "User promoted to admin." : "Admin access removed.",
      );
    } catch (error) {
      console.error("Error updating admin status:", error);
      showMajorAccessNotification("error", "Could not update admin status.");
    }
  };

  // Load feedback inbox (admin-only via RLS)
  const loadFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const items = await listFeedback();
      setFeedbackItems(items);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Update a feedback item's status (admin-only)
  const handleUpdateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    // Optimistic
    setFeedbackItems((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    const { error } = await updateFeedbackStatus(id, status);
    if (error) {
      showMajorAccessNotification("error", "Could not update feedback status.");
      loadFeedback();
    }
  };

  // Create welcome notice if it doesn't exist
  // Initialize default notices (Welcome + Exam Routine slots)
  const initializeDefaultNotices = async (): Promise<Notice[]> => {
    try {
      console.log("🏗️ [initializeDefaultNotices] Starting...");

      // Check database for existing welcome and routine notices
      const { data } = await supabase
        .from("notices")
        .select("*")
        .in("id", ["welcome-notice", "exam-routine-notice"]);

      console.log(
        "🏗️ [initializeDefaultNotices] DB query for existing notices returned:",
        data?.length || 0,
        "records",
      );

      let welcomeNotice = null;
      let routineNotice = null;

      if (data) {
        welcomeNotice = (data as Notice[]).find(
          (n: Notice) => n.id === "welcome-notice",
        );
        routineNotice = (data as Notice[]).find(
          (n: Notice) => n.id === "exam-routine-notice",
        );
      }

      const defaultNotices: Notice[] = [];

      // Create default welcome notice if it doesn't exist
      if (!welcomeNotice) {
        console.log("🏗️ [initializeDefaultNotices] Creating welcome notice...");
        welcomeNotice = {
          id: "welcome-notice",
          title: "Welcome to Edu51Portal - BUBT Intake 51 Section 2 (AI)",
          content: `Dear BUBT Intake 51 Students,

Welcome to Edu51Portal, your comprehensive learning platform designed specifically for your academic excellence and exam preparation success!

**Your Exam Success Platform:**
Complete Study Materials • Past Exam Questions • Real-time Updates

This platform is your centralized hub for all Section 2 (AI) resources. Use it regularly to stay ahead in your studies and achieve academic excellence!

Best of luck with your studies!
- Edu51Portal Team`,
          type: "info",
          category: "announcement",
          priority: "normal",
          exam_type: null,
          event_date: null,
          is_active: true,
          created_at: new Date().toISOString(),
        } as Notice;

        // Try to save to database
        try {
          await supabase.from("notices").insert([welcomeNotice]);
          console.log(
            "🏗️ [initializeDefaultNotices] Welcome notice saved to database",
          );
        } catch (dbError) {
          console.log(
            "🏗️ [initializeDefaultNotices] Welcome notice: database save failed, will save to localStorage only",
          );
        }
      } else {
        console.log(
          "🏗️ [initializeDefaultNotices] Welcome notice already exists in database",
        );
      }

      // NOTE: Exam routine notices are no longer auto-seeded with hardcoded data.
      // Admins create them on demand via "Create Smart Notice" and attach the
      // routine as an image or PDF. A real one from the DB (if present) still shows.

      // Show the welcome notice, plus any existing routine notice from the DB
      defaultNotices.push(welcomeNotice);
      if (routineNotice) defaultNotices.push(routineNotice);

      // Filter only active notices and allow up to 5
      const activeNotices = defaultNotices
        .filter((n) => n && n.is_active)
        .slice(0, 5);

      // CRITICAL: Save to localStorage so they persist even if database is unavailable
      localStorage.setItem("edu51five_notices", JSON.stringify(activeNotices));
      console.log(
        "✅ [initializeDefaultNotices] Saved",
        activeNotices.length,
        "default notices to localStorage",
      );

      // NOTE: Don't call setNotices here - let the caller handle state update
      // setNotices(activeNotices);

      console.log(
        "✅ [initializeDefaultNotices] Returning",
        activeNotices.length,
        "notices",
      );

      return activeNotices;
    } catch (error) {
      console.error("❌ [initializeDefaultNotices] Error:", error);
      // Fallback: Create bare minimum default notices
      const bareMinimumNotices: Notice[] = [
        {
          id: "welcome-notice",
          title: "Welcome to Edu51Portal",
          content: "Welcome to Edu51Portal, your academic platform!",
          type: "info",
          category: "announcement",
          priority: "normal",
          exam_type: null,
          event_date: "",
          is_active: true,
          created_at: new Date().toISOString(),
        } as Notice,
        {
          id: "exam-routine-notice",
          title: "Exam Information",
          content: "Check your exam schedule on the platform.",
          type: "warning",
          category: "exam",
          priority: "high",
          exam_type: "final",
          event_date: "",
          is_active: true,
          created_at: new Date().toISOString(),
        } as Notice,
      ];

      // Save even minimal notices to localStorage
      localStorage.setItem(
        "edu51five_notices",
        JSON.stringify(bareMinimumNotices),
      );
      // NOTE: Don't call setNotices here - let the caller handle state update
      // setNotices(bareMinimumNotices);
      console.log(
        "⚠️ [initializeDefaultNotices] Created bare minimum notices as fallback, saved to localStorage",
      );
      return bareMinimumNotices;
    }
  };

  // Load notices — cache-first so the UI is instant, then silently refresh from DB.
  const loadNotices = async () => {
    if (isLoadingNotices) return;
    setIsLoadingNotices(true);

    try {
      // Restore read-notice ids
      try {
        const readStr = localStorage.getItem("edu51five_read_notices");
        if (readStr) {
          const readArr = JSON.parse(readStr);
          if (Array.isArray(readArr)) setUnreadNotices(readArr);
        }
      } catch (_) {}

      // STEP 1 — Show cached notices immediately (zero wait)
      let cachedNotices: Notice[] = [];
      const localNoticesStr = localStorage.getItem("edu51five_notices");
      if (localNoticesStr) {
        try {
          const parsed = JSON.parse(localNoticesStr);
          cachedNotices = Array.isArray(parsed)
            ? parsed.filter((n: any) => n && n.is_active).slice(0, 5)
            : [];
        } catch (_) {}
      }

      if (cachedNotices.length > 0) {
        setNotices(cachedNotices);
        setIsLoadingNotices(false);
      }

      // STEP 2 — Refresh from DB in background (non-blocking)
      // Even if Supabase is cold and takes 15-20s, the user already sees notices.
      supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data: dbNotices, error }: { data: any; error: any }) => {
          if (!error && dbNotices && dbNotices.length > 0) {
            localStorage.setItem("edu51five_notices", JSON.stringify(dbNotices));
            setNotices(dbNotices as Notice[]);
            setIsLoadingNotices(false);
          }
        })
        .catch(() => {/* silent — cached version already shown */});

      // STEP 3 — If no cache existed, initialize defaults and wait for DB
      if (cachedNotices.length === 0) {
        try {
          const defaults = await initializeDefaultNotices();
          if (defaults && defaults.length > 0) {
            setNotices(defaults);
          }
        } catch (_) {}
        setIsLoadingNotices(false);
      }
    } catch (err) {
      console.error("Error loading notices:", err);
      setNotices([]);
      setIsLoadingNotices(false);
    }
  };

  // Load emergency alerts and links from localStorage
  const loadEmergencyData = () => {
    try {
      const savedAlerts = localStorage.getItem("emergency_alerts");
      const savedLinks = localStorage.getItem("emergency_links");

      if (savedAlerts) {
        const alerts = JSON.parse(savedAlerts);
        setEmergencyAlerts(alerts.filter((a: any) => a.status === "ACTIVE"));
      }

      if (savedLinks) {
        const links = JSON.parse(savedLinks);
        setEmergencyLinks(links.filter((l: any) => l.status === "ACTIVE"));
      }
    } catch (err) {
      console.error("Error loading emergency data:", err);
    }
  };

  // Handle course click - load materials and navigate (memoized)
  const handleCourseClick = useCallback(
    (course: Course) => {
      setSelectedCourse(course);
      loadMaterials(course.code);
      goToView("course", course.code);
    },
    [goToView],
  );

  // Handle notice click to show full content
  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
    setShowNoticeModal(true);
  };

  // Close notice modal
  const closeNoticeModal = () => {
    setSelectedNotice(null);
    setShowNoticeModal(false);
  };

  // File viewer functions
  const openFileViewer = (fileUrl: string, fileName: string) => {
    // Convert Google Drive URL to embeddable format
    let embedUrl = fileUrl;

    // Handle different Google Drive URL formats
    if (fileUrl.includes("drive.google.com")) {
      // Extract file ID from various Google Drive URL formats
      const fileIdMatch = fileUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      } else {
        // Fallback for folder URLs - open in new tab
        window.open(fileUrl, "_blank");
        return;
      }
    }

    setCurrentFileUrl(embedUrl);
    setCurrentFileName(fileName);
    setShowFileViewer(true);
  };

  const closeFileViewer = () => {
    setShowFileViewer(false);
    setCurrentFileUrl("");
    setCurrentFileName("");
  };

  // Material viewer function - open material in modal instead of new tab
  const openMaterialViewer = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialViewer(true);
    setIsViewerLoading(true);
    setZoomLevel(100);
    setCurrentPage(1);
    setIsFullscreen(false);
  };

  const closeMaterialViewer = () => {
    setShowMaterialViewer(false);
    setSelectedMaterial(null);
    setIsFullscreen(false);
    setZoomLevel(100);
    setCurrentPage(1);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Zoom controls
  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  // Page navigation
  const nextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  // Normalize viewer URL and apply page hash for PDF-like types
  const buildViewerUrl = (material: Material, page: number) => {
    if (!material.file_url) return "";

    const ensureDrivePreview = (url: string) => {
      if (!url.includes("drive.google.com")) return url;
      if (url.includes("/preview")) return url;
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      return match
        ? `https://drive.google.com/file/d/${match[1]}/preview`
        : url;
    };

    const normalized = ensureDrivePreview(material.file_url);
    const [base] = normalized.split("#");

    // Only append page anchor for PDF-like embeds
    if (["pdf", "notes", "slides", "document"].includes(material.type)) {
      return `${base}#page=${page}`;
    }

    return base;
  };

  // Handle file click from Google Drive - Convert DriveItem to Material and open viewer
  const handleDriveFileClick = (file: any) => {
    // Convert DriveItem to Material format
    const material: Material = {
      id: file.id,
      title: file.name,
      description: `Size: ${file.size ? formatBytes(file.size) : "Unknown"}`,
      file_url: file.webViewLink || file.webContentLink || "",
      video_url: null,
      type: getMimeTypeCategory(file.mimeType),
      course_code: selectedCourse?.code || "",
      size: file.size ? formatBytes(file.size) : null,
      exam_period: selectedExamPeriod,
      created_at: new Date().toISOString(),
    };

    openMaterialViewer(material);
  };

  // Helper: Convert bytes to readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Helper: Convert MIME type to category
  const getMimeTypeCategory = (mimeType: string): string => {
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("video")) return "video";
    if (mimeType.includes("image")) return "image";
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
      return "slides";
    if (mimeType.includes("document") || mimeType.includes("text"))
      return "notes";
    return "document";
  };

  // Toggle notice panel
  const toggleNoticePanel = () => {
    setShowNoticePanel(!showNoticePanel);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  // Get unread notice count (using memoized value)
  const getUnreadNoticeCount = useCallback(() => unreadCount, [unreadCount]);

  // Mark notice as read
  const markNoticeAsRead = (noticeId: string) => {
    setUnreadNotices((prev) => {
      if (prev.includes(noticeId)) return prev;
      const next = [...prev, noticeId];
      try {
        localStorage.setItem("edu51five_read_notices", JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist read notices", e);
      }
      return next;
    });
  };

  // Handle Facebook link - open in app on mobile, new tab on PC
  const handleFacebookClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Open Facebook profile directly in new tab (no delays, no app protocol attempts)
    const facebookUrl = "https://www.facebook.com/mr.swapnil360";
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
  };

  // App color classes used for small avatar/icon backgrounds
  const APP_COLOR_CLASSES = "from-blue-600 to-indigo-600";

  // Handle email contact - Open Gmail compose directly
  const handleEmailClick = () => {
    const email = "miftahurr503@gmail.com";
    const subject = encodeURIComponent("Edu51Portal Platform Contact");
    const body = encodeURIComponent(
      "Hi Swapnil,\n\nI found your Edu51Portal platform and want to connect!\n\nBest regards",
    );

    // Open Gmail compose in new tab
    const gmailUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${email}&subject=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
  };

  // WhatsApp contact (replace the number with the actual support number)
  const SUPPORT_WHATSAPP_NUMBER = "8801318090383"; // updated to 01318090383 -> 8801318090383
  const handleWhatsAppClick = () => {
    const text = encodeURIComponent(
      "Hi Swapnil, I want to talk about Edu51Portal.",
    );
    const waUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${text}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Navigation functions
  const handleBackToHome = () => {
    setSelectedCourse(null);
    setMaterials([]);
    goToView("home");
  };

  const handleBackToSection = () => {
    setSelectedCourse(null);
    setMaterials([]);
    // Navigate back to the user's major section
    const majorViewMap: { [key: string]: "ai" | "software" | "networking" } = {
      AI: "ai",
      "Software Engineering": "software",
      Networking: "networking",
    };
    goToView(majorViewMap[userProfile.major] || "ai");
  };

  // Admin: Create new course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.from("courses").insert([
        {
          name: newCourse.name,
          code: newCourse.code,
          description: newCourse.description,
          major: "Common", // Default to Common so all majors can access
          semester: "SUMMER_2026",
          is_active: true,
        },
      ]);

      if (error) throw error;

      // Reset form and reload courses
      setNewCourse({ name: "", code: "", description: "", section_id: "1" });
      setShowCreateCourse(false);
      await loadCourses();
      alert("Course created successfully!");
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Error creating course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Upload file
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.file && !newMaterial.video_url) {
      alert("Please select a file or provide a video URL");
      return;
    }

    try {
      setLoading(true);
      let file_url = newMaterial.video_url;

      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (
        !supabaseUrl ||
        !supabaseKey ||
        supabaseUrl.includes("your-supabase") ||
        supabaseKey.includes("your-supabase")
      ) {
        alert(
          "Supabase is not configured. Please set up your Supabase credentials in the .env file and create the required tables.",
        );
        return;
      }

      if (newMaterial.file) {
        // Upload file to Supabase Storage
        const fileExt = newMaterial.file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `materials/${fileName}`;

        // Try to upload directly (bucket should exist)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("materials")
          .upload(filePath, newMaterial.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          if (uploadError.message.includes("Bucket not found")) {
            throw new Error(
              'Storage bucket "materials" not found. Please make sure the bucket exists and is public in your Supabase Storage.',
            );
          } else {
            throw new Error(`File upload failed: ${uploadError.message}`);
          }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("materials")
          .getPublicUrl(uploadData.path);

        file_url = urlData.publicUrl;
      }

      // Insert material record
      console.log("Attempting to insert material:", {
        title: newMaterial.title,
        description: newMaterial.description,
        file_url: file_url,
        video_url: newMaterial.video_url,
        type: newMaterial.type,
        course_code: newMaterial.course_id, // Using course_id from form as course_code for DB
        exam_period: newMaterial.exam_period,
        size: newMaterial.file
          ? `${(newMaterial.file.size / 1024 / 1024).toFixed(2)} MB`
          : undefined,
      });

      const { data: insertData, error: insertError } = await supabase
        .from("materials")
        .insert([
          {
            title: newMaterial.title,
            description: newMaterial.description,
            file_url: file_url,
            video_url: newMaterial.video_url,
            type: newMaterial.type,
            course_code: newMaterial.course_id, // Using course_id from form as course_code for DB
            exam_period: newMaterial.exam_period,
            size: newMaterial.file
              ? `${(newMaterial.file.size / 1024 / 1024).toFixed(2)} MB`
              : undefined,
          },
        ]);

      console.log("Insert result:", { data: insertData, error: insertError });

      if (insertError) {
        console.error("Database error details:", insertError);
        throw new Error(
          `Database error: ${insertError.message}. Code: ${insertError.code}. Details: ${insertError.details}`,
        );
      }

      // Reset form and reload materials
      setNewMaterial({
        title: "",
        course_id: "",
        type: "pdf" as Material["type"],
        file: null,
        video_url: "",
        description: "",
        exam_period: "midterm",
      });
      setShowUploadFile(false);
      if (selectedCourse) {
        loadMaterials(selectedCourse.code);
      }
      loadTotalMaterialsCount(); // Update total count

      // Send push notification to all subscribed users about new material
      try {
        const newMaterialNotice: Notice = {
          id: `material-${Date.now()}`,
          title: `New Material: ${newMaterial.title}`,
          content: `A new ${newMaterial.type} has been uploaded for ${selectedCourse?.name || newMaterial.course_id}${newMaterial.description ? ": " + newMaterial.description.substring(0, 100) : ""}`,
          type: "success",
          category: "academic",
          priority: "normal",
          is_active: true,
          created_at: new Date().toISOString(),
        };
        await sendNoticeNotification(newMaterialNotice);
        console.log("✅ Push notification sent for new material");
      } catch (notificationError) {
        console.warn(
          "⚠️ Could not send push notification, but file uploaded successfully:",
          notificationError,
        );
      }

      alert("Material uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error uploading file: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case "video":
        return <Play className="h-5 w-5" />;
      case "pdf":
      case "doc":
        return <FileText className="h-5 w-5" />;
      case "suggestion":
        return <Tag className="h-5 w-5" />;
      case "past_question":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "video":
        return "text-red-600 bg-red-100";
      case "pdf":
        return "text-blue-600 bg-blue-100";
      case "doc":
        return "text-green-600 bg-green-100";
      case "suggestion":
        return "text-orange-600 bg-orange-100";
      case "past_question":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }, []);

  // Course color schemes for unique visual identity (memoized)
  const getCourseColorScheme = useCallback(
    (courseCode: string, index: number) => {
      const colorSchemes = [
        {
          gradient: "from-blue-500 to-purple-600",
          bgGradient: "from-blue-50 via-purple-50 to-indigo-100",
          accent: "blue-500",
          textGradient: "from-blue-600 to-purple-600",
          badge: "bg-blue-100 text-blue-700",
          border: "border-blue-300",
        },
        {
          gradient: "from-emerald-500 to-teal-600",
          bgGradient: "from-emerald-50 via-teal-50 to-cyan-100",
          accent: "emerald-500",
          textGradient: "from-emerald-600 to-teal-600",
          badge: "bg-emerald-100 text-emerald-700",
          border: "border-emerald-300",
        },
        {
          gradient: "from-orange-500 to-red-600",
          bgGradient: "from-orange-50 via-red-50 to-pink-100",
          accent: "orange-500",
          textGradient: "from-orange-600 to-red-600",
          badge: "bg-orange-100 text-orange-700",
          border: "border-orange-300",
        },
        {
          gradient: "from-violet-500 to-fuchsia-600",
          bgGradient: "from-violet-50 via-fuchsia-50 to-pink-100",
          accent: "violet-500",
          textGradient: "from-violet-600 to-fuchsia-600",
          badge: "bg-violet-100 text-violet-700",
          border: "border-violet-300",
        },
        {
          gradient: "from-cyan-500 to-blue-600",
          bgGradient: "from-cyan-50 via-blue-50 to-indigo-100",
          accent: "cyan-500",
          textGradient: "from-cyan-600 to-blue-600",
          badge: "bg-cyan-100 text-cyan-700",
          border: "border-cyan-300",
        },
        {
          gradient: "from-rose-500 to-pink-600",
          bgGradient: "from-rose-50 via-pink-50 to-fuchsia-100",
          accent: "rose-500",
          textGradient: "from-rose-600 to-pink-600",
          badge: "bg-rose-100 text-rose-700",
          border: "border-rose-300",
        },
      ];

      return colorSchemes[index % colorSchemes.length];
    },
    [],
  );

  // Material color schemes for diversity (memoized)
  const getMaterialColorScheme = useCallback((index: number) => {
    const materialSchemes = [
      {
        bg: "from-white via-blue-50 to-indigo-100",
        accent: "from-blue-500 to-indigo-600",
      },
      {
        bg: "from-white via-green-50 to-emerald-100",
        accent: "from-green-500 to-emerald-600",
      },
      {
        bg: "from-white via-purple-50 to-violet-100",
        accent: "from-purple-500 to-violet-600",
      },
      {
        bg: "from-white via-orange-50 to-amber-100",
        accent: "from-orange-500 to-amber-600",
      },
      {
        bg: "from-white via-pink-50 to-rose-100",
        accent: "from-pink-500 to-rose-600",
      },
      {
        bg: "from-white via-teal-50 to-cyan-100",
        accent: "from-teal-500 to-cyan-600",
      },
    ];

    return materialSchemes[index % materialSchemes.length];
  }, []);

  // Exit the admin view back to home. The admin role itself is DB-driven and
  // persists — this just leaves the dashboard, it does not revoke admin.
  const handleExitAdmin = () => {
    goToView("home");
  };

  // Admin: Delete material
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material?")) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", materialId);

      if (error) throw error;

      // Remove from local state
      setMaterials(materials.filter((m) => m.id !== materialId));
      loadTotalMaterialsCount(); // Update total count

      alert("Material deleted successfully!");
    } catch (error) {
      console.error("Error deleting material:", error);
      // Fallback: remove from local state anyway
      setMaterials(materials.filter((m) => m.id !== materialId));
      alert("Material deleted from view. Database may need manual cleanup.");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Send broadcast push notification AND email to all subscribers
  const handleSendBroadcastNotification = async () => {
    if (!broadcastPush.title || !broadcastPush.body) {
      alert("Please fill in notification title and message");
      return;
    }

    try {
      setIsSendingBroadcast(true);

      // Format with brand for a more professional notification experience
      const rawTitle = broadcastPush.title.trim();
      const rawBody = broadcastPush.body.trim();
      const formattedTitle = rawTitle
        ? `Edu51Portal • ${rawTitle}`
        : "Edu51Portal Update";
      const formattedBody = rawBody
        ? `${rawBody} — Stay ahead with Edu51Portal.`
        : "New update from Edu51Portal.";

      // 1. Send Push Notifications (backup method)
      let pushSent = 0;
      try {
        const { data, error } = await supabase.functions.invoke(
          "send-push-notification",
          {
            body: {
              title: formattedTitle,
              body: formattedBody,
              url: broadcastPush.url || "/",
              broadcast: true,
            },
          },
        );

        if (!error && data?.sent) {
          pushSent = data.sent;
          console.log("✅ Push notifications sent:", pushSent);
        }
      } catch (pushError) {
        console.warn(
          "⚠️ Push notification sending attempted (non-blocking):",
          pushError,
        );
      }

      // 2. Send Email Notifications (primary method - more reliable)
      console.log("📧 Sending email notifications to all registered users...");
      const { sent: emailSent, failed: emailFailed } =
        await sendEmailToAllStudents(
          formattedTitle,
          rawTitle,
          rawBody,
          broadcastPush.url || "/",
        );

      console.log(`✅ Emails: ${emailSent} sent, ${emailFailed} failed`);

      // Show success message
      const totalSent = pushSent + emailSent;
      if (totalSent > 0) {
        alert(
          `✅ Broadcast sent successfully!\n\n📧 Emails: ${emailSent} delivered\n🔔 Push: ${pushSent} sent\n\nTotal: ${totalSent} notifications`,
        );
      } else {
        alert(
          '⚠️ No users found with notifications enabled.\n\nAsk students to register via the "Register" button on the homepage.',
        );
      }

      // Reset form
      setBroadcastPush({ title: "", body: "", url: "/" });
    } catch (err) {
      console.error("Broadcast error:", err);
      alert(
        "Error sending notification: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Admin: Update global notices (Welcome or Exam Routine only)
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Create new notice with unique ID (allow multiple notices, not just 2 slots)
      const noticeId = `notice-${Date.now()}`;

      // Upload routine attachment if a new file was chosen
      let attachmentUrl = newNotice.attachment_url;
      let attachmentType = newNotice.attachment_type;
      if (routineFile) {
        try {
          setRoutineUploading(true);
          const res = await uploadRoutineAttachment(noticeId, routineFile);
          attachmentUrl = res.url;
          attachmentType = res.type;
        } catch (upErr) {
          console.error("Routine upload failed:", upErr);
          alert("Routine attachment upload failed. Please try a smaller image or PDF.");
          setRoutineUploading(false);
          setLoading(false);
          return;
        } finally {
          setRoutineUploading(false);
        }
      }

      const notice: Notice = {
        id: noticeId,
        title: newNotice.title,
        content: newNotice.content,
        type: newNotice.type,
        category: newNotice.category,
        priority: newNotice.priority,
        exam_type: newNotice.exam_type || null,
        // Empty string is NOT a valid date — coerce to null so the DB insert succeeds
        event_date: newNotice.event_date || null,
        created_at: new Date().toISOString(),
        is_active: newNotice.is_active,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
      };

      console.log("Creating new notice:", noticeId);

      // Add new notice to the list (keep existing ones, add new one at the beginning)
      const updatedNotices = [
        notice,
        ...notices.filter((n) => n.id !== noticeId),
      ].slice(0, 5);

      setNotices(updatedNotices);
      localStorage.setItem("edu51five_notices", JSON.stringify(updatedNotices));
      console.log("New notice added to localStorage");

      // Save to database — this is what makes the notice visible to ALL users.
      // If it fails, tell the admin (don't pretend success: a local-only notice
      // would never reach anyone else).
      const { error: insertError } = await supabase.from("notices").insert([notice]);
      if (insertError) {
        console.error("Database save failed:", insertError);
        // Roll back the optimistic local copy so it doesn't look published
        const reverted = notices.filter((n) => n.id !== noticeId);
        setNotices(reverted);
        localStorage.setItem("edu51five_notices", JSON.stringify(reverted));
        alert(
          "❌ Notice could NOT be published to all users.\n\n" +
            (insertError.message || "Database error") +
            "\n\nMake sure you are signed in as an admin and try again.",
        );
        return;
      }
      console.log("Notice saved to database successfully");

      // Dispatch event for instant UI update
      window.dispatchEvent(
        new CustomEvent("edu51five-data-updated", {
          detail: { type: "notices" },
        }),
      );

      // Reload notices from database to sync
      await loadNotices();

      // Send push notification to all subscribers
      await sendNoticeNotification(notice);

      // Reset form
      setNewNotice({
        title: "",
        content: "",
        type: "info",
        category: "announcement",
        priority: "normal",
        exam_type: null,
        event_date: "",
        is_active: true,
        attachment_url: null,
        attachment_type: null,
      });
      setRoutineFile(null);
      setShowCreateNotice(false);

      alert("Notice published to all users! Push notifications sent.");
    } catch (error) {
      console.error("Error creating notice:", error);
      alert("Error creating notice. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    // Listen for notice updates from admin panel
    const handleNoticeUpdate = async (event: any) => {
      if (event.detail?.type === "notices") {
        console.log("📢 Notice update event received, reloading...");
        // Small delay to ensure database changes are written
        setTimeout(() => {
          loadNotices();
        }, 500);
      }
    };

    window.addEventListener("edu51five-data-updated", handleNoticeUpdate);
    return () =>
      window.removeEventListener("edu51five-data-updated", handleNoticeUpdate);
  }, []);
  const handleDeleteNotice = async (noticeId: string) => {
    // Confirm deletion of any notice
    if (
      !confirm(
        "Are you sure you want to delete this notice? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Update local state first
      const updatedNotices = notices.filter((n) => n.id !== noticeId);
      setNotices(updatedNotices);

      // Update localStorage
      localStorage.setItem("edu51five_notices", JSON.stringify(updatedNotices));
      console.log("Notice deleted from localStorage");

      // Delete from database (primary operation)
      let deletedFromDB = false;
      try {
        const { error } = await supabase
          .from("notices")
          .delete()
          .eq("id", noticeId);
        if (error) {
          console.error("Database delete error:", error);
          alert(
            "Notice deleted locally, but database update may have failed. Refresh page to verify.",
          );
        } else {
          deletedFromDB = true;
          console.log("✅ Notice deleted from database successfully");
        }
      } catch (error) {
        console.warn(
          "Notice deleted locally, database cleanup may be needed:",
          error,
        );
        alert(
          "Notice deleted locally, but database update may have failed. Refresh page to verify.",
        );
      }

      // Dispatch event for instant UI update across tabs
      window.dispatchEvent(
        new CustomEvent("edu51five-data-updated", {
          detail: { type: "notices" },
        }),
      );

      if (deletedFromDB) {
        alert("Notice deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert("Error deleting notice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Update existing notice
  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoticeId) return;

    try {
      setLoading(true);

      // Find the notice being edited
      const noticeIndex = notices.findIndex((n) => n.id === editingNoticeId);
      if (noticeIndex === -1) {
        alert("Notice not found");
        return;
      }

      // Upload a newly chosen routine attachment (replaces any existing one)
      let attachmentUrl = newNotice.attachment_url;
      let attachmentType = newNotice.attachment_type;
      if (routineFile) {
        try {
          setRoutineUploading(true);
          const res = await uploadRoutineAttachment(editingNoticeId, routineFile);
          attachmentUrl = res.url;
          attachmentType = res.type;
        } catch (upErr) {
          console.error("Routine upload failed:", upErr);
          alert("Routine attachment upload failed. Please try a smaller image or PDF.");
          setRoutineUploading(false);
          setLoading(false);
          return;
        } finally {
          setRoutineUploading(false);
        }
      }

      // Create updated notice with same ID
      const updatedNotice: Notice = {
        id: editingNoticeId,
        title: newNotice.title,
        content: newNotice.content,
        type: newNotice.type,
        category: newNotice.category,
        priority: newNotice.priority,
        exam_type: newNotice.exam_type || null,
        // Empty string is NOT a valid date — coerce to null so the DB update succeeds
        event_date: newNotice.event_date || null,
        created_at: notices[noticeIndex].created_at, // Keep original creation date
        is_active: newNotice.is_active,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
      };

      console.log("Updating notice:", editingNoticeId);

      // Update in database first — this is what makes the change visible to all users
      const { error: updateError } = await supabase
        .from("notices")
        .update(updatedNotice)
        .eq("id", editingNoticeId);
      if (updateError) {
        console.error("Database update failed:", updateError);
        alert(
          "Notice update did NOT reach all users.\n\n" +
            (updateError.message || "Database error") +
            "\n\nMake sure you are signed in as an admin and try again.",
        );
        return;
      }
      console.log("✅ Notice updated in database successfully");

      // Update local state + cache
      const updatedNotices = [...notices];
      updatedNotices[noticeIndex] = updatedNotice;
      setNotices(updatedNotices);
      localStorage.setItem("edu51five_notices", JSON.stringify(updatedNotices));

      // Dispatch event for instant UI update across entire app
      window.dispatchEvent(
        new CustomEvent("edu51five-data-updated", {
          detail: { type: "notices" },
        }),
      );

      // Reload notices to sync with database
      await loadNotices();

      // Reset form and close modal
      setNewNotice({
        title: "",
        content: "",
        type: "info",
        category: "announcement",
        border: "border-slate-200",
        priority: "normal",
        exam_type: null,
        event_date: "",
        is_active: true,
        attachment_url: null,
        attachment_type: null,
      });
      setRoutineFile(null);
      setIsEditingNotice(false);
      setEditingNoticeId(null);
      setShowCreateNotice(false);

      alert("Notice updated successfully! Page refreshing...");
    } catch (error) {
      console.error("Error updating notice:", error);
      alert("Error updating notice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Reset exam routine to default content
  const handleDeleteExamRoutine = async (noticeId: string) => {
    // Only allow deletion of exam routine notice
    if (noticeId !== "exam-routine-notice") {
      alert("This action is only available for exam routine notices.");
      return;
    }

    if (
      !confirm(
        "This will reset the exam routine to default content and remove any uploaded image. Continue?",
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Find the current routine notice for storage cleanup
      const routineNotice = notices.find((n) => n.id === "exam-routine-notice");

      // Clean up Supabase Storage if the notice used URL-based storage
      if (routineNotice?.content.includes("[EXAM_ROUTINE_URL]")) {
        try {
          const urlMatch = routineNotice.content.match(
            /\[EXAM_ROUTINE_URL\](.*?)\[\/EXAM_ROUTINE_URL\]/,
          );
          if (urlMatch) {
            const imageUrl = urlMatch[1];
            // Extract filename from URL
            const filename = imageUrl.split("/").pop();
            if (filename) {
              console.log("Attempting to delete image from storage:", filename);
              await supabase.storage.from("exam-routines").remove([filename]);
              console.log("Image deleted from Supabase Storage");
            }
          }
        } catch (storageError) {
          console.warn("Could not delete image from storage:", storageError);
        }
      }

      // Reset to default exam routine notice
      const defaultRoutineNotice: Notice = {
        id: "exam-routine-notice",
        title: "📅 Midterm Exam Routine - Section 2 (AI)",
        content: `Midterm examination schedule for Section 2 (AI).

📋 **Exam Information:**
• Start Date: Sunday, September 14, 2025
• All students must check the detailed routine below
• Arrive 15 minutes early for each exam
• Bring student ID and necessary materials

⚠️ **Admin Notice:** Use the admin panel to upload the detailed exam routine image. This notice will be automatically updated when the routine is uploaded.

For any queries, contact your course instructors or the department.`,
        type: "warning",
        category: "exam",
        priority: "high",
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Update the global notice slot
      const updatedNotices = [...notices];
      const routineIndex = updatedNotices.findIndex(
        (n) => n.id === "exam-routine-notice",
      );

      if (routineIndex >= 0) {
        updatedNotices[routineIndex] = defaultRoutineNotice;
      }

      setNotices(updatedNotices);
      localStorage.setItem("edu51five_notices", JSON.stringify(updatedNotices));
      console.log("Exam routine reset to default content");

      // Update in database
      try {
        const { error } = await supabase
          .from("notices")
          .upsert([defaultRoutineNotice], { onConflict: "id" });

        if (error) {
          console.error("Database update error:", error);
          alert("Exam routine reset locally but database update failed.");
        } else {
          console.log("Exam routine reset in database");
          alert(
            "✅ Exam routine has been reset to default content.\n\nYou can now upload a new routine image.",
          );
        }
      } catch (error) {
        console.warn("Database update failed:", error);
        alert("Exam routine reset locally but database update may be needed.");
      }
    } catch (error) {
      console.error("Error resetting exam routine:", error);
      alert("Error resetting exam routine. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePendingAlumniSignOut = () => {
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
      isAlumni: false,
      isVerified: false,
    });
    [
      "userProfileBubtEmail",
      "userProfileName",
      "userProfileMajor",
      "userProfileSection",
      "userProfileNotificationEmail",
      "userProfilePhone",
      "userProfilePic",
      "userProfileAvatarUrl",
      "userProfilePassword",
      "userProfile",
      "userProfileIsAlumni",
      "userProfileIsVerified",
    ].forEach((k) => localStorage.removeItem(k));
    goToView("home");
    showMajorAccessNotification(
      "success",
      "Signed out successfully. See you soon!",
    );
    supabase.auth.signOut().catch((err: any) =>
      console.error("[SIGN OUT] Supabase error:", err),
    );
  };

  const isAlumniPending = isLoggedIn && userProfile.isAlumni && !userProfile.isVerified && !isAdmin;

  if (isAlumniPending) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? "bg-black text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center flex flex-col items-center gap-6 ${isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200 shadow-xl"}`}>
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <svg className="h-10 w-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-3V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Profile Pending Approval</h2>
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} leading-relaxed`}>
              Thank you for registering as an alumni! Your profile is currently being reviewed by the administration.
              Once verified, you will have full access to the portal.
            </p>
          </div>
          <button
            onClick={handlePendingAlumniSignOut}
            className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-650 text-white text-sm font-semibold transition-colors shadow-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Main return for all other views
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#000000]"
          : "bg-white"
      }`}
    >
      {/* Major Access Notification Toast */}
      {majorAccessMessage && createPortal(
        <div className="fixed top-24 right-4 sm:right-6 left-4 sm:left-auto z-[200] flex justify-end pointer-events-none animate-fade-in-down max-w-sm w-full ml-auto">
          <div
            className={`pointer-events-auto w-full rounded-xl shadow-2xl p-4 border flex items-start gap-3.5 transition-all duration-300 border-l-4 ${
              isDarkMode
                ? "bg-[#16181c] border-[#2f3336] text-[#e7e9ea] shadow-black/50"
                : "bg-white border-slate-200 text-slate-900 shadow-slate-200/50"
            } ${
              majorAccessMessage.type === "error"
                ? "border-l-rose-500"
                : majorAccessMessage.type === "success"
                  ? "border-l-emerald-500"
                  : "border-l-teal-500"
            }`}
          >
            {/* Icon — shape differentiates, not just color */}
            {majorAccessMessage.type === "error" ? (
              <AlertCircle className="flex-shrink-0 w-5 h-5 text-rose-500 mt-0.5" />
            ) : majorAccessMessage.type === "success" ? (
              <CheckCircle className="flex-shrink-0 w-5 h-5 text-emerald-500 mt-0.5" />
            ) : (
              <Info className={`flex-shrink-0 w-5 h-5 mt-0.5 ${isDarkMode ? "text-[#1e9df1]" : "text-[#1e9df1]"}`} />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                majorAccessMessage.type === "error"
                  ? "text-rose-500"
                  : majorAccessMessage.type === "success"
                    ? "text-emerald-500"
                    : isDarkMode ? "text-[#1e9df1]" : "text-[#1e9df1]"
              }`}>
                {majorAccessMessage.type === "error" ? "Error" : majorAccessMessage.type === "success" ? "Success" : "Notice"}
              </p>
              <p className={`font-semibold text-xs sm:text-sm leading-snug break-words ${
                isDarkMode ? "text-[#e7e9ea]" : "text-slate-800"
              }`}>
                {majorAccessMessage.message}
              </p>
            </div>
            <button
              onClick={() => setMajorAccessMessage(null)}
              className={`flex-shrink-0 mt-0.5 transition-colors ${
                isDarkMode ? "text-slate-400 hover:text-[#d9d9d9]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 border-b backdrop-blur-md ${
          isDarkMode
            ? "bg-[#000000]/80 border-[#2f3336]/50 text-white shadow-lg shadow-black/20"
            : "bg-white/80 border-slate-200/50 text-gray-900 shadow-sm shadow-slate-100/10"
        }`}
      >
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative">
          <div className="flex items-center justify-between h-[72px] lg:h-20 gap-4">

            {/* Left: Hamburger (mobile only) + Logo (desktop only) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`p-2 rounded-xl transition-all duration-200 lg:hidden ${
                  isDarkMode
                    ? "hover:bg-white/10 text-[#8b98a5]"
                    : "hover:bg-black/5 text-slate-600"
                }`}
                title="Menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>

              {/* Logo — desktop only (left-aligned) */}
              <button
                onClick={() => goToView("home")}
                className="hidden lg:flex items-center gap-0.1 focus:outline-none group"
                title="Go to Home"
              >
                <img
                  src="/Edu51Portal.png"
                  alt="Edu51Portal Logo"
                  className="h-20 w-20 object-cover rounded-x1 flex-shrink-0 drop-shadow-sm"
                  width="84"
                  height="84"
                  decoding="async"
                />
                <span
                  className={`text-xl font-bold tracking-tight whitespace-nowrap ${isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"}`}
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                >
                  Edu<span className="text-red-500">51</span>Portal
                </span>
              </button>
            </div>

            {/* Center: Logo (mobile, absolute center) + Pill nav (desktop, absolute center) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              {/* Mobile: centered logo */}
              <button
                onClick={() => goToView("home")}
                className="flex lg:hidden items-center gap-0.1 focus:outline-none"
                title="Go to Home"
              >
                <img
                  src="/Edu51Portal.png"
                  alt="Edu51Portal Logo"
                  className="h-14 w-14 object-cover rounded-xl drop-shadow-sm"
                  width="54"
                  height="54"
                  decoding="async"
                />
                <span
                  className={`text-lg font-bold tracking-tight whitespace-nowrap ${isDarkMode ? "text-[#e7e9ea]" : "text-[#0f1419]"}`}
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                >
                  Edu<span className="text-red-500">51</span>Portal
                </span>
              </button>

              {/* Desktop: sliding pill nav with home icon as first tab */}
              <nav className="hidden lg:flex items-center">
                <AppNavHeader
                  currentView={currentView}
                  isDarkMode={isDarkMode}
                  isLoggedIn={isLoggedIn}
                  goToView={goToView}
                  showMajorAccessNotification={showMajorAccessNotification}
                  setShowSignInModal={setShowSignInModal}
                  pendingConnectionsCount={pendingConnectionsCount}
                />
              </nav>
            </div>

            {/* Right: Auth buttons / User dropdown */}
            <div className="flex items-center gap-2 justify-end flex-shrink-0">
              {!isLoggedIn && (
                <>
                  {/* Desktop: full Login + Create Account buttons */}
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                        isDarkMode
                          ? "bg-[#16181c] text-[#d9d9d9] border-[#2f3336] hover:bg-[#2f3336] hover:text-white"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setShowSignUpModal(true);
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all duration-150"
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Mobile: single sign-in icon button */}
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className={`lg:hidden flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
                      isDarkMode
                        ? "bg-[#16181c] border-[#2f3336] text-[#8b98a5] hover:bg-[#2f3336] hover:text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                    }`}
                    title="Sign In"
                  >
                    <LogIn className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* User Dropdown Menu - visible when logged in */}
              {isLoggedIn && (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 ${
                      isDarkMode
                        ? "bg-[#16181c] border-[#2f3336] text-[#d9d9d9] hover:bg-[#2f3336]"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      {userProfile.profilePic || userProfile.avatar_url ? (
                        <img
                          src={userProfile.profilePic || userProfile.avatar_url}
                          alt={userProfile.name}
                          className="w-full h-full object-cover block"
                          width="32"
                          height="32"
                          decoding="async"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                      <span className="text-xs font-semibold max-w-[110px] truncate">{userProfile.name}</span>
                      <span className={`text-[10px] max-w-[110px] truncate ${isDarkMode ? "text-slate-400" : "text-slate-400"}`}>
                        {extractBubtId(userProfile.bubtEmail)}
                      </span>
                    </div>
                    <svg
                      className={`w-3 h-3 opacity-50 transition-transform duration-200 flex-shrink-0 ${showUserDropdown ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Content */}
                  {showUserDropdown && (
                    <div
                      className={`absolute right-0 mt-2 w-52 rounded-xl border shadow-xl py-2 z-50 transition-all duration-200 ${
                        isDarkMode
                          ? "bg-[#17181c] border-[#2f3336] text-[#d9d9d9]"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      {/* User Info Header in Dropdown */}
                      <div className={`px-4 py-3 border-b ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
                        <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Signed in as</p>
                        <p className={`font-semibold text-sm truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{userProfile.name}</p>
                        {userProfile.bubtEmail && (
                          <p className={`text-xs mt-0.5 truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            ID: {extractBubtId(userProfile.bubtEmail)}
                          </p>
                        )}
                      </div>
                      
                      {/* My Profile */}
                      <button
                        onClick={() => {
                          goToView("profile");
                          setShowUserDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                          isDarkMode
                            ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <User className="w-4 h-4 text-blue-500" />
                        My Profile
                      </button>

                      {/* Edit Profile */}
                      <button
                        onClick={() => {
                          setIsEditingProfile(true);
                          setShowSignUpModal(true);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                          isDarkMode
                            ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <Settings className="w-4 h-4 text-purple-500" />
                        Account Settings
                      </button>

                      {/* Switch Theme Option */}
                      <button
                        onClick={toggleDarkMode}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                          isDarkMode
                            ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
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

                      {/* Exit Admin */}
                      {isAdmin && currentView === "admin" && (
                        <button
                          onClick={() => {
                            handleExitAdmin();
                            setShowUserDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                            isDarkMode
                              ? "hover:bg-[#16181c] text-[#d9d9d9] hover:text-white"
                              : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                          }`}
                        >
                          <ArrowLeft className="w-4 h-4 text-blue-500" />
                          Exit Admin
                        </button>
                      )}

                      {/* Logout */}
                      <button
                        onClick={() => {
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
                          goToView("home");
                          showMajorAccessNotification(
                            "success",
                            "Signed out successfully. See you soon!",
                          );
                          supabase.auth.signOut().catch((err: any) =>
                            console.error("[SIGN OUT] Supabase error:", err),
                          );
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                          isDarkMode
                            ? "hover:bg-[#16181c] text-red-400 hover:text-red-300"
                            : "hover:bg-slate-100 text-red-650 hover:text-red-750"
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notification Bell + Popover */}
              {isLoggedIn && (
                <div className="relative">
                  <button
                    onClick={toggleNoticePanel}
                    title="Notifications"
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
                      isDarkMode
                        ? "bg-[#16181c] border-[#2f3336] text-[#8b98a5] hover:bg-[#2f3336] hover:text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                    {(getUnreadNoticeCount() + mentionNotifications.length) > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {(getUnreadNoticeCount() + mentionNotifications.length) > 99 ? "99+" : (getUnreadNoticeCount() + mentionNotifications.length)}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNoticePanel && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={`notification-panel absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto rounded-xl shadow-xl z-[120] ${
                          isDarkMode
                            ? "bg-[#000000]/95 backdrop-blur-md border border-[#2f3336]"
                            : "bg-white/95 backdrop-blur-md border border-slate-200 shadow-slate-300/40"
                        }`}
                      >
                        {/* Header */}
                        <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? "border-[#2f3336] bg-black" : "border-slate-100 bg-white"}`}>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-semibold ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>Notifications</h3>
                            {(getUnreadNoticeCount() + mentionNotifications.length) > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                                {getUnreadNoticeCount() + mentionNotifications.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {mentionNotifications.length > 0 && authSession?.user?.id && (
                              <button
                                onClick={() => { markAllNotificationsRead(authSession.user.id); setMentionNotifications([]); }}
                                className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#16181c]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
                              >
                                Mark all read
                              </button>
                            )}
                            <button
                              onClick={() => setShowNoticePanel(false)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? "text-[#71767b] hover:bg-[#16181c] hover:text-[#e7e9ea]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        {notices.length === 0 && emergencyAlerts.length === 0 && emergencyLinks.length === 0 && mentionNotifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 gap-3 px-6 text-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                              <Bell className={`h-6 w-6 ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`} />
                            </div>
                            <p className={`font-semibold text-sm ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-700"}`}>All caught up</p>
                            <p className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`}>No new notifications right now.</p>
                          </div>
                        ) : (
                          <div className={`divide-y ${isDarkMode ? "divide-[#2f3336]" : "divide-gray-100"}`}>
                             {mentionNotifications.map((n, idx) => (
                              <motion.button
                                key={n.id}
                                initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.25, delay: idx * 0.05 }}
                                onClick={() => {
                                  markNotificationRead(n.id);
                                  setMentionNotifications((prev) => prev.filter((x) => x.id !== n.id));
                                  setShowNoticePanel(false);
                                  if (n.title === "Connection Request") {
                                    goToView("network");
                                  } else if (n.team_id) {
                                    setSelectedTeamId(n.team_id);
                                    goToView("team", n.team_id);
                                  } else if (n.type === "alumni_approval" || n.title === "New Alumni Registration") {
                                    goToView("admin");
                                  }
                                }}
                                className={`w-full flex gap-3 px-4 py-3.5 text-left transition-colors ${isDarkMode ? "hover:bg-amber-900/20 bg-amber-950/10" : "hover:bg-amber-50 bg-amber-50/70"}`}
                              >
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br ${
                                  n.title === "Connection Request" 
                                    ? "from-sky-400 to-blue-500" 
                                    : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                                      ? "from-orange-400 to-red-500"
                                      : "from-amber-400 to-orange-500"
                                } flex items-center justify-center text-white text-xs font-bold`}>
                                  {n.actor_name?.charAt(0)?.toUpperCase() ?? "@"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${
                                    n.title === "Connection Request" 
                                      ? "text-sky-500" 
                                      : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                                        ? "text-orange-500"
                                        : "text-amber-500"
                                  }`}>
                                    {n.title === "Connection Request" 
                                      ? "Network" 
                                      : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                                        ? "Announcement"
                                        : "Mentioned you"}
                                  </p>
                                  <p className={`text-xs font-medium leading-snug ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-800"}`}>{n.title}</p>
                                  {n.body && <p className={`text-xs mt-0.5 truncate ${isDarkMode ? "text-[#71767b]" : "text-slate-500"}`}>"{n.body}"</p>}
                                </div>
                              </motion.button>
                            ))}
                            {emergencyAlerts.map((alert) => (
                              <div key={alert.id} className={`flex gap-3 px-4 py-3.5 transition-colors ${isDarkMode ? "hover:bg-[#16181c]/60" : "hover:bg-red-50"}`}>
                                <span className="text-base flex-shrink-0">🚨</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-red-500">Emergency</p>
                                  <p className={`text-xs leading-snug ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-800"}`}>{alert.message}</p>
                                </div>
                              </div>
                            ))}
                            {emergencyLinks.map((link) => (
                              <div key={link.id} onClick={() => { if (link.url) window.open(link.url, "_blank"); }} className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors ${isDarkMode ? "hover:bg-[#16181c]/60" : "hover:bg-purple-50"}`}>
                                <span className="text-base flex-shrink-0">🔗</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-purple-500">Important Link</p>
                                  <p className={`text-xs font-medium ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-800"}`}>{link.title}</p>
                                  {link.url && <p className={`text-xs mt-0.5 truncate ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`}>{link.url}</p>}
                                </div>
                              </div>
                            ))}
                            {activeNotices.map((notice, idx) => {
                              const isUnread = !unreadNotices.includes(notice.id);
                              const emoji = notice.category === "exam" ? "📚" : notice.category === "event" ? "🎉" : notice.category === "academic" ? "🎓" : notice.category === "information" ? "ℹ️" : notice.category === "random" ? "🎲" : "🔔";
                              return (
                                <motion.div
                                  key={notice.id}
                                  initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                                  onClick={() => { handleNoticeClick(notice); markNoticeAsRead(notice.id); setShowNoticePanel(false); }}
                                  className={`relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors ${isDarkMode ? "hover:bg-[#16181c]" : "hover:bg-slate-50"} ${isUnread ? (isDarkMode ? "bg-blue-950/30" : "bg-blue-50/60") : ""}`}
                                >
                                  {isUnread && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                  <span className="text-base flex-shrink-0">{emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-xs font-semibold line-clamp-2 leading-snug ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>{notice.title}</p>
                                      {notice.priority === "urgent" && <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">URGENT</span>}
                                    </div>
                                    <p className={`text-[10px] mt-1 ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`}>
                                      {new Date(notice.created_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Menu - Universal for all devices */}
      {showMobileMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] transition-opacity duration-300"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Sidebar */}
          <div
            className={`fixed top-0 left-0 h-[100dvh] w-[80vw] max-w-xs sm:max-w-sm shadow-2xl z-[120] transition-all duration-300 overflow-y-auto flex flex-col ${
              isDarkMode
                ? "bg-gradient-to-b from-gray-900 via-slate-900 to-gray-800"
                : "bg-gradient-to-b from-slate-50 via-white to-gray-50"
            }`}
          >
            {/* Sidebar Header */}
            <div
              className={`sticky top-0 px-4 sm:px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode
                  ? "border-[#2f3336]/50 bg-[#17181c]/80 backdrop-blur-sm"
                  : "border-gray-200/50 bg-white/80 backdrop-blur-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-lg font-bold transition-colors duration-300 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  Menu
                </h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className={`p-1 rounded-lg transition-all ${isDarkMode ? "hover:bg-[#2f3336]" : "hover:bg-gray-100"}`}
                  title="Close"
                >
                  <X
                    className={`h-5 w-5 ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  />
                </button>
              </div>
            </div>


            {/* Menu Items */}
            <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">

              {/* Home */}
              <button
                onClick={() => {
                  goToView("home");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-[#16181c]/50 border-[#2f3336]/50 hover:border-[#38444d]/50 text-gray-100"
                    : "hover:bg-slate-100/50 border-gray-200/50 hover:border-slate-300 text-gray-900"
                } ${currentView === "home" ? (isDarkMode ? "bg-[#16181c]/80 border-[#2f3336]" : "bg-slate-100 border-slate-300") : ""}`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}
                >
                  <Home
                    className={`w-5 h-5 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`}
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm">Home</p>
                  <p
                    className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    Main Dashboard
                  </p>
                </div>
              </button>

              {/* World Cup 2026 */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    showMajorAccessNotification(
                      "error",
                      "Please sign in to join the World Cup 2026 event",
                    );
                    setShowSignInModal(true);
                    setShowMobileMenu(false);
                    return;
                  }
                  goToView("wc26");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-green-900/30 border-[#2f3336]/50 hover:border-green-500/50 text-gray-100"
                    : "hover:bg-green-50 border-gray-200/50 hover:border-green-300 text-gray-900"
                } ${currentView === "wc26" ? (isDarkMode ? "bg-green-950/40 border-green-600/60" : "bg-green-100/50 border-green-300") : ""}`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-green-900/40" : "bg-green-100"}`}>
                  <Trophy className={`w-5 h-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">World Cup '26</p>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500 text-white animate-pulse">
                      LIVE
                    </span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}>
                    Pick a team · earn points · leaderboard
                  </p>
                </div>
              </button>

              {/* Semester Tracker */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    showMajorAccessNotification(
                      "error",
                      "Please sign in to access Semester Tracker",
                    );
                    setShowSignInModal(true);
                    setShowMobileMenu(false);
                    return;
                  }
                  goToView("semester");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-blue-900/30 border-[#2f3336]/50 hover:border-blue-500/50 text-gray-100"
                    : "hover:bg-blue-50 border-gray-200/50 hover:border-blue-300 text-gray-900"
                } ${!isLoggedIn ? "opacity-60" : ""} ${currentView === "semester" ? (isDarkMode ? "bg-blue-950/40 border-[#1e9df1]/60" : "bg-blue-100/50 border-blue-300") : ""}`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-blue-900/40" : "bg-blue-100"}`}
                >
                  <Clock
                    className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm">Semester Tracker</p>
                  <p
                    className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    View progress
                  </p>
                </div>
              </button>

              {/* Team Building */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    showMajorAccessNotification(
                      "error",
                      "Please sign in to access Team Building",
                    );
                    setShowSignInModal(true);
                    setShowMobileMenu(false);
                    return;
                  }
                  goToView("teams");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-emerald-900/30 border-[#2f3336]/50 hover:border-emerald-500/50 text-gray-100"
                    : "hover:bg-emerald-50 border-gray-200/50 hover:border-emerald-300 text-gray-900"
                } ${!isLoggedIn ? "opacity-60" : ""} ${(currentView === "teams" || currentView === "team") ? (isDarkMode ? "bg-emerald-950/40 border-emerald-600/60" : "bg-emerald-100/50 border-emerald-300") : ""}`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-emerald-900/40" : "bg-emerald-100"}`}
                >
                  <Users
                    className={`w-5 h-5 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">Team Building</p>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
                      NEW
                    </span>
                  </div>
                  <p
                    className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    Create teams & find members
                  </p>
                </div>
              </button>

              {/* Shared Resources */}
              <button
                onClick={() => {
                  goToView("shared-resources");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-blue-900/30 border-[#2f3336]/50 hover:border-blue-500/50 text-gray-100"
                    : "hover:bg-blue-50 border-gray-200/50 hover:border-blue-300 text-gray-900"
                } ${currentView === "shared-resources" ? (isDarkMode ? "bg-blue-950/40 border-[#1e9df1]/60" : "bg-blue-100/50 border-blue-300") : ""}`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-blue-900/40" : "bg-blue-100"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    <circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm">Shared Resources</p>
                  <p className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}>
                    Public files from all teams
                  </p>
                </div>
              </button>

              {/* My Network */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    showMajorAccessNotification(
                      "error",
                      "Please sign in to access My Network",
                    );
                    setShowSignInModal(true);
                    setShowMobileMenu(false);
                    return;
                  }
                  goToView("network");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-sky-900/30 border-[#2f3336]/50 hover:border-sky-500/50 text-gray-100"
                    : "hover:bg-sky-50 border-gray-200/50 hover:border-sky-300 text-gray-900"
                } ${!isLoggedIn ? "opacity-60" : ""} ${currentView === "network" ? (isDarkMode ? "bg-sky-950/40 border-sky-600/60" : "bg-sky-100/50 border-sky-300") : ""}`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 relative ${isDarkMode ? "bg-sky-900/40" : "bg-sky-100"}`}
                >
                  <UserPlus
                    className={`w-5 h-5 ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
                  />
                  {pendingConnectionsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                    </span>
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">My Network</p>
                    {pendingConnectionsCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white animate-pulse">
                        {pendingConnectionsCount}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500 text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    Connect with classmates
                  </p>
                </div>
              </button>

              {/* Alumni Hub */}
              <button
                onClick={() => {
                  goToView("alumni");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-amber-900/30 border-[#2f3336]/50 hover:border-amber-500/50 text-gray-100"
                    : "hover:bg-amber-50 border-gray-200/50 hover:border-amber-300 text-gray-900"
                } ${currentView === "alumni" ? (isDarkMode ? "bg-amber-950/40 border-amber-600/60" : "bg-amber-100/50 border-amber-300") : ""}`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-amber-900/40" : "bg-amber-100"}`}
                >
                  <GraduationCap
                    className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">Alumni Hub</p>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isDarkMode ? "bg-[#2f3336] text-[#8b98a5]" : "bg-slate-200 text-slate-600"}`}
                    >
                      SOON
                    </span>
                  </div>
                  <p
                    className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    Alumni from our varsity
                  </p>
                </div>
              </button>

              {/* Custom Routine */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    showMajorAccessNotification(
                      "error",
                      "Please sign in to access Custom Routine",
                    );
                    setShowSignInModal(true);
                    setShowMobileMenu(false);
                    return;
                  }
                  goToView("custom");
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                  isDarkMode
                    ? "hover:bg-purple-900/30 border-[#2f3336]/50 hover:border-purple-500/50 text-gray-100"
                    : "hover:bg-purple-50 border-gray-200/50 hover:border-purple-300 text-gray-900"
                } ${!isLoggedIn ? "opacity-60" : ""} ${currentView === "custom" ? (isDarkMode ? "bg-purple-950/40 border-purple-600/60" : "bg-purple-100/50 border-purple-300") : ""}`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${isDarkMode ? "bg-purple-900/40" : "bg-purple-100"}`}
                >
                  <BookOpen
                    className={`w-5 h-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm">Custom Routine</p>
                  <p
                    className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    Build your own schedule
                  </p>
                </div>
              </button>
            </div>

            {/* Authentication Section - At Bottom */}
            <div
              className={`px-4 pt-3 pb-[env(safe-area-inset-bottom,12px)] space-y-2 border-t mt-auto ${isDarkMode ? "border-[#2f3336]/30" : "border-gray-200/50"}`}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              {isLoggedIn ? (
                <button
                  onClick={async () => {
                    // Clear state immediately (optimistic) so UI reflects logout right away
                    setShowMobileMenu(false);
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
                    const keysToRemove = [
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
                    ];
                    keysToRemove.forEach((key) => localStorage.removeItem(key));
                    goToView("home");
                    showMajorAccessNotification(
                      "success",
                      "Signed out successfully. See you soon!",
                    );

                    // Revoke Supabase session in background
                    supabase.auth.signOut().catch((err: any) =>
                      console.error("[SIGN OUT] Supabase error:", err),
                    );
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isDarkMode
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowSignInModal(true);
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isDarkMode
                          ? "bg-white text-gray-900 hover:bg-gray-100"
                          : "bg-[#17181c] text-white hover:bg-[#16181c]"
                      }`}
                    >
                      <LogIn className="h-5 w-5" />
                      <span>Sign In</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowResetPasswordModal(true);
                        setShowMobileMenu(false);
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDarkMode
                          ? "text-blue-400 hover:text-blue-300"
                          : "text-blue-600 hover:text-blue-700"
                      }`}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <p
                    className={`text-xs text-center ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                  >
                    New here? Join our community for exclusive study materials &
                    features! 📚
                  </p>
                </>
              )}
            </div>

          </div>
        </>
      )}

      {/* Notification Sidebar - removed, replaced by inline popover on bell button */}
      {false && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[110]"
            onClick={() => setShowNoticePanel(false)}
          />

          {/* Notification Drawer */}
          <div
            className={`notification-panel fixed top-0 right-0 h-[100dvh] w-[88vw] max-w-sm shadow-2xl z-[120] flex flex-col ${
              isDarkMode ? "bg-[#17181c] border-l border-[#2f3336]" : "bg-white border-l border-slate-200"
            }`}
          >
            {/* Header */}
            <div className={`flex-shrink-0 flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
              <div className="flex items-center gap-2.5">
                <h2 className={`font-bold text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}>Notifications</h2>
                {(getUnreadNoticeCount() + mentionNotifications.length) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                    {getUnreadNoticeCount() + mentionNotifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {mentionNotifications.length > 0 && authSession?.user?.id && (
                  <button
                    onClick={() => {
                      markAllNotificationsRead(authSession.user.id);
                      setMentionNotifications([]);
                    }}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDarkMode ? "text-slate-400 hover:text-[#d9d9d9] hover:bg-[#16181c]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNoticePanel(false)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    isDarkMode ? "text-slate-400 hover:bg-[#16181c] hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notices.length === 0 && emergencyAlerts.length === 0 && emergencyLinks.length === 0 && mentionNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                    <Bell className={`h-7 w-7 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                  </div>
                  <p className={`font-semibold text-sm ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>All caught up</p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>No new notifications right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#2f3336]">

                  {/* Mention Notifications */}
                  {mentionNotifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setMentionNotifications((prev) => prev.filter((x) => x.id !== n.id));
                        setShowNoticePanel(false);
                        if (n.title === "Connection Request") {
                          goToView("network");
                        } else if (n.team_id) {
                          setSelectedTeamId(n.team_id);
                          goToView("team", n.team_id);
                        } else if (n.type === "alumni_approval" || n.title === "New Alumni Registration") {
                          goToView("admin");
                        }
                      }}
                      className={`w-full flex gap-3 px-5 py-4 text-left transition-colors ${isDarkMode ? "hover:bg-amber-900/20 bg-amber-950/10" : "hover:bg-amber-50 bg-amber-50/70"}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br ${
                        n.title === "Connection Request" 
                          ? "from-sky-400 to-blue-500" 
                          : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                            ? "from-orange-400 to-red-500"
                            : "from-amber-400 to-orange-500"
                      } flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
                        {n.actor_name?.charAt(0)?.toUpperCase() ?? "@"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                          n.title === "Connection Request" 
                            ? "text-sky-500" 
                            : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                              ? "text-orange-500"
                              : "text-amber-500"
                        }`}>
                          {n.title === "Connection Request" 
                            ? "Network" 
                            : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                              ? "Announcement"
                              : "Mentioned you"}
                        </p>
                        <p className={`text-sm font-medium leading-snug ${isDarkMode ? "text-[#d9d9d9]" : "text-slate-800"}`}>{n.title}</p>
                        {n.body && <p className={`text-xs mt-0.5 truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>"{n.body}"</p>}
                        <p className={`text-[10px] mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {
                            n.title === "Connection Request" 
                              ? "Tap to view requests" 
                              : (n.type === "notice" || n.title.toLowerCase().includes("announcement"))
                                ? "Tap to view announcements"
                                : "Tap to open chat"
                          }
                        </p>
                      </div>
                    </button>
                  ))}

                  {/* Emergency Alerts */}
                  {emergencyAlerts.map((alert) => (
                    <div key={alert.id} className={`flex gap-3 px-5 py-4 ${isDarkMode ? "hover:bg-[#16181c]/60" : "hover:bg-red-50"} transition-colors cursor-default`}>
                      <span className="text-xl flex-shrink-0 mt-0.5">🚨</span>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 text-red-500`}>Emergency</p>
                        <p className={`text-sm leading-snug ${isDarkMode ? "text-[#d9d9d9]" : "text-slate-800"}`}>{alert.message}</p>
                      </div>
                    </div>
                  ))}

                  {/* Emergency Links */}
                  {emergencyLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`flex gap-3 px-5 py-4 ${isDarkMode ? "hover:bg-[#16181c]/60" : "hover:bg-purple-50"} transition-colors cursor-pointer`}
                      onClick={() => { if (link.url) window.open(link.url, "_blank"); }}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">🔗</span>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 text-purple-500`}>Important Link</p>
                        <p className={`text-sm font-medium ${isDarkMode ? "text-[#d9d9d9]" : "text-slate-800"}`}>{link.title}</p>
                        {link.url && <p className={`text-xs mt-0.5 truncate ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{link.url}</p>}
                      </div>
                    </div>
                  ))}

                  {/* Regular Notices */}
                  {activeNotices.map((notice) => {
                    const isUnread = !unreadNotices.includes(notice.id);
                    const emoji =
                      notice.category === "exam" ? "📚"
                      : notice.category === "event" ? "🎉"
                      : notice.category === "academic" ? "🎓"
                      : notice.category === "information" ? "ℹ️"
                      : notice.category === "random" ? "🎲"
                      : "🔔";
                    return (
                      <div
                        key={notice.id}
                        onClick={() => { handleNoticeClick(notice); markNoticeAsRead(notice.id); setShowNoticePanel(false); }}
                        className={`relative flex gap-3 px-5 py-4 cursor-pointer transition-colors ${
                          isDarkMode ? "hover:bg-[#16181c]/60" : "hover:bg-slate-50"
                        } ${isUnread ? (isDarkMode ? "bg-blue-950/30" : "bg-blue-50/60") : ""}`}
                      >
                        {/* Unread dot */}
                        {isUnread && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />}

                        <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold line-clamp-2 leading-snug ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>
                              {notice.title}
                            </p>
                            {notice.priority === "urgent" && (
                              <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">URGENT</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {new Date(notice.created_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                            </span>
                            {notice.priority === "high" && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-yellow-900/40 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>High</span>
                            )}
                            {notice.category === "exam" && notice.exam_type && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-700"}`}>
                                {notice.exam_type === "midterm" ? "Midterm" : "Final"}
                              </span>
                            )}
                            {notice.attachment_url && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-[#2f3336] text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                📎 {notice.attachment_type === "pdf" ? "PDF" : "File"}
                              </span>
                            )}
                            {notice.category === "event" && notice.event_date && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-purple-900/40 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                                📅 {new Date(notice.event_date).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content - Enhanced Mobile Responsive Design */}
      {/* Also mounts when a modal is open in a feature view — modal is fixed inset-0 so home content stays hidden beneath it */}
      {(!["semester","custom","profile","network","teams","team","alumni","wc26"].includes(currentView) || showNoticeModal || showMaterialViewer) && (
        <main className="relative pt-[72px] lg:pt-20 min-h-screen [overflow-x:clip]">
          {currentView === "home" && isDarkMode && <Tiles isDarkMode={isDarkMode} />}

          {/* ── Announcement Banner ── */}
          {showAnnouncementBanner && (
            <div className={`relative z-10 w-full text-white ${isDarkMode ? "bg-[#17181c] border-b border-[#2f3336]" : "bg-[#1e9df1]"}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-start justify-between gap-3">
                {/* Clickable text area */}
                <button
                  onClick={() => setBannerExpanded((v) => !v)}
                  className="flex items-start gap-3 min-w-0 text-left group flex-1 outline-none focus:outline-none"
                  aria-expanded={bannerExpanded}
                >
                  {/* Pulse dot */}
                  <span className="relative flex-shrink-0 h-2.5 w-2.5 mt-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <p className="text-sm font-medium leading-snug">
                    {bannerExpanded ? (
                      <>
                        <span className="font-bold">Update in progress.</span>
                        <span className="opacity-90"> We're actively building and improving Edu<span className="text-[#fca5a5]">51</span>Portal. New features and design updates ship regularly, so things might look a little different each time you visit. Stick around — this is just getting started. Built with care by </span>
                        <span className="font-semibold underline underline-offset-2 decoration-white/60">CoreWe-5</span>
                        <span className="opacity-90"> 🚀</span>
                        <span className="ml-2 text-xs opacity-60 group-hover:opacity-100 transition-opacity">(tap to collapse)</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold">Update in progress</span>
                        <span className="opacity-90"> · Edu<span className="text-[#fca5a5]">51</span>Portal is evolving with new features regularly. Built by </span>
                        <span className="font-semibold">CoreWe-5</span>
                        <span className="opacity-60 text-xs ml-1.5">tap for more</span>
                      </>
                    )}
                  </p>
                </button>
                {/* Dismiss */}
                <button
                  onClick={() => {
                    setShowAnnouncementBanner(false);
                    localStorage.setItem("edu51five_banner_update1_dismissed", "true");
                  }}
                  aria-label="Dismiss announcement"
                  className="flex-shrink-0 p-1 mt-0.5 rounded-md hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-4 sm:py-5 lg:py-6">
            {/* Home Page */}
            {currentView === "home" && (
              <motion.div
                className="relative z-10 space-y-4 sm:space-y-5 w-full"
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.11 } } }}
              >

                {/* ── Hero Section ── */}
                <motion.div
                  className="relative text-center pt-2 pb-1 sm:pt-4 sm:pb-2"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                >

                  {/* Background glow orbs — not animated */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[min(520px,100vw)] h-[220px] rounded-full blur-[80px]"
                      style={{ background: isDarkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.10)' }} />
                    <div className="absolute top-6 -left-8 w-[200px] h-[160px] rounded-full blur-[60px]"
                      style={{ background: isDarkMode ? 'rgba(59,130,246,0.13)' : 'rgba(59,130,246,0.08)' }} />
                    <div className="absolute top-2 -right-8 w-[180px] h-[140px] rounded-full blur-[60px]"
                      style={{ background: isDarkMode ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)' }} />
                  </div>

                  {/* BUBT logo — prominent, centered */}
                  <motion.div
                    className="flex flex-col items-center mb-5"
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}
                  >
                    <img
                      src="/image.png"
                      alt="BUBT"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-3 drop-shadow logo-glow-pulse"
                    />
                    <p className={`text-[11px] font-medium tracking-widest uppercase ${isDarkMode ? 'text-[#71767b]' : 'text-slate-400'}`}>
                      BUBT · Intake 51 · CSE Department
                    </p>
                  </motion.div>

                  {/* Brand headline */}
                  <motion.h1
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none mb-2"
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                    variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}
                  >
                    <span className={isDarkMode ? 'text-[#e7e9ea]' : 'text-[#0f1419]'}>Edu</span><span className="glitch-51 text-[#ef4444]" data-text="51">51</span><span className={isDarkMode ? 'text-[#e7e9ea]' : 'text-[#0f1419]'}>Portal</span>
                  </motion.h1>

                  {/* Tagline */}
                  <motion.p
                    className={`text-sm sm:text-base font-normal max-w-xs sm:max-w-sm mx-auto leading-relaxed px-2 ${isDarkMode ? 'text-[#71767b]' : 'text-slate-400'}`}
                    variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
                  >
                    One place for your courses, batch collaboration, and quick AI help.
                  </motion.p>
                </motion.div>

                {/* ── Guest CTA ── */}
                {!isLoggedIn && (
                  <motion.div
                    className={`relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-[#16181c] border-[#2f3336]' : 'bg-gradient-to-r from-[#e3ecf6] to-[#f0f8ff] border-[#c8dff0]'
                    }`}
                    variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
                  >
                    <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-violet-400/10 to-transparent" />
                    </div>
                    <div className="flex items-start gap-3 min-w-0 relative">
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0 mt-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-[#d9d9d9]' : 'text-slate-800'}`}>Browsing as guest</p>
                        <p className={`text-xs leading-snug ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Create an account to unlock your full schedule, teams, and more.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setIsEditingProfile(false); setShowSignUpModal(true); }}
                      className="self-stretch sm:self-auto flex-shrink-0 px-5 py-2 rounded-xl text-sm font-bold text-white text-center transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                    >
                      Create Account →
                    </button>
                  </motion.div>
                )}

                {/* ── Major Card Stack ── */}
                <motion.div
                  className="w-full"
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}
                >
                  {/* Section header */}
                  <div className="mb-3 text-center">
                    <div className="inline-flex items-center gap-2.5 mb-2">
                      <motion.div
                        className={`h-px ${isDarkMode ? 'bg-gradient-to-r from-transparent to-[#1e9df1]/60' : 'bg-gradient-to-r from-transparent to-[#1e9df1]/40'}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: 40 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                      />
                      <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${isDarkMode ? 'text-[#1e9df1]' : 'text-[#1677cc]'}`}>Study Materials</span>
                      <motion.div
                        className={`h-px ${isDarkMode ? 'bg-gradient-to-l from-transparent to-[#1e9df1]/60' : 'bg-gradient-to-l from-transparent to-[#1e9df1]/40'}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: 40 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                      />
                    </div>
                    <p className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-[#e7e9ea]' : 'text-slate-800'}`}>
                      Course materials by major
                    </p>
                  </div>

                  {/* Card Stack — user's major on top; random for guests */}
                  {(() => {
                    const MAJOR_DEFS = [
                      {
                        id: "AI",
                        title: "Artificial Intelligence",
                        subtitle: "AI · Intake 51",
                        imageSrc: "/Ai_Cover.jpg",
                        accentGradient: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600",
                        glowColor: "#a855f7",
                        tags: [
                          { label: "Machine Learning", color: "bg-purple-100 text-purple-700" },
                          { label: "Deep Learning", color: "bg-pink-100 text-pink-700" },
                        ],
                        view: "ai" as const,
                        majorKey: "AI",
                      },
                      {
                        id: "SE",
                        title: "Software Engineering",
                        subtitle: "SE · Intake 51",
                        imageSrc: "/SE_cover.jpg",
                        accentGradient: "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600",
                        glowColor: "#6366f1",
                        tags: [
                          { label: "Web Development", color: "bg-blue-100 text-blue-700" },
                          { label: "Database Systems", color: "bg-indigo-100 text-indigo-700" },
                        ],
                        view: "software" as const,
                        majorKey: "Software Engineering",
                      },
                      {
                        id: "NET",
                        title: "Networking",
                        subtitle: "NET · Intake 51",
                        imageSrc: "/Networking_cover.jpg",
                        accentGradient: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                        glowColor: "#10b981",
                        tags: [
                          { label: "Network Security", color: "bg-emerald-100 text-emerald-700" },
                          { label: "Wireless Systems", color: "bg-[#1e9df1]/10 text-[#1e9df1]" },
                        ],
                        view: "networking" as const,
                        majorKey: "Networking",
                      },
                    ];

                    // Build ordered list — user's major first if logged in
                    const userMajorKey = isLoggedIn ? userProfile.major : null;
                    const userMajorIdx = MAJOR_DEFS.findIndex(m => m.majorKey === userMajorKey);

                    const initialIdx = userMajorIdx >= 0 ? userMajorIdx : 0;

                    const stackItems = MAJOR_DEFS.map(def => ({
                      id: def.id,
                      title: def.title,
                      subtitle: def.subtitle,
                      imageSrc: def.imageSrc,
                      accentGradient: def.accentGradient,
                      glowColor: def.glowColor,
                      tags: def.tags,
                      isUserMajor: def.majorKey === userMajorKey,
                      locked: isLoggedIn && def.majorKey !== userMajorKey,
                      onClick: () => {
                        if (!isLoggedIn) {
                          setGuestMajor(def.majorKey);
                          showMajorAccessNotification("info", "Guest access enabled for this semester. Please create your profile before next semester.");
                          goToView(def.view);
                          return;
                        }
                        if (def.majorKey !== userProfile.major) {
                          showMajorAccessNotification("error", `Access Denied: This section is for ${def.majorKey} students only. Your major: ${userProfile.major || "Not set"}`);
                          return;
                        }
                        goToView(def.view);
                      },
                    }));

                    return (
                      <MajorCardStack
                        items={stackItems}
                        initialIndex={initialIdx}
                        isDarkMode={isDarkMode}
                      />
                    );
                  })()}

                </motion.div>
                {/* New Version CTA moved above; removing duplicate here */}

                {/* Platform Features ticker */}
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-4 justify-center">
                    <div className={`h-px flex-1 max-w-[80px] ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-200'}`} />
                    <p className={`text-[11px] font-bold tracking-[0.15em] uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Platform capabilities
                    </p>
                    <div className={`h-px flex-1 max-w-[80px] ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-200'}`} />
                  </div>
                  <MarqueeTicker isDarkMode={isDarkMode} />
                </div>

                {/* Compact Connect & Support Section removed - moved into main footer below */}

                {/* ── Footer ── */}
                <footer
                  className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${
                    isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="px-6 pt-8 pb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

                      {/* Col 1 — Brand */}
                      <div className="sm:col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                          <img src="/Edu_51_Logo.png" alt="Edu51Portal Logo" className="w-8 h-8 rounded-lg object-contain" />
                          <span
                            className={`text-base font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}
                            style={{ fontFamily: "'Exo 2', sans-serif" }}
                          >
                            Edu<span className="text-[#ef4444]">51</span>Portal
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed mb-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          BUBT Intake 51 Excellence Platform — your all-in-one academic hub for courses, routines, and campus resources.
                        </p>
                        <div className="flex items-center gap-2">
                          <a
                            href="https://www.facebook.com/mr.swapnil360"
                            onClick={handleFacebookClick}
                            target="_blank" rel="noopener noreferrer"
                            title="Facebook" aria-label="Facebook"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "bg-[#16181c] hover:bg-blue-600 text-slate-400 hover:text-white" : "bg-slate-100 hover:bg-blue-600 text-slate-500 hover:text-white"}`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </a>
                          <a
                            href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Swapnil, I need help with Edu51Portal.")}`}
                            onClick={handleWhatsAppClick}
                            target="_blank" rel="noopener noreferrer"
                            title="WhatsApp" aria-label="WhatsApp"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "bg-[#16181c] hover:bg-green-600 text-slate-400 hover:text-white" : "bg-slate-100 hover:bg-green-600 text-slate-500 hover:text-white"}`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                          <button
                            onClick={handleEmailClick}
                            title="Email Support" aria-label="Email Support"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "bg-[#16181c] hover:bg-red-600 text-slate-400 hover:text-white" : "bg-slate-100 hover:bg-red-600 text-slate-500 hover:text-white"}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Col 2 — About */}
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>About</h4>
                        <ul className={`space-y-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          <li>BUBT · Dept. of CSE</li>
                          <li>Intake 51 · All Sections</li>
                          <li>Academic Resource Hub</li>
                          <li>Exam Routines & Notices</li>
                          <li>Course Materials & Tracker</li>
                          <li>AI Study Assistant</li>
                        </ul>
                      </div>

                      {/* Col 3 — Support */}
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>Support</h4>
                        <ul className="space-y-2">
                          <li>
                            <button onClick={() => setShowFeedbackModal(true)} className={`text-xs font-semibold hover:underline underline-offset-2 transition-colors ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}>
                              Send Feedback
                            </button>
                          </li>
                          <li>
                            <button onClick={() => handleEmailClick()} className={`text-xs hover:underline underline-offset-2 transition-colors ${isDarkMode ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"}`}>
                              Contact Support
                            </button>
                          </li>
                          <li>
                            <button onClick={() => goToView("terms")} className={`text-xs hover:underline underline-offset-2 transition-colors ${isDarkMode ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"}`}>
                              Terms &amp; Conditions
                            </button>
                          </li>
                          <li>
                            <button onClick={() => goToView("privacy")} className={`text-xs hover:underline underline-offset-2 transition-colors ${isDarkMode ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"}`}>
                              Privacy Policy
                            </button>
                          </li>
                        </ul>
                      </div>

                    </div>
                  </div>

                  {/* Bottom bar */}
                  <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 transition-colors duration-300 ${isDarkMode ? "border-[#2f3336]/50 bg-[#16181c]/40" : "border-slate-100 bg-slate-50"}`}>
                    <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      © {new Date().getFullYear()} Edu<span className="text-[#ef4444]">51</span>Portal · BUBT Intake 51 · All rights reserved.
                    </p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => goToView("terms")} className={`text-xs hover:underline underline-offset-2 transition-colors ${isDarkMode ? "text-slate-500 hover:text-[#8b98a5]" : "text-slate-400 hover:text-slate-600"}`}>
                        Terms
                      </button>
                      <span className={`text-xs ${isDarkMode ? "text-slate-600" : "text-[#8b98a5]"}`}>·</span>
                      <button onClick={() => goToView("privacy")} className={`text-xs hover:underline underline-offset-2 transition-colors ${isDarkMode ? "text-slate-500 hover:text-[#8b98a5]" : "text-slate-400 hover:text-slate-600"}`}>
                        Privacy
                      </button>
                    </div>
                  </div>
                </footer>
              </motion.div>
            )}

            {/* Major Section Courses */}
            {(currentView === "section5" ||
              currentView === "ai" ||
              currentView === "software" ||
              currentView === "networking") && (
              <div className="space-y-8">
                {!isLoggedIn && (
                  <div
                    className={`rounded-2xl border p-6 text-center ${isDarkMode ? "border-blue-500/30 bg-blue-900/20 text-blue-100" : "border-blue-200 bg-blue-50 text-blue-900"}`}
                  >
                    <div className="text-3xl mb-3">👋</div>
                    <h2 className="text-xl font-semibold mb-2">
                      Guest access enabled for this semester
                    </h2>
                    <p
                      className={`text-sm ${isDarkMode ? "text-blue-100/80" : "text-blue-900/80"}`}
                    >
                      You can access materials without creating an account for
                      this semester, but please create your profile before next
                      semester.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setShowSignUpModal(true);
                        }}
                        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                      >
                        Create Profile
                      </button>
                      <button
                        onClick={() => setShowSignInModal(true)}
                        className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${isDarkMode ? "bg-[#2f3336] text-white hover:bg-[#38444d]" : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"}`}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                )}
                <Suspense fallback={
                  <div className="flex justify-center py-16">
                    <div className={`w-8 h-8 rounded-full border-4 border-t-[#1e9df1] animate-spin ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`} />
                  </div>
                }>
                  <>
                  {selectedDriveCourse ? (
                    <GDriveCourseView
                      courseCode={selectedDriveCourse.courseCode}
                      courseName={selectedDriveCourse.courseName}
                      folderId={selectedDriveCourse.folderId}
                      folderLink={selectedDriveCourse.folderLink}
                      onBack={() => setSelectedDriveCourse(null)}
                      onFileClick={(file) => {
                        const material: Material = {
                          id: file.id,
                          title: file.name,
                          description: `Size: ${formatBytes(file.size || 0)}`,
                          file_url: file.webViewLink || file.webContentLink || "",
                          video_url: null,
                          type: getMimeTypeCategory(file.mimeType),
                          course_code: selectedDriveCourse.courseCode,
                          size: file.size ? formatBytes(file.size) : null,
                          created_at: new Date().toISOString(),
                        };
                        openMaterialViewer(material);
                      }}
                      isDarkMode={isDarkMode}
                    />
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="relative inline-block mb-6">
                          <img src="/image.png" alt="Edu51Portal Logo" className="h-20 w-20 mx-auto object-contain" />
                          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 blur-lg"></div>
                        </div>
                        <h2 className={`text-3xl font-bold mb-4 transition-colors duration-300 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                          {activeMajor === "AI" ? "🤖 AI Section"
                            : activeMajor === "Software Engineering" ? "💻 Software Engineering Section"
                            : activeMajor === "Networking" ? "🌐 Networking Section"
                            : "Department of CSE"}{" "}- Intake 51
                        </h2>
                        <p className={`text-lg transition-colors duration-300 ${isDarkMode ? "text-[#71767b]" : "text-gray-700"}`}>
                          {activeMajor ? `${activeMajor} Major` : "Pick your major below"}{" "}• Choose a course to access materials
                        </p>
                      </div>
                      <GDriveFolderBrowser
                        userMajor={activeMajor}
                        isDarkMode={isDarkMode}
                        onCourseSelect={(course) => {
                          setSelectedDriveCourse({
                            courseCode: course.code,
                            courseName: course.name,
                            folderId: course.folderId,
                            folderLink: course.folderLink,
                          });
                        }}
                        onReady={() => {
                          if (_welcomeShown.current) return;
                          _welcomeShown.current = true;
                          const title =
                            activeMajor === "AI" ? "Artificial Intelligence"
                            : activeMajor === "Software Engineering" ? "Software Engineering"
                            : activeMajor === "Networking" ? "Networking"
                            : activeMajor || "your section";
                          showMajorAccessNotification("success", `Welcome to ${title}!`);
                        }}
                      />
                    </>
                  )}
                  </>
                </Suspense>
              </div>
            )}

            {/* Course Materials View */}
            {currentView === "course" && selectedCourse && (
              <div className="space-y-4 sm:space-y-6 md:space-y-8 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-2 sm:px-0">
                  <h2
                    className={`text-2xl sm:text-3xl md:text-4xl font-bold transition-colors duration-300 ${
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    {selectedCourse.name}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-blue-900/50 text-blue-300"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {selectedCourse.code}
                  </span>
                </div>
                <p
                  className={`text-sm sm:text-base md:text-lg select-text transition-colors duration-300 px-2 sm:px-0 ${
                    isDarkMode ? "text-[#71767b]" : "text-gray-600"
                  }`}
                >
                  {selectedCourse.description}
                </p>

                {/* Exam Period Tabs - Modern Design */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8 md:mb-10 px-2 sm:px-0 w-full">
                  {/* Midterm Button */}
                  <button
                    onClick={() => setSelectedExamPeriod("midterm")}
                    className={`flex-1 relative group overflow-hidden rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
                      selectedExamPeriod === "midterm"
                        ? isDarkMode
                          ? "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-2xl shadow-blue-500/50"
                          : "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-400/50"
                        : isDarkMode
                          ? "bg-[#16181c]/80 border border-[#2f3336] text-[#8b98a5] hover:border-blue-500/50 hover:bg-[#16181c]"
                          : "bg-gray-100/80 border border-gray-200 text-gray-700 hover:border-[#1e9df1] hover:bg-gray-200"
                    }`}
                  >
                    {/* Animated background for active state */}
                    {selectedExamPeriod === "midterm" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                    )}
                    <div className="relative flex items-center justify-center space-x-2.5 py-3 sm:py-4 px-4">
                      <div
                        className={`transition-transform duration-300 ${selectedExamPeriod === "midterm" ? "scale-110" : "scale-100"}`}
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <span>Midterm Materials</span>
                    </div>
                  </button>

                  {/* Final Button */}
                  <button
                    onClick={() => setSelectedExamPeriod("final")}
                    className={`flex-1 relative group overflow-hidden rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
                      selectedExamPeriod === "final"
                        ? isDarkMode
                          ? "bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white shadow-2xl shadow-pink-500/50"
                          : "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600 text-white shadow-2xl shadow-pink-400/50"
                        : isDarkMode
                          ? "bg-[#16181c]/80 border border-[#2f3336] text-[#8b98a5] hover:border-purple-500/50 hover:bg-[#16181c]"
                          : "bg-gray-100/80 border border-gray-200 text-gray-700 hover:border-purple-400 hover:bg-gray-200"
                    }`}
                  >
                    {/* Animated background for active state */}
                    {selectedExamPeriod === "final" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                    )}
                    <div className="relative flex items-center justify-center space-x-2.5 py-3 sm:py-4 px-4">
                      <div
                        className={`transition-transform duration-300 ${selectedExamPeriod === "final" ? "scale-110" : "scale-100"}`}
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <span>Final Materials</span>
                    </div>
                  </button>
                </div>


                {loading ? (
                  <div className="text-center py-8">
                    <div
                      className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto border-[#1e9df1]`}
                    ></div>
                    <p
                      className={`mt-2 transition-colors duration-300 ${
                        isDarkMode ? "text-[#71767b]" : "text-gray-600"
                      }`}
                    >
                      Loading materials...
                    </p>
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText
                      className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${
                        isDarkMode ? "text-slate-500" : "text-[#71767b]"
                      }`}
                    />
                    <h3
                      className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      No {selectedExamPeriod} materials found
                    </h3>
                    <p
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "text-[#71767b]" : "text-gray-600"
                      }`}
                    >
                      No materials have been uploaded for {selectedExamPeriod}{" "}
                      exam yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-7 px-2 sm:px-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                      <div
                        className={`flex-shrink-0 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-colors duration-300 ${
                          isDarkMode ? "bg-green-900/50" : "bg-green-100"
                        }`}
                      >
                        <Upload
                          className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                            isDarkMode ? "text-green-400" : "text-green-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`text-base sm:text-lg md:text-xl font-bold transition-colors duration-300 ${
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          }`}
                        >
                          📁 Uploaded{" "}
                          {selectedExamPeriod.charAt(0).toUpperCase() +
                            selectedExamPeriod.slice(1)}{" "}
                          Materials
                        </h3>
                        <p
                          className={`text-xs sm:text-sm md:text-base transition-colors duration-300 ${
                            isDarkMode ? "text-[#71767b]" : "text-gray-600"
                          }`}
                        >
                          Materials uploaded for {selectedExamPeriod} exam
                          preparation
                        </p>
                      </div>
                    </div>

                    {filteredMaterials.map((material, index) => {
                      const materialScheme = getMaterialColorScheme(index);
                      return (
                        <div
                          key={material.id}
                          className={`rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border backdrop-blur-sm p-4 sm:p-5 md:p-6 lg:p-8 hover:shadow-lg sm:hover:shadow-2xl transition-all duration-300 transform hover:sm:-translate-y-1 md:hover:-translate-y-2 ${
                            isDarkMode
                              ? "bg-gradient-to-br from-gray-800 via-gray-900 to-slate-900 border-[#2f3336]/50"
                              : `bg-gradient-to-br ${materialScheme.bg} border-white/20`
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-5 md:gap-6">
                            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 md:gap-5 lg:gap-6 flex-1 min-w-0">
                              <div
                                className={`flex-shrink-0 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl shadow-md sm:shadow-lg transform rotate-0 sm:rotate-1 md:rotate-3 bg-gradient-to-r ${materialScheme.accent} text-white`}
                              >
                                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8">
                                  {getTypeIcon(material.type)}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3
                                  className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 md:mb-3 break-words transition-all cursor-pointer ${
                                    isDarkMode
                                      ? "text-gray-100 hover:text-blue-400"
                                      : "text-gray-900 hover:text-blue-600"
                                  }`}
                                >
                                  {material.title}
                                </h3>
                                <p
                                  className={`text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 md:mb-5 leading-relaxed line-clamp-2 transition-colors duration-300 ${
                                    isDarkMode
                                      ? "text-[#8b98a5]"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {material.description}
                                </p>

                                <div className="flex flex-wrap gap-2 sm:gap-2.5 md:gap-3 text-xs sm:text-xs md:text-sm">
                                  <div
                                    className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg sm:rounded-lg md:rounded-xl font-semibold transition-colors duration-300 whitespace-nowrap ${
                                      isDarkMode
                                        ? "bg-blue-900/40 text-blue-300"
                                        : `bg-gradient-to-r ${materialScheme.accent} bg-opacity-20 text-gray-800`
                                    }`}
                                  >
                                    Type: {material.type}
                                  </div>
                                  {material.size && (
                                    <div
                                      className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg sm:rounded-lg md:rounded-xl font-semibold transition-colors duration-300 whitespace-nowrap ${
                                        isDarkMode
                                          ? "bg-[#2f3336]/50 text-[#8b98a5]"
                                          : "bg-gradient-to-r from-gray-100 to-slate-200 text-gray-800"
                                      }`}
                                    >
                                      Size: {material.size}
                                    </div>
                                  )}
                                  <div
                                    className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg sm:rounded-lg md:rounded-xl font-semibold transition-colors duration-300 whitespace-nowrap ${
                                      isDarkMode
                                        ? "bg-emerald-900/40 text-emerald-300"
                                        : "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800"
                                    }`}
                                  >
                                    {new Date(
                                      material.created_at,
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                              {/* Preview Button - Opens in Modal */}
                              {material.type === "video" &&
                              material.video_url ? (
                                <button
                                  onClick={() => openMaterialViewer(material)}
                                  className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 ${
                                    isDarkMode
                                      ? "text-[#71767b] hover:text-red-400 hover:bg-red-900/30"
                                      : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                                  }`}
                                  title="Watch Video"
                                >
                                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                                </button>
                              ) : material.file_url ? (
                                <button
                                  onClick={() => openMaterialViewer(material)}
                                  className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 ${
                                    isDarkMode
                                      ? "text-[#71767b] hover:text-blue-400 hover:bg-blue-900/30"
                                      : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                  }`}
                                  title="Preview File"
                                >
                                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                                </button>
                              ) : (
                                <button
                                  className={`p-2 sm:p-2.5 cursor-not-allowed rounded-lg sm:rounded-xl ${
                                    isDarkMode
                                      ? "text-gray-600"
                                      : "text-[#8b98a5]"
                                  }`}
                                  title="No preview available"
                                  disabled
                                >
                                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                                </button>
                              )}

                              {/* Download Button */}
                              {material.file_url ? (
                                <a
                                  href={material.file_url}
                                  download
                                  className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 ${
                                    isDarkMode
                                      ? "text-[#71767b] hover:text-[#1e9df1] hover:bg-[#1e9df1]/10"
                                      : "text-gray-500 hover:text-[#1e9df1] hover:bg-[#1e9df1]/5"
                                  }`}
                                  title="Download File"
                                >
                                  <Download className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                                </a>
                              ) : (
                                <button
                                  className={`p-2 sm:p-2.5 cursor-not-allowed rounded-lg sm:rounded-xl ${
                                    isDarkMode
                                      ? "text-gray-600"
                                      : "text-[#8b98a5]"
                                  }`}
                                  title="No file to download"
                                  disabled
                                >
                                  <Download className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Policy Page */}
            {currentView === "privacy" && (
              <div className="space-y-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div
                      className={`rounded-3xl shadow-xl p-4 transition-colors duration-300 ${
                        isDarkMode ? "bg-[#16181c]" : "bg-white"
                      }`}
                    >
                      <img
                        src="/image.png"
                        alt="BUBT Logo"
                        className="h-16 w-16 object-contain"
                      />
                    </div>
                  </div>
                  <h1
                    className={`text-3xl sm:text-4xl font-bold mb-4 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    Privacy Policy
                  </h1>
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-[#71767b]" : "text-gray-600"
                    }`}
                  >
                    Last updated:{" "}
                    {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* Privacy Content */}
                <div
                  className={`rounded-2xl shadow-xl p-6 sm:p-8 transition-colors duration-300 ${
                    isDarkMode ? "bg-[#16181c]" : "bg-white"
                  }`}
                >
                  <div className="space-y-6">
                    {/* Introduction */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Introduction
                      </h2>
                      <p
                        className={`leading-relaxed transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        Welcome to Edu
                        <span className="text-[#ef4444] font-bold">51</span>Portal.
                        This Privacy Policy explains how we collect, use,
                        disclose, and safeguard your information when you use
                        our academic portal designed for BUBT (Bangladesh
                        University of Business & Technology) Intake 51, Section
                        5, CSE students.
                      </p>
                    </section>

                    {/* Information We Collect */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Information We Collect
                      </h2>
                      <div className="space-y-3">
                        <h3
                          className={`text-lg font-semibold transition-colors duration-300 ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          Personal Information
                        </h3>
                        <ul
                          className={`list-disc list-inside space-y-2 ml-4 transition-colors duration-300 ${
                            isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                          }`}
                        >
                          <li>
                            Student information (name, BUBT student ID, section)
                          </li>
                          <li>
                            Email addresses (BUBT email and notification email)
                          </li>
                          <li>
                            Google account information (when using Google Drive
                            integration)
                          </li>
                          <li>
                            Profile information (major, phone number, profile
                            picture)
                          </li>
                        </ul>
                      </div>
                    </section>

                    {/* How We Use Your Information */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        How We Use Your Information
                      </h2>
                      <ul
                        className={`list-disc list-inside space-y-2 ml-4 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        <li>
                          To provide access to course materials and academic
                          resources
                        </li>
                        <li>
                          To send academic notifications and important
                          announcements
                        </li>
                        <li>To track semester progress and exam schedules</li>
                        <li>
                          To manage user authentication and access control
                        </li>
                        <li>To improve our platform and user experience</li>
                      </ul>
                    </section>

                    {/* Google Drive Integration */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Google Drive Integration
                      </h2>
                      <p
                        className={`leading-relaxed mb-3 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        Our platform integrates with Google Drive to:
                      </p>
                      <ul
                        className={`list-disc list-inside space-y-2 ml-4 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        <li>
                          Allow administrators to upload study materials,
                          lecture slides, and exam resources
                        </li>
                        <li>
                          Provide students with access to shared course
                          materials
                        </li>
                        <li>
                          Display PDF previews and video content directly in the
                          platform
                        </li>
                      </ul>
                      <p
                        className={`leading-relaxed mt-3 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        We only request the minimum necessary permissions for
                        Google Drive access. We do not access your personal
                        Google Drive files outside of the shared course
                        materials.
                      </p>
                    </section>

                    {/* Third-Party Services */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Third-Party Services
                      </h2>
                      <p
                        className={`leading-relaxed mb-3 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        We use the following third-party services:
                      </p>
                      <ul
                        className={`list-disc list-inside space-y-2 ml-4 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        <li>
                          <strong>Supabase:</strong> Database and authentication
                          services
                        </li>
                        <li>
                          <strong>Google Drive:</strong> File storage and
                          delivery
                        </li>
                        <li>
                          <strong>Resend:</strong> Email notification delivery
                        </li>
                        <li>
                          <strong>Vercel:</strong> Hosting and deployment
                        </li>
                      </ul>
                    </section>

                    {/* Data Security */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Data Security
                      </h2>
                      <p
                        className={`leading-relaxed transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        We implement appropriate security measures to protect
                        your personal information. However, no method of
                        transmission over the internet is 100% secure. We use
                        industry-standard encryption and secure protocols for
                        data transmission and storage.
                      </p>
                    </section>

                    {/* Your Rights */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Your Rights
                      </h2>
                      <p
                        className={`leading-relaxed mb-3 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        You have the right to:
                      </p>
                      <ul
                        className={`list-disc list-inside space-y-2 ml-4 transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        <li>Access and update your personal information</li>
                        <li>Opt-out of email notifications</li>
                        <li>Request deletion of your account and data</li>
                        <li>Withdraw consent for data processing</li>
                      </ul>
                    </section>

                    {/* Contact Information */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Contact Us
                      </h2>
                      <p
                        className={`leading-relaxed transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        If you have any questions about this Privacy Policy or
                        your data, please contact us at:
                      </p>
                      <div
                        className={`mt-4 p-4 rounded-lg transition-colors duration-300 ${
                          isDarkMode ? "bg-[#2f3336]" : "bg-gray-100"
                        }`}
                      >
                        <p
                          className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          Email:{" "}
                          <a
                            href="mailto:edu51five@gmail.com"
                            className="text-blue-500 hover:underline inline-block px-2 py-1 min-h-[24px]"
                          >
                            edu51five@gmail.com
                          </a>
                        </p>
                        <p
                          className={`mt-2 transition-colors duration-300 ${
                            isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                          }`}
                        >
                          Organization: BUBT · Intake 51, Section 2 (AI)
                        </p>
                      </div>
                    </section>

                    {/* Changes to Privacy Policy */}
                    <section>
                      <h2
                        className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        Changes to This Privacy Policy
                      </h2>
                      <p
                        className={`leading-relaxed transition-colors duration-300 ${
                          isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                        }`}
                      >
                        We may update this Privacy Policy from time to time. We
                        will notify you of any changes by posting the new
                        Privacy Policy on this page and updating the "Last
                        updated" date.
                      </p>
                    </section>
                  </div>
                </div>

                {/* Back to Home Button */}
                <div className="flex justify-center pb-8">
                  <button
                    onClick={() => goToView("home")}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    } shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}

            {/* Terms & Conditions Page */}
            {currentView === "terms" && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className={`rounded-3xl shadow-xl p-4 transition-colors duration-300 ${isDarkMode ? "bg-[#16181c]" : "bg-white"}`}>
                      <img src="/image.png" alt="BUBT Logo" className="h-16 w-16 object-contain" />
                    </div>
                  </div>
                  <h1 className={`text-3xl sm:text-4xl font-bold mb-4 transition-colors duration-300 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                    Terms &amp; Conditions
                  </h1>
                  <p className={`text-sm transition-colors duration-300 ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}>
                    Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>

                <div className={`rounded-2xl border shadow-sm transition-colors duration-300 ${isDarkMode ? "bg-[#16181c]/50 border-[#2f3336]" : "bg-white border-gray-200"}`}>
                  <div className="space-y-8 p-6 sm:p-8">
                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>1. Acceptance of Terms</h2>
                      <p className={`leading-relaxed ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        By accessing and using Edu51Portal, you accept and agree to be bound by these Terms &amp; Conditions. This platform is exclusively for students, faculty, and staff of BUBT Intake 51, CSE Department. If you do not agree to these terms, please do not use this platform.
                      </p>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>2. Eligibility</h2>
                      <p className={`leading-relaxed mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>To use Edu51Portal, you must:</p>
                      <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        <li>Be enrolled as a student in BUBT Intake 51 (CSE Department) or be affiliated faculty/staff</li>
                        <li>Provide accurate registration information including your student ID, section, and major</li>
                        <li>Maintain the confidentiality of your account credentials</li>
                        <li>Be at least 17 years of age</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>3. Permitted Use</h2>
                      <p className={`leading-relaxed mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>You may use Edu51Portal to:</p>
                      <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        <li>Access course materials, lecture notes, and academic resources</li>
                        <li>View and track exam schedules, semester routines, and academic notices</li>
                        <li>Collaborate with classmates through team features and shared resources</li>
                        <li>Communicate via team chat and network features for academic purposes</li>
                        <li>Upload and share study materials relevant to your coursework</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>4. Prohibited Activities</h2>
                      <p className={`leading-relaxed mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>You must not:</p>
                      <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        <li>Share account credentials or allow unauthorized access to your account</li>
                        <li>Upload harmful, offensive, or copyrighted content without permission</li>
                        <li>Use the platform for commercial purposes or spam</li>
                        <li>Attempt to hack, disrupt, or reverse-engineer any part of the platform</li>
                        <li>Impersonate another student, faculty member, or staff</li>
                        <li>Share exam answers or engage in academic dishonesty through the platform</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>5. Content Ownership</h2>
                      <p className={`leading-relaxed ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        Course materials, notices, and resources uploaded by faculty remain the intellectual property of the respective creators and BUBT. Student-uploaded content remains owned by the student but grants Edu51Portal a non-exclusive license to host and display it to authorized users. The Edu51Portal platform, design, and codebase are the property of the developer.
                      </p>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>6. Account Termination</h2>
                      <p className={`leading-relaxed ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        We reserve the right to suspend or terminate your account if you violate these terms, engage in misconduct, or if you are no longer affiliated with BUBT Intake 51. You may request account deletion at any time by contacting support.
                      </p>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>7. Disclaimer of Warranties</h2>
                      <p className={`leading-relaxed ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        Edu51Portal is provided "as is" for academic use. While we strive for accuracy, we do not guarantee that all course materials, schedules, or notices are error-free. Always verify critical academic information (exam dates, results) through official BUBT channels.
                      </p>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>8. Changes to Terms</h2>
                      <p className={`leading-relaxed ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        We may update these Terms &amp; Conditions from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. Significant changes will be announced via the platform's notice board.
                      </p>
                    </section>

                    <section>
                      <h2 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>9. Contact</h2>
                      <p className={`leading-relaxed mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                        For questions about these Terms &amp; Conditions, contact us at:
                      </p>
                      <div className={`p-4 rounded-lg ${isDarkMode ? "bg-[#2f3336]" : "bg-gray-100"}`}>
                        <p className={isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}>
                          Email:{" "}
                          <a href="mailto:edu51five@gmail.com" className="text-blue-500 hover:underline">edu51five@gmail.com</a>
                        </p>
                        <p className={`mt-2 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}>
                          Organization: BUBT · Intake 51, Section 2 (AI)
                        </p>
                      </div>
                    </section>
                  </div>
                </div>

                <div className="flex justify-center pb-8">
                  <button
                    onClick={() => goToView("home")}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    } shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}

            {/* Admin Dashboard - New Redesigned */}
            {isAdmin && currentView === "admin" && (
              <AdminDashboard
                isDarkMode={isDarkMode}
                coursesCount={courses.length}
                materialsCount={totalMaterialsCount}
                onlineUsers={activeUsersCount}
                currentWeek={semesterStatus.semesterWeek}
                totalWeeks={20}
                storageBytes={adminStats?.storage_bytes ?? 0}
                storageByBucket={adminStats?.storage_by_bucket ?? []}
                usersCount={adminStats?.users ?? 0}
                teamsCount={adminStats?.teams ?? 0}
                adminUsers={adminUsers}
                adminUsersLoading={adminUsersLoading}
                currentUserId={authSession?.user?.id ?? null}
                onToggleUserAdmin={handleToggleUserAdmin}
                feedbackItems={feedbackItems}
                feedbackLoading={feedbackLoading}
                onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
                onRefreshFeedback={loadFeedback}
                notices={notices}
                onEditNotice={() => {
                  if (notices.length > 0) {
                    // Set the first active notice for editing
                    const firstNotice = notices[0];
                    setSelectedNotice(firstNotice);
                    setNewNotice({
                      title: firstNotice.title,
                      content: firstNotice.content,
                      type: firstNotice.type,
                      category: firstNotice.category,
                      priority: firstNotice.priority,
                      exam_type: firstNotice.exam_type || null,
                      event_date: firstNotice.event_date || "",
                      is_active: firstNotice.is_active,
                      attachment_url: firstNotice.attachment_url || null,
                      attachment_type: firstNotice.attachment_type || null,
                    });
                    setRoutineFile(null);
                    setIsEditingNotice(true);
                    setEditingNoticeId(firstNotice.id);
                    setShowCreateNotice(true);
                  } else {
                    alert("No notices to edit. Create one first.");
                  }
                }}
                onCreateNotice={() => setShowCreateNotice(true)}
                onDeleteNotice={handleDeleteNotice}
                broadcastPush={broadcastPush}
                onBroadcastPushChange={setBroadcastPush}
                onSendBroadcast={handleSendBroadcastNotification}
                isSendingBroadcast={isSendingBroadcast}
                onPreviewFile={(url, name) => {
                  setCurrentFileUrl(url);
                  setCurrentFileName(name);
                  setShowFileViewer(true);
                }}
              />
            )}

            {/* OLD ADMIN DASHBOARD CODE - HIDDEN FOR FUTURE USE */}
            {false && isAdmin && currentView === "admin" && (
              <div
                className={`min-h-screen ${isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-slate-50 to-blue-50"}`}
              >
                {/* Modern Header */}
                <div
                  className={`${isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-gray-200"} shadow-sm border-b`}
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                      <div className="order-1">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Admin Dashboard
                        </h1>
                        <p
                          className={`${isDarkMode ? "text-[#8b98a5]" : "text-gray-600"} mt-2 text-sm sm:text-base`}
                        >
                          Manage your educational platform with ease
                        </p>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span
                              className={
                                isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                              }
                            >
                              {courses.length} Courses
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span
                              className={
                                isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                              }
                            >
                              {materials.length} Materials
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                            <span
                              className={
                                isDarkMode ? "text-[#8b98a5]" : "text-gray-700"
                              }
                            >
                              {activeNotices.length} Active Notices
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 order-2">
                        {/* Add Course button - DEPRECATED: Courses now from Google Drive folders */}
                        <button
                          onClick={() => setShowCreateCourse(true)}
                          style={{ display: "none" }}
                          className="group flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <Plus className="h-4 sm:h-5 w-4 sm:w-5 group-hover:rotate-90 transition-transform duration-200" />
                          <span className="font-medium text-sm sm:text-base">
                            Add Course
                          </span>
                        </button>
                        <button
                          onClick={() => setShowUploadFile(true)}
                          className="group flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <Upload className="h-4 sm:h-5 w-4 sm:w-5 group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium text-sm sm:text-base">
                            Upload Material
                          </span>
                        </button>
                        <button
                          onClick={() => setShowCreateNotice(true)}
                          className="group flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-700 text-white rounded-xl hover:from-purple-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <Bell className="h-4 sm:h-5 w-4 sm:w-5 group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium text-sm sm:text-base">
                            Create Smart Notice
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
                  {/* Quick Navigation Card */}
                  <div
                    className={`${isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-gray-100"} rounded-2xl shadow-sm border p-4 sm:p-6`}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div
                        className={`w-10 h-10 ${isDarkMode ? "bg-blue-900/50" : "bg-blue-100"} rounded-xl flex items-center justify-center`}
                      >
                        <svg
                          className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <h3
                        className={`text-lg font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
                      >
                        Quick Actions
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {/* Manage Courses - HIDDEN */}
                      {false && (
                        <a
                          href="#courses-section"
                          className={`group p-4 border rounded-xl transition-all duration-200 ${
                            isDarkMode
                              ? "border-[#2f3336] hover:border-blue-500 hover:bg-blue-900/30"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isDarkMode
                                  ? "bg-blue-900/50 group-hover:bg-blue-900"
                                  : "bg-blue-100 group-hover:bg-blue-200"
                              }`}
                            >
                              <span
                                className={`font-semibold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                              >
                                📚
                              </span>
                            </div>
                            <span
                              className={`font-medium text-sm sm:text-base ${
                                isDarkMode
                                  ? "text-[#8b98a5] group-hover:text-blue-400"
                                  : "text-gray-700 group-hover:text-blue-700"
                              }`}
                            >
                              Manage Courses
                            </span>
                          </div>
                        </a>
                      )}
                      {/* Manage Materials - HIDDEN */}
                      {false && (
                        <a
                          href="#materials-section"
                          className={`group p-4 border rounded-xl transition-all duration-200 ${
                            isDarkMode
                              ? "border-[#2f3336] hover:border-emerald-500 hover:bg-emerald-900/30"
                              : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isDarkMode
                                  ? "bg-emerald-900/50 group-hover:bg-emerald-900"
                                  : "bg-emerald-100 group-hover:bg-emerald-200"
                              }`}
                            >
                              <span
                                className={`font-semibold ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                              >
                                🗂️
                              </span>
                            </div>
                            <span
                              className={`font-medium text-sm sm:text-base ${
                                isDarkMode
                                  ? "text-[#8b98a5] group-hover:text-emerald-400"
                                  : "text-gray-700 group-hover:text-emerald-700"
                              }`}
                            >
                              Manage Materials
                            </span>
                          </div>
                        </a>
                      )}
                      <a
                        href="#notices-section"
                        className={`group p-4 border rounded-xl transition-all duration-200 ${
                          isDarkMode
                            ? "border-[#2f3336] hover:border-purple-500 hover:bg-purple-900/30"
                            : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isDarkMode
                                ? "bg-purple-900/50 group-hover:bg-purple-900"
                                : "bg-purple-100 group-hover:bg-purple-200"
                            }`}
                          >
                            <span
                              className={`font-semibold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
                            >
                              📢
                            </span>
                          </div>
                          <span
                            className={`font-medium text-sm sm:text-base ${
                              isDarkMode
                                ? "text-[#8b98a5] group-hover:text-purple-400"
                                : "text-gray-700 group-hover:text-purple-700"
                            }`}
                          >
                            Manage Notices
                          </span>
                        </div>
                      </a>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-6 rounded-2xl text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-xs sm:text-sm font-medium">
                            Total Courses
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mt-1">
                            {courses.length}
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-400 bg-opacity-50 rounded-xl flex items-center justify-center">
                          <span className="text-xl sm:text-2xl">📚</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-6 rounded-2xl text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-emerald-100 text-xs sm:text-sm font-medium">
                            Total Materials
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mt-1">
                            {totalMaterialsCount}
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-400 bg-opacity-50 rounded-xl flex items-center justify-center">
                          <span className="text-xl sm:text-2xl">📁</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 sm:p-6 rounded-2xl text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-xs sm:text-sm font-medium">
                            Active Notices
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mt-1">
                            {activeNotices.length}
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-400 bg-opacity-50 rounded-xl flex items-center justify-center">
                          <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-purple-100" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Broadcast Push Notification Section */}
                  <div
                    className={`${isDarkMode ? "bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-700" : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200"} rounded-2xl shadow-lg border p-4 sm:p-6`}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div
                        className={`w-10 h-10 ${isDarkMode ? "bg-indigo-800/50" : "bg-indigo-100"} rounded-xl flex items-center justify-center`}
                      >
                        <Bell
                          className={`w-5 h-5 ${isDarkMode ? "text-indigo-300" : "text-indigo-600"}`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                        >
                          📢 Broadcast Push Notification
                        </h3>
                        <p
                          className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                        >
                          Send instant notifications to all subscribed users
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                          >
                            Notification Title
                          </label>
                          <input
                            type="text"
                            value={broadcastPush.title}
                            onChange={(e) =>
                              setBroadcastPush({
                                ...broadcastPush,
                                title: e.target.value,
                              })
                            }
                            placeholder="e.g., New Study Material Uploaded"
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDarkMode
                                ? "bg-[#16181c] border-gray-600 text-gray-100 placeholder-gray-400"
                                : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                            }`}
                          />
                        </div>

                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                          >
                            Open URL (optional)
                          </label>
                          <input
                            type="text"
                            value={broadcastPush.url}
                            onChange={(e) =>
                              setBroadcastPush({
                                ...broadcastPush,
                                url: e.target.value,
                              })
                            }
                            placeholder="/course/CSE-319 or /"
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDarkMode
                                ? "bg-[#16181c] border-gray-600 text-gray-100 placeholder-gray-400"
                                : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                        >
                          Message Body
                        </label>
                        <textarea
                          value={broadcastPush.body}
                          onChange={(e) =>
                            setBroadcastPush({
                              ...broadcastPush,
                              body: e.target.value,
                            })
                          }
                          placeholder="Check out the new CSE-319 notes uploaded in the Notes section!"
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDarkMode
                              ? "bg-[#16181c] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p
                          className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                        >
                          💡 Requires Edge Function with VAPID keys configured
                        </p>
                        <button
                          onClick={handleSendBroadcastNotification}
                          disabled={
                            isSendingBroadcast ||
                            !broadcastPush.title ||
                            !broadcastPush.body
                          }
                          className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                            isSendingBroadcast ||
                            !broadcastPush.title ||
                            !broadcastPush.body
                              ? isDarkMode
                                ? "bg-[#2f3336] text-[#71767b] cursor-not-allowed"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : isDarkMode
                                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl"
                          }`}
                        >
                          {isSendingBroadcast
                            ? "⏳ Sending..."
                            : "🚀 Send to All Subscribers"}
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* Courses List - Modern Design - HIDDEN FOR NOW */}
                  {false && (
                    <div
                      id="courses-section"
                      className={`rounded-3xl shadow-xl border backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-10 responsive-container ${
                        isDarkMode
                          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-[#2f3336]"
                          : "bg-gradient-to-br from-white via-gray-50 to-blue-50 border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-responsive">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 ui-element">
                            <span className="text-white font-bold no-select text-lg">
                              📚
                            </span>
                          </div>
                          <h3
                            className={`responsive-text-xl font-bold no-select ml-4 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            Course Management
                          </h3>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {courses.map((course, index) => {
                          const colorScheme = getCourseColorScheme(
                            course.code,
                            index,
                          );
                          return (
                            <div
                              key={course.id}
                              className={`group p-6 md:p-8 border-l-4 rounded-2xl shadow-lg hover:shadow-2xl smooth-card ui-element transition-all duration-300 transform hover:-translate-y-1 ${
                                isDarkMode
                                  ? "bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600 hover:border-blue-500"
                                  : `bg-gradient-to-r ${colorScheme.bgGradient} border-${colorScheme.accent} hover:border-purple-500`
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4
                                    className={`font-bold responsive-text-xl group-hover:bg-gradient-to-r group-hover:${colorScheme.textGradient} group-hover:bg-clip-text transition-all duration-300 no-select ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    {course.name}
                                  </h4>
                                  <p
                                    className={`font-semibold mt-2 no-select ${colorScheme.badge} px-3 py-1 rounded-full inline-block text-sm`}
                                  >
                                    {course.code}
                                  </p>
                                  <p
                                    className={`responsive-text-base mt-3 select-text leading-relaxed ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}
                                  >
                                    {course.description}
                                  </p>
                                </div>
                                <div className="text-right ml-8">
                                  <div className="flex items-center space-x-3 mb-4">
                                    <div
                                      className={`w-10 h-10 bg-gradient-to-r ${colorScheme.gradient} rounded-2xl flex items-center justify-center shadow-lg`}
                                    >
                                      <span className="text-white text-sm font-bold">
                                        {
                                          materials.filter(
                                            (m) =>
                                              m.course_code === course.code,
                                          ).length
                                        }
                                      </span>
                                    </div>
                                    <span
                                      className={`font-semibold ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}
                                    >
                                      materials
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleCourseClick(course)}
                                    className={`inline-flex items-center px-6 py-3 bg-gradient-to-r ${colorScheme.gradient} text-white rounded-xl hover:shadow-xl transition-all duration-300 text-sm font-semibold shadow-lg transform hover:scale-105`}
                                  >
                                    View Materials
                                    <svg
                                      className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {courses.length === 0 && (
                          <div
                            className={`text-center py-12 rounded-xl ${isDarkMode ? "bg-[#16181c]" : ""}`}
                          >
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-[#2f3336]" : "bg-gray-100"}`}
                            >
                              <span className="text-3xl">📚</span>
                            </div>
                            <p
                              className={`text-lg font-medium ${isDarkMode ? "text-[#8b98a5]" : "text-gray-500"}`}
                            >
                              No courses yet
                            </p>
                            <p
                              className={`text-sm mt-1 ${isDarkMode ? "text-[#71767b]" : "text-[#71767b]"}`}
                            >
                              Create your first course to get started
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Materials Management Section - HIDDEN FOR NOW */}
                  {false && (
                    <div
                      id="materials-section"
                      className={`rounded-2xl p-8 shadow-xl border ${
                        isDarkMode
                          ? "bg-gradient-to-br from-gray-900 to-gray-800 border-[#2f3336]"
                          : "bg-gradient-to-br from-white to-gray-50 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                            <FolderOpen className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3
                              className={`text-2xl font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
                            >
                              Materials Library
                            </h3>
                            <p
                              className={
                                isDarkMode ? "text-[#71767b]" : "text-gray-600"
                              }
                            >
                              Manage all uploaded materials ({materials.length}{" "}
                              items)
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-sm px-4 py-2 rounded-full ${
                            isDarkMode
                              ? "text-[#71767b] bg-[#2f3336]"
                              : "text-gray-500 bg-gray-100"
                          }`}
                        >
                          {materials.length > 0
                            ? "Click delete to remove materials"
                            : "No materials uploaded yet"}
                        </div>
                      </div>

                      <div className="grid gap-6">
                        {materials.map((material) => (
                          <div
                            key={material.id}
                            className={`rounded-xl border p-6 hover:shadow-lg transition-all duration-200 ${
                              isDarkMode
                                ? "bg-[#16181c] border-[#2f3336] hover:border-blue-500"
                                : "bg-white border-gray-200 hover:border-blue-200"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 flex items-start space-x-4">
                                <div
                                  className={`p-3 rounded-lg ${isDarkMode ? "bg-[#2f3336]" : "bg-gray-50"}`}
                                >
                                  {(() => {
                                    if (material.type.includes("pdf"))
                                      return (
                                        <FileText
                                          className={`h-5 w-5 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                                        />
                                      );
                                    if (material.type.includes("image"))
                                      return (
                                        <ImageIcon
                                          className={`h-5 w-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                                        />
                                      );
                                    if (material.type.includes("video"))
                                      return (
                                        <Play
                                          className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
                                        />
                                      );
                                    if (
                                      material.type.includes("document") ||
                                      material.type.includes("word")
                                    )
                                      return (
                                        <FileText
                                          className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                                        />
                                      );
                                    return (
                                      <FileText
                                        className={`h-5 w-5 ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                                      />
                                    );
                                  })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className={`font-semibold text-lg mb-1 truncate ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
                                  >
                                    {material.title}
                                  </h4>
                                  <div
                                    className={`flex items-center space-x-4 text-sm mb-2 ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                                  >
                                    <span className="flex items-center">
                                      <BookOpen className="h-4 w-4 mr-1" />
                                      {material.course_code || "Unknown Course"}
                                    </span>
                                    <span className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      {new Date(
                                        material.created_at,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800"}`}
                                    >
                                      {material.type}
                                    </span>
                                    {material.size && (
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? "bg-[#2f3336] text-[#8b98a5]" : "bg-gray-100 text-gray-800"}`}
                                      >
                                        {material.size}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 ml-4">
                                {material.file_url && (
                                  <a
                                    href={material.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View
                                  </a>
                                )}
                                <button
                                  onClick={() =>
                                    handleDeleteMaterial(material.id)
                                  }
                                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  title="Delete this material permanently"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {materials.length === 0 && (
                          <div
                            className={`text-center py-16 rounded-xl ${
                              isDarkMode
                                ? "bg-gradient-to-br from-gray-800 to-gray-700"
                                : "bg-gradient-to-br from-gray-50 to-gray-100"
                            }`}
                          >
                            <div
                              className={`p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center ${
                                isDarkMode
                                  ? "bg-gradient-to-r from-gray-700 to-gray-600"
                                  : "bg-gradient-to-r from-gray-300 to-gray-400"
                              }`}
                            >
                              <FolderOpen className="h-10 w-10 text-white" />
                            </div>
                            <h3
                              className={`text-xl font-bold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
                            >
                              No Materials Found
                            </h3>
                            <p
                              className={`${isDarkMode ? "text-[#71767b]" : "text-gray-600"} text-lg mb-4`}
                            >
                              Upload some materials to see them here
                            </p>
                            <div
                              className={`${isDarkMode ? "text-[#71767b]" : "text-gray-500"} text-sm`}
                            >
                              Materials will appear as beautiful cards with file
                              type indicators
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create Course Modal - DEPRECATED: Courses now come from Google Drive folders */}
            {showCreateCourse && false && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto"
                style={{ height: "100dvh" }}
              >
                <div
                  className="min-h-screen flex items-center justify-center p-4"
                  style={{ minHeight: "100dvh" }}
                >
                  <div
                    className={`relative w-full max-w-[92vw] sm:max-w-md md:max-w-lg max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-[#16181c] border border-[#2f3336]"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {/* Modal Header */}
                    <div
                      className={`flex-shrink-0 p-4 sm:p-5 border-b transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-[#16181c]/95 border-[#2f3336]"
                          : "bg-white/95 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h2
                          className={`text-lg sm:text-xl font-bold flex items-center ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                        >
                          <span className="text-xl sm:text-2xl mr-2">➕</span>
                          <span>Add New Course</span>
                        </h2>
                        <button
                          type="button"
                          onClick={() => setShowCreateCourse(false)}
                          className={`p-2 rounded-xl transition-all duration-300 ${
                            isDarkMode
                              ? "text-[#71767b] hover:text-gray-200 hover:bg-[#2f3336]"
                              : "text-[#71767b] hover:text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Modal Body */}
                    <form
                      onSubmit={handleCreateCourse}
                      className="flex flex-col flex-1 overflow-hidden"
                    >
                      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                        <input
                          type="text"
                          placeholder="Course Name"
                          value={newCourse.name}
                          onChange={(e) =>
                            setNewCourse({ ...newCourse, name: e.target.value })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Course Code"
                          value={newCourse.code}
                          onChange={(e) =>
                            setNewCourse({ ...newCourse, code: e.target.value })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                        />
                        <textarea
                          placeholder="Course Description"
                          value={newCourse.description}
                          onChange={(e) =>
                            setNewCourse({
                              ...newCourse,
                              description: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          rows={3}
                        />
                      </div>

                      {/* Modal Footer */}
                      <div
                        className={`flex-shrink-0 p-4 sm:p-5 border-t transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-[#16181c]/95 border-[#2f3336]"
                            : "bg-white/95 border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setShowCreateCourse(false)}
                            className={`flex-1 px-4 py-2.5 border rounded-lg font-medium text-sm transition-colors ${
                              isDarkMode
                                ? "border-gray-600 text-gray-200 hover:bg-[#2f3336]"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {loading ? "Adding..." : "Add Course"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Upload File Modal */}
            {showUploadFile && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto"
                style={{ height: "100dvh" }}
              >
                <div
                  className="min-h-screen flex items-center justify-center p-4"
                  style={{ minHeight: "100dvh" }}
                >
                  <div
                    className={`relative w-full max-w-[92vw] sm:max-w-md md:max-w-lg max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-[#16181c] border border-[#2f3336]"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {/* Modal Header */}
                    <div
                      className={`flex-shrink-0 p-4 sm:p-5 border-b transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-[#16181c]/95 border-[#2f3336]"
                          : "bg-white/95 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h2
                          className={`text-lg sm:text-xl font-bold flex items-center ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                        >
                          <span className="text-xl sm:text-2xl mr-2">📤</span>
                          <span>Upload Material</span>
                        </h2>
                        <button
                          type="button"
                          onClick={() => setShowUploadFile(false)}
                          className={`p-2 rounded-xl transition-all duration-300 ${
                            isDarkMode
                              ? "text-[#71767b] hover:text-gray-200 hover:bg-[#2f3336]"
                              : "text-[#71767b] hover:text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Modal Body */}
                    <form
                      onSubmit={handleFileUpload}
                      className="flex flex-col flex-1 overflow-hidden"
                    >
                      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                        <select
                          value={newMaterial.course_id}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              course_id: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                        >
                          <option value="">Select Course</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.code}>
                              {course.name} ({course.code})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Material Title"
                          value={newMaterial.title}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              title: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                        />
                        <select
                          value={newMaterial.type}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              type: e.target.value as Material["type"],
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          <option value="pdf">PDF</option>
                          <option value="doc">Document</option>
                          <option value="video">Video</option>
                          <option value="suggestion">Suggestion</option>
                          <option value="past_question">Past Question</option>
                        </select>
                        <select
                          value={newMaterial.exam_period}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              exam_period: e.target.value as
                                | "midterm"
                                | "final",
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                        >
                          <option value="midterm">Midterm Exam</option>
                          <option value="final">Final Exam</option>
                        </select>
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewMaterial({ ...newMaterial, file });
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.avi"
                        />
                        <input
                          type="url"
                          placeholder="Video URL (optional)"
                          value={newMaterial.video_url}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              video_url: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                        <textarea
                          placeholder="Description (optional)"
                          value={newMaterial.description}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              description: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          rows={3}
                        />
                      </div>

                      {/* Modal Footer */}
                      <div
                        className={`flex-shrink-0 p-4 sm:p-5 border-t transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-[#16181c]/95 border-[#2f3336]"
                            : "bg-white/95 border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setShowUploadFile(false)}
                            className={`flex-1 px-4 py-2.5 border rounded-lg font-medium text-sm transition-colors ${
                              isDarkMode
                                ? "border-gray-600 text-gray-200 hover:bg-[#2f3336]"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {loading ? "Uploading..." : "Upload"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Categorized Notice Creation Modal */}
            {showCreateNotice && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto"
                style={{ height: "100dvh" }}
              >
                <div
                  className="min-h-screen flex items-center justify-center p-4"
                  style={{ minHeight: "100dvh" }}
                >
                  <div
                    className={`relative w-full max-w-[92vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-[#16181c] border border-[#2f3336]"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {/* Modal Header - Fixed */}
                    <div
                      className={`flex-shrink-0 p-4 sm:p-5 lg:p-6 border-b transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-[#16181c]/95 border-[#2f3336]"
                          : "bg-white/95 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <h2
                            className={`text-lg sm:text-xl font-bold flex items-center ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                          >
                            <span className="text-xl sm:text-2xl mr-2">📢</span>
                            <span>Create Smart Notice</span>
                          </h2>
                          <p
                            className={`text-xs sm:text-sm mt-1 ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                          >
                            Choose a category and let the system help you create
                            targeted notices
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowCreateNotice(false);
                            setRoutineFile(null);
                            setNewNotice({
                              title: "",
                              content: "",
                              type: "info",
                              category: "announcement",
                              priority: "normal",
                              exam_type: null,
                              event_date: "",
                              is_active: true,
                              attachment_url: null,
                              attachment_type: null,
                            });
                          }}
                          className={`flex-shrink-0 p-2 rounded-xl transition-all duration-300 ${
                            isDarkMode
                              ? "text-[#71767b] hover:text-gray-200 hover:bg-[#2f3336]"
                              : "text-[#71767b] hover:text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Modal Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
                      {/* Section: Category Selection */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <div
                            className={`h-8 w-1 rounded-full mr-3 ${isDarkMode ? "bg-blue-400" : "bg-blue-600"}`}
                          ></div>
                          <h3
                            className={`text-base font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                          >
                            Select Notice Category
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            {
                              value: "announcement",
                              icon: "📢",
                              label: "General",
                              desc: "Regular announcements",
                            },
                            {
                              value: "exam",
                              icon: "📚",
                              label: "Exam",
                              desc: "Exam schedules & updates",
                            },
                            {
                              value: "event",
                              icon: "🎉",
                              label: "Event",
                              desc: "Events & activities",
                            },
                            {
                              value: "information",
                              icon: "ℹ️",
                              label: "Information",
                              desc: "Important information",
                            },
                            {
                              value: "academic",
                              icon: "🎓",
                              label: "Academic",
                              desc: "Academic calendar",
                            },
                            {
                              value: "random",
                              icon: "🎲",
                              label: "Other",
                              desc: "Miscellaneous",
                            },
                          ].map((category) => (
                            <button
                              key={category.value}
                              onClick={() =>
                                setNewNotice({
                                  ...newNotice,
                                  category: category.value as any,
                                })
                              }
                              className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                                newNotice.category === category.value
                                  ? isDarkMode
                                    ? "border-[#1e9df1] bg-blue-900/50 shadow-md"
                                    : "border-blue-500 bg-blue-50 shadow-md"
                                  : isDarkMode
                                    ? "border-gray-600 hover:border-gray-500 hover:bg-[#2f3336]/50"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-lg">{category.icon}</span>
                                <span
                                  className={`font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                >
                                  {category.label}
                                </span>
                              </div>
                              <p
                                className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                              >
                                {category.desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section: Basic Information */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <div
                            className={`h-8 w-1 rounded-full mr-3 ${isDarkMode ? "bg-purple-400" : "bg-purple-600"}`}
                          ></div>
                          <h3
                            className={`text-base font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                          >
                            Basic Information
                          </h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {/* Title with smart suggestions */}
                            <div>
                              <label
                                className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                              >
                                Title
                                {newNotice.category === "exam" && (
                                  <span className="text-xs text-blue-600 ml-2">
                                    (Exam notices get priority display)
                                  </span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={newNotice.title}
                                onChange={(e) =>
                                  setNewNotice({
                                    ...newNotice,
                                    title: e.target.value,
                                  })
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                                placeholder={
                                  newNotice.category === "exam"
                                    ? "Mid-term Exam Schedule Update"
                                    : newNotice.category === "event"
                                      ? "Upcoming Cultural Event"
                                      : newNotice.category === "academic"
                                        ? "Academic Calendar Update"
                                        : newNotice.category === "information"
                                          ? "Important Class Information"
                                          : "Enter notice title..."
                                }
                              />
                            </div>

                            {/* Priority Level */}
                            <div>
                              <label
                                className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                              >
                                Priority Level
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  {
                                    value: "low",
                                    icon: "🟢",
                                    label: "Low",
                                    color: "text-green-600",
                                  },
                                  {
                                    value: "normal",
                                    icon: "🔵",
                                    label: "Normal",
                                    color: "text-blue-600",
                                  },
                                  {
                                    value: "high",
                                    icon: "🟡",
                                    label: "High",
                                    color: "text-yellow-600",
                                  },
                                  {
                                    value: "urgent",
                                    icon: "🔴",
                                    label: "Urgent",
                                    color: "text-red-600",
                                  },
                                ].map((priority) => (
                                  <button
                                    key={priority.value}
                                    onClick={() =>
                                      setNewNotice({
                                        ...newNotice,
                                        priority: priority.value as any,
                                      })
                                    }
                                    className={`p-2 rounded-lg border text-sm transition-all ${
                                      newNotice.priority === priority.value
                                        ? isDarkMode
                                          ? "border-[#1e9df1] bg-blue-900/50"
                                          : "border-blue-500 bg-blue-50"
                                        : isDarkMode
                                          ? "border-gray-600 hover:border-gray-500 hover:bg-[#2f3336]/50"
                                          : "border-gray-200 hover:border-gray-300"
                                    }`}
                                  >
                                    <span className="mr-1">
                                      {priority.icon}
                                    </span>
                                    <span className={priority.color}>
                                      {priority.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Notice Type */}
                            <div>
                              <label
                                className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                              >
                                Visual Style
                              </label>
                              <select
                                value={newNotice.type}
                                onChange={(e) =>
                                  setNewNotice({
                                    ...newNotice,
                                    type: e.target.value as any,
                                  })
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-[#2f3336] border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                              >
                                <option value="info">🔵 Info (Blue)</option>
                                <option value="success">
                                  🟢 Success (Green)
                                </option>
                                <option value="warning">
                                  🟡 Warning (Yellow)
                                </option>
                                <option value="error">🔴 Error (Red)</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Exam-specific fields */}
                            {newNotice.category === "exam" && (
                              <div className="space-y-3">
                                <div>
                                  <label
                                    className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                                  >
                                    Exam Type
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { value: "midterm", label: "Mid-term", icon: "📝" },
                                      { value: "final", label: "Final", icon: "🎯" },
                                    ].map((examType) => (
                                      <button
                                        key={examType.value}
                                        onClick={() =>
                                          setNewNotice({
                                            ...newNotice,
                                            exam_type: examType.value as any,
                                          })
                                        }
                                        className={`p-2 rounded-lg border text-sm transition-all ${
                                          newNotice.exam_type === examType.value
                                            ? isDarkMode
                                              ? "border-orange-400 bg-orange-900/50 text-gray-100"
                                              : "border-orange-500 bg-orange-50"
                                            : isDarkMode
                                              ? "border-gray-600 hover:border-gray-500 hover:bg-[#2f3336]/50 text-gray-200"
                                              : "border-gray-200 hover:border-gray-300"
                                        }`}
                                      >
                                        <span className="mr-1">{examType.icon}</span>
                                        {examType.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Routine attachment (image or PDF) */}
                                {newNotice.exam_type && (
                                  <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                                      Routine Attachment <span className="opacity-60 font-normal">(image or PDF)</span>
                                    </label>
                                    {newNotice.attachment_url && !routineFile ? (
                                      <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${isDarkMode ? "border-gray-600 bg-[#2f3336]/40" : "border-gray-200 bg-gray-50"}`}>
                                        <a href={newNotice.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">
                                          {newNotice.attachment_type === "pdf" ? "📄 Current routine (PDF)" : "🖼️ Current routine (image)"}
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => setNewNotice({ ...newNotice, attachment_url: null, attachment_type: null })}
                                          className="text-xs text-red-500 hover:text-red-600 font-medium flex-shrink-0"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ) : routineFile ? (
                                      <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${isDarkMode ? "border-orange-500/50 bg-orange-900/20" : "border-orange-300 bg-orange-50"}`}>
                                        <span className={`text-sm truncate ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                                          {routineFile.type === "application/pdf" ? "📄" : "🖼️"} {routineFile.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setRoutineFile(null)}
                                          className="text-xs text-red-500 hover:text-red-600 font-medium flex-shrink-0"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ) : (
                                      <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${isDarkMode ? "border-gray-600 hover:border-orange-500 text-[#8b98a5]" : "border-gray-300 hover:border-orange-400 text-gray-600"}`}>
                                        <Upload className="w-4 h-4" />
                                        <span className="text-sm">Upload routine image or PDF</span>
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          className="hidden"
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) setRoutineFile(f);
                                          }}
                                        />
                                      </label>
                                    )}
                                    <p className={`mt-1 text-[11px] ${isDarkMode ? "text-gray-500" : "text-[#71767b]"}`}>
                                      Students will see this attachment in the notice. You can also add details in the message below.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Event-specific fields */}
                            {newNotice.category === "event" && (
                              <div>
                                <label
                                  className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                                >
                                  Event Date
                                </label>
                                <input
                                  type="date"
                                  value={newNotice.event_date || ""}
                                  onChange={(e) =>
                                    setNewNotice({
                                      ...newNotice,
                                      event_date: e.target.value,
                                    })
                                  }
                                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-[#2f3336] border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                                />
                              </div>
                            )}

                            {/* Active toggle */}
                            <div
                              className={`flex items-center p-3 rounded-lg ${isDarkMode ? "bg-[#2f3336]/50" : "bg-gray-50"}`}
                            >
                              <input
                                type="checkbox"
                                id="is_active"
                                checked={newNotice.is_active}
                                onChange={(e) =>
                                  setNewNotice({
                                    ...newNotice,
                                    is_active: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label
                                htmlFor="is_active"
                                className={`ml-2 block text-sm ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                              >
                                📢 Publish immediately (visible to all students)
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Content */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <div
                            className={`h-8 w-1 rounded-full mr-3 ${isDarkMode ? "bg-green-400" : "bg-green-600"}`}
                          ></div>
                          <h3
                            className={`text-base font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                          >
                            Notice Content
                          </h3>
                          {newNotice.category === "exam" &&
                            newNotice.exam_type && (
                              <span
                                className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? "bg-green-900/50 text-green-300 border border-green-700" : "bg-green-100 text-green-700 border border-green-300"}`}
                              >
                                ✅ Template loaded
                              </span>
                            )}
                        </div>
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                          >
                            Notice Content
                          </label>
                          <textarea
                            value={newNotice.content}
                            onChange={(e) =>
                              setNewNotice({
                                ...newNotice,
                                content: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-[#2f3336] border-gray-600 text-gray-100 placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                            rows={6}
                            placeholder={
                              newNotice.category === "exam" &&
                              newNotice.exam_type
                                ? `(Auto-filled - feel free to edit)`
                                : newNotice.category === "exam"
                                  ? "Select exam type above to auto-fill content, or enter custom content here"
                                  : newNotice.category === "event"
                                    ? "Join us for an exciting event! More details will be shared soon."
                                    : "Enter the detailed content of your notice here..."
                            }
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span
                              className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-gray-500"}`}
                            >
                              {newNotice.content.length} characters
                            </span>
                            {newNotice.category === "exam" &&
                              newNotice.exam_type && (
                                <span
                                  className={`text-xs px-2 py-1 rounded ${isDarkMode ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-800"}`}
                                >
                                  🎯{" "}
                                  {newNotice.exam_type === "midterm"
                                    ? "Mid-term"
                                    : "Final"}{" "}
                                  Exam Notice
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer - Fixed */}
                    <div
                      className={`flex-shrink-0 p-4 sm:p-5 lg:p-6 border-t transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-[#16181c]/95 border-[#2f3336]"
                          : "bg-white/95 border-gray-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => {
                            setShowCreateNotice(false);
                            setRoutineFile(null);
                            setNewNotice({
                              title: "",
                              content: "",
                              type: "info",
                              category: "announcement",
                              priority: "normal",
                              exam_type: null,
                              event_date: "",
                              is_active: true,
                              attachment_url: null,
                              attachment_type: null,
                            });
                            setIsEditingNotice(false);
                            setEditingNoticeId(null);
                          }}
                          className={`px-4 py-2.5 border rounded-lg font-medium text-sm transition-colors ${
                            isDarkMode
                              ? "border-gray-600 text-gray-200 hover:bg-[#2f3336]"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={
                            isEditingNotice
                              ? handleUpdateNotice
                              : handleCreateNotice
                          }
                          disabled={!newNotice.title || !newNotice.content || routineUploading}
                          className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                        >
                          {isEditingNotice ? (
                            <>✏️ Update Notice</>
                          ) : (
                            <>
                              🚀 Create{" "}
                              {newNotice.priority === "urgent"
                                ? "Urgent"
                                : newNotice.category === "exam"
                                  ? "Exam"
                                  : "Smart"}{" "}
                              Notice
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notice Modal */}
            {showNoticeModal && selectedNotice && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-[3px] z-[110]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-modal-title"
                onClick={(e) => { if (e.target === e.currentTarget) closeNoticeModal(); }}
              >
                <div className="grid place-items-center h-dvh w-full px-4">
                  <div
                    className={`relative z-[120] w-full mx-auto max-w-[92vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[88dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
                      isDarkMode ? "bg-[#17181c] border border-[#2f3336]" : "bg-white border border-slate-200"
                    }`}
                  >
                    {/* Thin top accent line based on notice type */}
                    <div className={`h-1 flex-shrink-0 w-full ${
                      selectedNotice.type === "warning" ? "bg-amber-400"
                      : selectedNotice.type === "success" ? "bg-blue-500"
                      : selectedNotice.type === "error" ? "bg-red-500"
                      : "bg-blue-500"
                    }`} />

                    {/* Header */}
                    <div className={`flex-shrink-0 px-5 py-4 border-b ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              selectedNotice.type === "warning"
                                ? isDarkMode ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-700"
                                : isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700"
                            }`}>
                              {selectedNotice.category || selectedNotice.type}
                            </span>
                            <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {new Date(selectedNotice.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <h2
                            id="notice-modal-title"
                            className={`text-base sm:text-lg font-bold leading-snug ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          >
                            {selectedNotice.title.replace(/^[^\w\s]+\s*/, "")}
                          </h2>
                        </div>
                        <button
                          onClick={closeNoticeModal}
                          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                            isDarkMode ? "text-slate-400 hover:bg-[#16181c] hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
                      {/* Routine attachment (image or PDF) */}
                      {selectedNotice.attachment_url && (
                        <div className="mb-4">
                          {selectedNotice.attachment_type === "pdf" ? (
                            <a
                              href={selectedNotice.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                                isDarkMode
                                  ? "border-orange-500/40 bg-orange-900/20 hover:bg-orange-900/30 text-orange-200"
                                  : "border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800"
                              }`}
                            >
                              <span className="flex items-center gap-2 font-semibold text-sm">
                                <FileText className="w-5 h-5" /> View Exam Routine (PDF)
                              </span>
                              <Download className="w-4 h-4 flex-shrink-0" />
                            </a>
                          ) : (
                            <a href={selectedNotice.attachment_url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={selectedNotice.attachment_url}
                                alt="Exam routine"
                                className="w-full rounded-xl border border-gray-200 dark:border-[#2f3336] shadow-sm hover:opacity-95 transition-opacity"
                                loading="lazy"
                              />
                              <p className={`mt-1 text-[11px] text-center ${isDarkMode ? "text-[#71767b]" : "text-gray-500"}`}>
                                Tap the image to open full size
                              </p>
                            </a>
                          )}
                        </div>
                      )}
                      <div className="prose prose-sm sm:prose prose-gray max-w-none">
                        {(() => {
                          const content = selectedNotice.content || "";

                          // Check if content is HTML
                          const isHTML = /<[^>]+>/.test(content);

                          // detect embedded image or URL markers
                          const urlMatch = content.match(
                            /\[EXAM_ROUTINE_URL\](.*?)\[\/EXAM_ROUTINE_URL\]/,
                          );
                          const imageMatch = content.match(
                            /\[EXAM_ROUTINE_IMAGE\](.*?)\[\/EXAM_ROUTINE_IMAGE\]/,
                          );
                          const pdfMatch = content.match(
                            /\[EXAM_ROUTINE_PDF\](.*?)\[\/EXAM_ROUTINE_PDF\]/,
                          );

                          // If content is HTML, render it directly
                          if (isHTML && !pdfMatch && !urlMatch && !imageMatch) {
                            // Apply theme-aware styling to HTML content - preserve existing styles
                            let styledContent = content;
                            if (isDarkMode) {
                              styledContent = content
                                .replace(/<table(?!\s+style)/g, '<table style="border-collapse:collapse;width:100%;background:rgba(31,41,55,0.5);margin:16px 0;overflow-x:auto;"')
                                .replace(/<th(?!\s+style)/g, '<th style="padding:12px 8px;border:1px solid rgb(107,114,128);color:white;font-weight:600;background:#1f4f82;"')
                                .replace(/<td(?!\s+style)/g, '<td style="padding:10px 8px;border:1px solid rgb(107,114,128);color:rgb(229,231,235);"')
                                .replace(/<h3(?!\s+style)/g, '<h3 style="color:rgb(229,231,235);margin-top:16px;margin-bottom:12px;font-size:18px;font-weight:700;"')
                                .replace(/<p(?!\s+style)/g, '<p style="color:rgb(209,213,219);margin-bottom:12px;line-height:1.6;"')
                                .replace(/<li(?!\s+style)/g, '<li style="color:rgb(209,213,219);margin-bottom:6px;"')
                                .replace(/<strong(?!\s+style)>/g, '<strong style="color:rgb(229,231,235);font-weight:700;">');
                            } else {
                              styledContent = content
                                .replace(/<table(?!\s+style)/g, '<table style="border-collapse:collapse;width:100%;background:white;margin:16px 0;overflow-x:auto;"')
                                .replace(/<th(?!\s+style)/g, '<th style="padding:12px 8px;border:1px solid rgb(209,213,219);color:white;font-weight:600;background:#1f4f82;"')
                                .replace(/<td(?!\s+style)/g, '<td style="padding:10px 8px;border:1px solid rgb(209,213,219);color:rgb(51,65,85);"')
                                .replace(/<h3(?!\s+style)/g, '<h3 style="color:rgb(15,23,42);margin-top:16px;margin-bottom:12px;font-size:18px;font-weight:700;"')
                                .replace(/<p(?!\s+style)/g, '<p style="color:rgb(55,65,81);margin-bottom:12px;line-height:1.6;"')
                                .replace(/<li(?!\s+style)/g, '<li style="color:rgb(55,65,81);margin-bottom:6px;"')
                                .replace(/<strong(?!\s+style)>/g, '<strong style="color:rgb(15,23,42);font-weight:700;">');
                            }

                            return (
                              <div
                                className={`text-sm leading-relaxed overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_table]:w-full [&_table]:border-collapse ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}
                                dangerouslySetInnerHTML={{
                                  __html: styledContent,
                                }}
                              />
                            );
                          }

                          // parse simple structured routine lines into entries
                          const parseRoutineEntries = (text: string) => {
                            const lines = text
                              .split(/\r?\n/)
                              .map((l: string) => l.trim())
                              .filter(Boolean);
                            const entries: any[] = [];
                            for (const line of lines) {
                              if (
                                /Room\s*\d+/i.test(line) &&
                                /\d{2}\/\d{2}\/\d{4}/.test(line)
                              ) {
                                const parts = line
                                  .split("•")
                                  .map((p: string) => p.trim())
                                  .filter(Boolean);
                                const dateTime = parts[0] || "";
                                const course = parts[1] || "";
                                const hall = parts[2] || "";
                                const roomText =
                                  parts
                                    .slice()
                                    .reverse()
                                    .find((p: string) =>
                                      /Room\s*\d+/i.test(p),
                                    ) || "";
                                const roomMatch =
                                  roomText.match(/Room\s*(\d+)/i);
                                const roomNum = roomMatch ? roomMatch[1] : "";
                                let building = "";
                                let roomNo = roomNum;
                                if (roomNum && roomNum.length >= 2) {
                                  building = roomNum.charAt(0);
                                  roomNo = roomNum.slice(1);
                                }
                                entries.push({
                                  dateTime,
                                  course,
                                  hall,
                                  roomFull: roomNum,
                                  building,
                                  roomNo,
                                  raw: line,
                                });
                              }
                            }
                            return entries;
                          };

                          const routineEntries = parseRoutineEntries(content);

                          // Build date/time parts for each entry and detect a common exam time
                          const timeRegex =
                            /(\d{1,2}:\d{2}\s*(?:AM|PM)\s*(?:to|–|-|—)\s*\d{1,2}:\d{2}\s*(?:AM|PM))/i;
                          const entriesWithParts = routineEntries.map((e) => {
                            const m = e.dateTime.match(timeRegex);
                            const timeOnly = m
                              ? m[0].replace(/–/g, "to").replace(/—/g, "to")
                              : "";
                            const dateOnly = m
                              ? e.dateTime.replace(m[0], "").trim()
                              : e.dateTime;
                            return { ...e, dateOnly, timeOnly };
                          });

                          const commonTime =
                            entriesWithParts.length > 0 &&
                            entriesWithParts.every(
                              (en) =>
                                en.timeOnly &&
                                en.timeOnly === entriesWithParts[0].timeOnly,
                            )
                              ? entriesWithParts[0].timeOnly
                              : "";

                          const generatePrintableHTML = (
                            title: string,
                            entries: any[],
                          ) => {
                            const styles = `body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#0f172a}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f3f4f6}`;
                            const rows = entries
                              .map((e) => {
                                const dateCell = e.dateOnly || e.dateTime || "";
                                const buildingRoom = `B${e.building || "-"}\/${e.roomNo || e.roomFull || "-"}`;
                                return `<tr><td>${dateCell}</td><td>${e.course}</td><td>${e.hall}</td><td>${buildingRoom}</td></tr>`;
                              })
                              .join("");

                            const timeBlock = commonTime
                              ? `<p style="text-align:center;margin:8px 0;font-weight:600;">Exam Time: ${commonTime}</p>`
                              : "";

                            return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body><h1>${title}</h1>${timeBlock}<table><thead><tr><th>Date</th><th>Course</th><th>Course Teacher</th><th>Bld/Room</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                          };

                          const openPrintableWindow = (html: string) => {
                            const w = window.open(
                              "",
                              "_blank",
                              "noopener,noreferrer",
                            );
                            if (!w)
                              return alert(
                                "Unable to open print window. Please allow popups.",
                              );
                            w.document.open();
                            w.document.write(html);
                            w.document.close();
                            setTimeout(() => {
                              w.focus();
                              w.print();
                            }, 300);
                          };

                          // Mobile-friendly PDF downloader (works on all devices)
                          const downloadFile = async (
                            url: string,
                            filename?: string,
                          ) => {
                            if (loading) return; // Prevent multiple simultaneous downloads

                            try {
                              setLoading(true);

                              // Mobile detection
                              const isMobile =
                                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                                  navigator.userAgent,
                                );

                              if (isMobile) {
                                // Mobile: Direct link open (more reliable on mobile browsers)
                                setTimeout(() => {
                                  window.open(
                                    url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                  setLoading(false);
                                }, 100);
                              } else {
                                // Desktop: Blob download for better UX
                                const res = await fetch(url, {
                                  mode: "cors",
                                  cache: "no-cache",
                                });
                                if (!res.ok)
                                  throw new Error(
                                    `HTTP error! status: ${res.status}`,
                                  );
                                const blob = await res.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = blobUrl;
                                a.download =
                                  filename ||
                                  url.split("/").pop() ||
                                  "routine.pdf";
                                a.style.display = "none";
                                document.body.appendChild(a);

                                // Trigger download
                                setTimeout(() => {
                                  a.click();
                                  setTimeout(() => {
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(blobUrl);
                                  }, 100);
                                }, 50);

                                setTimeout(() => setLoading(false), 800);
                              }
                            } catch (err) {
                              console.warn(
                                "Download failed, opening in new tab",
                                err,
                              );
                              setLoading(false);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }
                          };

                          const downloadRoutinePDF = async (title: string) => {
                            if (loading) return; // Prevent multiple simultaneous operations

                            // Check for PDF in notice content
                            const pdfUrlMatch = content.match(
                              /\[EXAM_ROUTINE_PDF\](.*?)\[\/EXAM_ROUTINE_PDF\]/,
                            );

                            if (pdfUrlMatch && pdfUrlMatch[1]) {
                              const pdfUrl = pdfUrlMatch[1];
                              const filename = `${(title || "exam_routine").replace(/[^a-z0-9\-_\.]/gi, "_")}.pdf`;
                              await downloadFile(pdfUrl, filename);
                            } else {
                              // No PDF available - show alert
                              alert(
                                "⚠️ PDF not available. Please contact admin to upload the exam routine PDF.",
                              );
                            }
                          };

                          if (pdfMatch && pdfMatch[1]) {
                            const pdfUrl = pdfMatch[1];
                            const textContent = content
                              .replace(
                                /\[EXAM_ROUTINE_PDF\].*?\[\/EXAM_ROUTINE_PDF\]/g,
                                "",
                              )
                              .trim();
                            const filename = `${(selectedNotice.title || "exam_routine").replace(/[^a-z0-9\-_\.]/gi, "_")}.pdf`;
                            return (
                              <div>
                                {textContent ? (
                                  <p
                                    className={`leading-relaxed whitespace-pre-wrap mb-4 select-text transition-colors duration-300 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}
                                  >
                                    {textContent}
                                  </p>
                                ) : null}
                                <div
                                  className={`rounded-xl p-4 text-center transition-colors duration-300 ${isDarkMode ? "bg-[#2f3336]/50" : "bg-gray-50"}`}
                                >
                                  <h4
                                    className={`font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    <span className="no-select">📄</span> Final
                                    Exam Routine (PDF)
                                  </h4>
                                  <p
                                    className={`text-sm mb-3 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-600"}`}
                                  >
                                    A PDF version of the routine is available.
                                    Download it below.
                                  </p>
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() =>
                                        downloadFile(pdfUrl, filename)
                                      }
                                      disabled={loading}
                                      className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg active:scale-95 ${
                                        loading
                                          ? "opacity-60 cursor-wait"
                                          : "hover:bg-blue-700"
                                      }`}
                                    >
                                      {loading
                                        ? "⏳ Downloading..."
                                        : "⬇️ Download (PDF)"}
                                    </button>
                                  </div>
                                </div>
                                <div
                                  className={`mt-4 rounded-lg p-4 ${isDarkMode ? "bg-[#16181c]/60 border border-[#2f3336]" : "bg-white border border-gray-100"} text-sm`}
                                >
                                  <h4
                                    className={`font-semibold mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    Exam Guidelines
                                  </h4>
                                  <ul
                                    className={`list-disc pl-5 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                                  >
                                    <li>
                                      Arrive at least 15 minutes before the exam
                                      start time.
                                    </li>
                                    <li>
                                      Bring your student ID and necessary
                                      stationery.
                                    </li>
                                    <li>
                                      Mobile phones must be switched off and
                                      kept away during exams.
                                    </li>
                                    <li>
                                      Read instructions carefully before
                                      starting the paper.
                                    </li>
                                  </ul>
                                  <p
                                    className={`mt-3 font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    Best of luck to all students — Edu<span className="text-[#ef4444]">51</span>Portal Team 🎓
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          if (urlMatch || imageMatch) {
                            const imageData = urlMatch
                              ? urlMatch[1]
                              : imageMatch
                                ? imageMatch[1]
                                : "";
                            const textContent = content
                              .replace(
                                /\[EXAM_ROUTINE_URL\].*?\[\/EXAM_ROUTINE_URL\]/g,
                                "",
                              )
                              .replace(
                                /\[EXAM_ROUTINE_IMAGE\].*?\[\/EXAM_ROUTINE_IMAGE\]/g,
                                "",
                              );
                            return (
                              <div>
                                <p
                                  className={`leading-relaxed whitespace-pre-wrap mb-6 select-text transition-colors duration-300 ${isDarkMode ? "text-[#8b98a5]" : "text-gray-700"}`}
                                >
                                  {textContent}
                                </p>
                                <div
                                  className={`rounded-xl p-4 text-center transition-colors duration-300 ${isDarkMode ? "bg-[#2f3336]/50" : "bg-gray-50"}`}
                                >
                                  <h4
                                    className={`font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    <span className="no-select">📋</span> Exam
                                    Routine
                                  </h4>
                                  <div
                                    className="w-full bg-gray-200 dark:bg-[#16181c] rounded-lg overflow-hidden"
                                    style={{ aspectRatio: "4/3" }}
                                  >
                                    <img
                                      src={imageData}
                                      alt="Exam Routine"
                                      className={`w-full h-full object-contain rounded-lg shadow-lg mx-auto border transition-colors duration-300 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
                                    />
                                  </div>
                                  <p
                                    className={`text-sm mt-2 transition-colors duration-300 ${isDarkMode ? "text-[#71767b]" : "text-gray-600"}`}
                                  >
                                    Click on the image to view in full size
                                  </p>
                                </div>
                                <div
                                  className={`mt-4 rounded-lg p-4 ${isDarkMode ? "bg-[#16181c]/60 border border-[#2f3336]" : "bg-white border border-gray-100"} text-sm`}
                                >
                                  <h4
                                    className={`font-semibold mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    Exam Guidelines
                                  </h4>
                                  <ul
                                    className={`list-disc pl-5 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                                  >
                                    <li>
                                      Arrive at least 15 minutes before the exam
                                      start time.
                                    </li>
                                    <li>
                                      Bring your student ID and necessary
                                      stationery.
                                    </li>
                                    <li>
                                      Mobile phones must be switched off and
                                      kept away during exams.
                                    </li>
                                    <li>
                                      Read instructions carefully before
                                      starting the paper.
                                    </li>
                                  </ul>
                                  <p
                                    className={`mt-3 font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    Best of luck to all students — Edu<span className="text-[#ef4444]">51</span>Portal Team 🎓
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          if (routineEntries && routineEntries.length > 0) {
                            return (
                              <div>
                                <div
                                  className={`rounded-lg p-4 shadow-sm border ${isDarkMode ? "bg-[#16181c]/80 border-[#2f3336]" : "bg-white border-gray-100"}`}
                                >
                                  <h3
                                    className={`font-semibold mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    Digital Final Exam Routine
                                  </h3>
                                  <div className="overflow-x-auto">
                                    {commonTime ? (
                                      <p
                                        className={`text-sm mb-2 font-medium ${isDarkMode ? "text-[#8b98a5]" : "text-gray-600"}`}
                                      >
                                        Exam Time: {commonTime}
                                      </p>
                                    ) : null}
                                    <table
                                      className={`w-full text-sm ${isDarkMode ? "text-gray-100" : "text-gray-700"}`}
                                    >
                                      <thead>
                                        <tr
                                          className={`text-left text-xs ${isDarkMode ? "text-gray-100" : "text-gray-500"}`}
                                        >
                                          <th className="pb-2">Date</th>
                                          <th className="pb-2">Course</th>
                                          <th className="pb-2">
                                            Course Teacher
                                          </th>
                                          <th className="pb-2">Bld/Room</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {entriesWithParts.map((e, idx) => (
                                          <tr
                                            key={idx}
                                            className={`${isDarkMode ? "border-t border-[#2f3336]" : "border-t"}`}
                                          >
                                            <td
                                              className={`py-2 align-top ${isDarkMode ? "text-gray-100" : "text-gray-700"}`}
                                            >
                                              {commonTime
                                                ? e.dateOnly
                                                : e.dateTime}
                                            </td>
                                            <td
                                              className={`py-2 align-top ${isDarkMode ? "text-gray-100" : "text-gray-700"}`}
                                            >
                                              {e.course}
                                            </td>
                                            <td
                                              className={`py-2 align-top ${isDarkMode ? "text-gray-100" : "text-gray-700"}`}
                                            >
                                              {e.hall}
                                            </td>
                                            <td
                                              className={`py-2 align-top ${isDarkMode ? "text-gray-100" : "text-gray-700"}`}
                                            >{`B${e.building || "-"}\/${e.roomNo || e.roomFull || "-"}`}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="mt-3 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                                    <button
                                      onClick={() =>
                                        downloadRoutinePDF(
                                          selectedNotice.title ||
                                            "Exam Routine",
                                        )
                                      }
                                      disabled={loading}
                                      className={`w-full sm:w-auto px-3 py-2 sm:px-4 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg active:scale-95 text-sm ${
                                        loading
                                          ? "bg-blue-400 cursor-wait opacity-70"
                                          : "bg-blue-600 hover:bg-blue-700"
                                      }`}
                                    >
                                      {loading
                                        ? "⏳ Downloading..."
                                        : "📄 Download Routine"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        alert(
                                          "Routine copied to clipboard. You can paste it into a document to save as PDF.",
                                        );
                                        navigator.clipboard &&
                                          navigator.clipboard.writeText(
                                            content,
                                          );
                                      }}
                                      className={`w-full sm:w-auto px-3 py-2 sm:px-4 border rounded-lg transition text-sm ${isDarkMode ? "bg-[#2f3336] text-gray-100 border-gray-600 hover:bg-gray-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                                    >
                                      📋 Copy
                                    </button>
                                  </div>
                                  <div
                                    className={`mt-4 rounded-lg p-4 ${isDarkMode ? "bg-[#16181c]/60 border border-[#2f3336]" : "bg-white border border-gray-100"} text-sm`}
                                  >
                                    <h4
                                      className={`font-semibold mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                    >
                                      Exam Guidelines
                                    </h4>
                                    <ul
                                      className={`list-disc pl-5 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                                    >
                                      <li>
                                        Arrive at least 15 minutes before the
                                        exam start time.
                                      </li>
                                      <li>
                                        Bring your student ID and necessary
                                        stationery.
                                      </li>
                                      <li>
                                        Mobile phones must be switched off and
                                        kept away during exams.
                                      </li>
                                      <li>
                                        Read instructions carefully before
                                        starting the paper.
                                      </li>
                                    </ul>
                                    <p
                                      className={`mt-3 font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                    >
                                      Best of luck to all students — Edu<span className="text-[#ef4444]">51</span>Portal Team 🎓
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Parse **bold** and render paragraphs
                          const parsedParagraphs = content.split(/\r?\n\r?\n/).filter(Boolean);
                          return (
                            <div className={`space-y-3 select-text ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>
                              {parsedParagraphs.map((para, pi) => (
                                <p key={pi} className="leading-relaxed text-sm sm:text-base"
                                  dangerouslySetInnerHTML={{
                                    __html: para
                                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                                      .replace(/\r?\n/g, "<br/>")
                                  }}
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className={`flex-shrink-0 px-5 py-3.5 border-t flex justify-end ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
                      <button
                        onClick={closeNoticeModal}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                          isDarkMode ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-[#17181c] text-white hover:bg-[#2f3336]"
                        }`}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Material Viewer Modal - Enhanced with Fullscreen, Zoom, Navigation */}
            {showMaterialViewer && selectedMaterial && (
              <div
                onClick={(e) => { if (!isFullscreen && e.target === e.currentTarget) closeMaterialViewer(); }}
                className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md ${isFullscreen ? "p-0" : "p-2 sm:p-4"}`}
              >
                <div
                  className={`flex flex-col overflow-hidden transition-all duration-200 ${
                    isFullscreen
                      ? "w-full h-full rounded-none border-0"
                      : `w-full sm:w-[92vw] md:w-[88vw] lg:max-w-6xl h-[calc(100dvh-1rem)] sm:h-[90dvh] rounded-2xl border shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_64px_rgba(0,0,0,0.7)] ${isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200"}`
                  }`}
                  style={{ animation: 'pdf-scale-in 0.2s cubic-bezier(0.22,1,0.36,1) both' }}
                >
                  {/* Top accent stripe */}
                  <div className="flex-shrink-0 h-[3px] w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

                  {/* ── Header ─────────────────────────────── */}
                  <div className={`flex-shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b ${isDarkMode ? "bg-[#16181c]/80 border-[#2f3336]/60" : "bg-slate-50 border-slate-200"}`}>
                    {/* Left: icon + meta */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-sm ${
                        selectedMaterial.type === "video"
                          ? "bg-gradient-to-br from-red-500 to-red-600"
                          : selectedMaterial.type === "image"
                          ? "bg-gradient-to-br from-purple-500 to-purple-600"
                          : selectedMaterial.type === "slides"
                          ? "bg-gradient-to-br from-amber-500 to-amber-600"
                          : "bg-gradient-to-br from-blue-500 to-blue-600"
                      } text-white`}>
                        <div className="w-4 h-4">{getTypeIcon(selectedMaterial.type)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className={`text-sm sm:text-base font-semibold leading-tight truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {selectedMaterial.title}
                        </h2>
                        {selectedMaterial.size && (
                          <p className={`text-xs mt-0.5 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {selectedMaterial.size}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: controls */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      {/* Open in tab — sm+ */}
                      {selectedMaterial.file_url && (
                        <a
                          href={selectedMaterial.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                          title="Open in browser"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      )}
                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${isDarkMode ? "border-[#2f3336] bg-[#2f3336]/50 text-slate-400 hover:text-white hover:bg-[#38444d]" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
                      >
                        {isFullscreen
                          ? <Minimize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          : <Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </button>
                      {/* Close */}
                      <button
                        onClick={closeMaterialViewer}
                        title="Close"
                        className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${isDarkMode ? "border-[#2f3336] bg-[#2f3336]/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30" : "border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200"}`}
                      >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Body ───────────────────────────────── */}
                  <div className={`flex-1 overflow-hidden min-h-0 flex flex-col relative ${isDarkMode ? "bg-[#000000]" : "bg-slate-100"}`}>
                    {/* Loading overlay */}
                    {isViewerLoading && (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 ${isDarkMode ? "bg-[#000000]/95" : "bg-white/95"}`}>
                        <div className="flex flex-col items-center gap-5 w-52">
                          {/* Animated doc icon */}
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                            <div className={`w-6 h-6 rounded-full border-2 border-transparent border-t-blue-500 animate-spin`} style={{ animationDuration: "0.7s" }} />
                          </div>
                          {/* Skeleton lines mimicking document content */}
                          <div className="w-full space-y-2">
                            {[90, 78, 88, 65, 82].map((w, i) => (
                              <div
                                key={i}
                                className={`h-2 rounded-full animate-pulse ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}
                                style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                              />
                            ))}
                          </div>
                          <p className={`text-xs font-medium tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Loading document…
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Video Content */}
                    {selectedMaterial.type === "video" &&
                      selectedMaterial.video_url && (
                        <div className="w-full h-full flex items-center justify-center bg-black p-1">
                          <div
                            className="w-full aspect-video rounded-sm md:rounded overflow-hidden shadow-xl"
                            style={{
                              transform: `scale(${zoomLevel / 100})`,
                              transformOrigin: "center",
                              contain: "paint layout",
                            }}
                          >
                            {selectedMaterial.video_url.includes("youtube") ||
                            selectedMaterial.video_url.includes("youtu.be") ? (
                              <iframe
                                width="100%"
                                height="100%"
                                src={
                                  selectedMaterial.video_url.includes(
                                    "watch?v=",
                                  )
                                    ? selectedMaterial.video_url.replace(
                                        "watch?v=",
                                        "embed/",
                                      )
                                    : selectedMaterial.video_url.replace(
                                        "youtu.be/",
                                        "youtube.com/embed/",
                                      )
                                }
                                title={selectedMaterial.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full block"
                                onLoad={() => setIsViewerLoading(false)}
                              />
                            ) : (
                              <video
                                width="100%"
                                height="100%"
                                controls
                                className="w-full h-full"
                                onLoadedData={() => setIsViewerLoading(false)}
                              >
                                <source src={selectedMaterial.video_url} />
                                Your browser does not support the video tag.
                              </video>
                            )}
                          </div>
                        </div>
                      )}

                    {/* PDF/Document Content */}
                    {selectedMaterial.type === "pdf" &&
                      selectedMaterial.file_url && (
                        <div className="w-full flex-1 min-h-0 flex items-center justify-center bg-gray-950 p-1 overflow-hidden">
                          <div
                            style={{
                              transform: `scale(${zoomLevel / 100})`,
                              transformOrigin: "center top",
                              width: "100%",
                              height: "100%",
                              contain: "paint layout",
                            }}
                          >
                            <iframe
                              key={`${selectedMaterial.id || selectedMaterial.file_url}-page-${currentPage}`}
                              src={buildViewerUrl(
                                selectedMaterial,
                                currentPage,
                              )}
                              title={selectedMaterial.title}
                              width="100%"
                              height="100%"
                              className="rounded-lg w-full h-full block"
                              onLoad={() => setIsViewerLoading(false)}
                            />
                          </div>
                        </div>
                      )}

                    {/* Notes/Text Content */}
                    {selectedMaterial.type === "notes" &&
                      selectedMaterial.file_url && (
                        <div className="w-full flex-1 min-h-0 flex items-center justify-center bg-gray-950 p-1 overflow-hidden">
                          <div
                            style={{
                              transform: `scale(${zoomLevel / 100})`,
                              transformOrigin: "center top",
                              width: "100%",
                              height: "100%",
                              contain: "paint layout",
                            }}
                          >
                            <iframe
                              key={`${selectedMaterial.id || selectedMaterial.file_url}-page-${currentPage}`}
                              src={buildViewerUrl(
                                selectedMaterial,
                                currentPage,
                              )}
                              title={selectedMaterial.title}
                              width="100%"
                              height="100%"
                              className="rounded-lg w-full h-full block"
                              onLoad={() => setIsViewerLoading(false)}
                            />
                          </div>
                        </div>
                      )}

                    {/* Image Content */}
                    {selectedMaterial.type === "image" &&
                      selectedMaterial.file_url && (
                        <div className="w-full flex-1 min-h-0 flex items-center justify-center bg-gray-950 p-1 overflow-hidden">
                          <img
                            src={selectedMaterial.file_url}
                            alt={selectedMaterial.title}
                            className="rounded-lg shadow-2xl transition-transform"
                            style={{
                              transform: `scale(${zoomLevel / 100})`,
                              transformOrigin: "center",
                              maxHeight: "100%",
                              height: "100%",
                              width: "auto",
                            }}
                            onLoad={() => setIsViewerLoading(false)}
                          />
                        </div>
                      )}

                    {/* Slides Content */}
                    {selectedMaterial.type === "slides" &&
                      selectedMaterial.file_url && (
                        <div className="w-full flex-1 min-h-0 flex items-center justify-center bg-gray-950 p-1 overflow-hidden">
                          <div
                            style={{
                              transform: `scale(${zoomLevel / 100})`,
                              transformOrigin: "center top",
                              width: "100%",
                              height: "100%",
                              contain: "paint layout",
                            }}
                          >
                            <iframe
                              key={`${selectedMaterial.id || selectedMaterial.file_url}-page-${currentPage}`}
                              src={buildViewerUrl(
                                selectedMaterial,
                                currentPage,
                              )}
                              title={selectedMaterial.title}
                              width="100%"
                              height="100%"
                              className="rounded-lg w-full h-full block"
                              onLoad={() => setIsViewerLoading(false)}
                            />
                          </div>
                        </div>
                      )}

                    {/* Generic Document Content - Catch all for other file types */}
                    {selectedMaterial.type === "document" &&
                      selectedMaterial.file_url && (
                        <div className="w-full flex-1 min-h-0 flex items-center justify-center bg-gray-950 p-1 overflow-hidden">
                          <div
                            style={{
                              transform: `scale(${zoomLevel / 100})`,
                              transformOrigin: "center top",
                              width: "100%",
                              height: "100%",
                              contain: "paint layout",
                            }}
                          >
                            <iframe
                              key={`${selectedMaterial.id || selectedMaterial.file_url}-page-${currentPage}`}
                              src={buildViewerUrl(
                                selectedMaterial,
                                currentPage,
                              )}
                              title={selectedMaterial.title}
                              width="100%"
                              height="100%"
                              className="rounded-lg w-full h-full block"
                              onLoad={() => setIsViewerLoading(false)}
                            />
                          </div>
                        </div>
                      )}

                    {/* Fallback - Generic File Link */}
                    {!selectedMaterial.video_url &&
                      !selectedMaterial.file_url && (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
                          <FileText className="h-16 w-16 text-gray-500 mb-4" />
                          <p className="text-[#8b98a5] text-center mb-4">
                            No preview available for this material
                          </p>
                          <a
                            href={selectedMaterial.file_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Open in New Tab
                          </a>
                        </div>
                      )}
                  </div>

                  {/* ── Footer ─────────────────────────────── */}
                  <div className={`flex-shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-t ${isDarkMode ? "bg-[#16181c]/80 border-[#2f3336]/60" : "bg-slate-50 border-slate-200"}`}>
                    {/* Left: file meta */}
                    <div className={`flex items-center gap-1.5 text-xs min-w-0 flex-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="truncate font-medium">{selectedMaterial.title}</span>
                      <span className="opacity-40 flex-shrink-0">·</span>
                      <span className="uppercase text-[10px] tracking-wide flex-shrink-0 font-semibold opacity-70">{selectedMaterial.type}</span>
                      {selectedMaterial.size && (
                        <>
                          <span className="opacity-40 flex-shrink-0 hidden sm:inline">·</span>
                          <span className="hidden sm:inline flex-shrink-0">{selectedMaterial.size}</span>
                        </>
                      )}
                    </div>
                    {/* Right: action icons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {selectedMaterial.file_url && (
                        <a
                          href={selectedMaterial.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in browser"
                          className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-slate-400 hover:text-blue-400 hover:bg-[#2f3336]" : "text-slate-500 hover:text-blue-600 hover:bg-slate-200"}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {selectedMaterial.file_url && (
                        <a
                          href={selectedMaterial.file_url}
                          download
                          title="Download"
                          className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-slate-400 hover:text-[#1e9df1] hover:bg-[#2f3336]" : "text-slate-500 hover:text-[#1e9df1] hover:bg-slate-200"}`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={closeMaterialViewer}
                        title="Close"
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-slate-400 hover:text-red-400 hover:bg-[#2f3336]" : "text-slate-500 hover:text-red-600 hover:bg-slate-200"}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ── Lazy-loaded views — Suspense ensures a spinner while chunks download ── */}
      <Suspense fallback={
        <div className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 flex items-center justify-center">
          <div className={`w-10 h-10 rounded-full border-4 border-t-[#1e9df1] animate-spin ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`} />
        </div>
      }>

      {/* Semester Tracker Page */}
      {currentView === "semester" && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-hidden">
          <SemesterTracker
            onClose={() => goToView("home")}
            isDarkMode={isDarkMode}
          />
        </main>
      )}

      {/* Custom Routine Page */}
      {currentView === "custom" && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-hidden">
          <CustomRoutine
            onClose={() => goToView("home")}
            isDarkMode={isDarkMode}
            userId={authSession?.user?.id}
          />
        </main>
      )}

      {/* ── V2: Profile Page ── */}
      {currentView === "profile" && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <ProfilePage
            username={viewedUsername}
            currentUserId={authSession?.user?.id ?? null}
            initialAvatarUrl={viewedUsername ? undefined : (userProfile.avatar_url || undefined)}
            onOpenAdmin={authSession?.user?.id ? () => goToView("admin") : undefined}
            onClose={() => goToView("home")}
            isDarkMode={isDarkMode}
          />
        </main>
      )}

      {/* ── V2: My Network ── */}
      {currentView === "network" && authSession?.user?.id && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <NetworkPage
            currentUserId={authSession.user.id}
            onClose={() => goToView("home")}
            onViewProfile={(username) => goToView("profile", username)}
            isDarkMode={isDarkMode}
            onPendingRequestsChange={setPendingConnectionsCount}
          />
        </main>
      )}

      {/* ── V2: Team Building ── */}
      {currentView === "teams" && authSession?.user?.id && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <TeamsPage
            currentUserId={authSession.user.id}
            onClose={() => goToView("home")}
            onOpenTeam={(teamId) => goToView("team", teamId)}
            isDarkMode={isDarkMode}
          />
        </main>
      )}

      {/* ── V2: Team Detail ── */}
      {currentView === "team" && selectedTeamId && authSession?.user?.id && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <TeamPage
            teamId={selectedTeamId}
            currentUserId={authSession.user.id}
            onClose={() => goToView("teams")}
            onViewProfile={(username) => goToView("profile", username)}
            isDarkMode={isDarkMode}
            onViewPreview={(url, name) => {
              setCurrentFileUrl(url);
              setCurrentFileName(name);
              setShowFileViewer(true);
            }}
          />
        </main>
      )}

      {/* ── Shared Resources ── */}
      {currentView === "shared-resources" && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <PublicFilesPage
            isDarkMode={isDarkMode}
            onViewTeam={(teamId) => goToView("team", teamId)}
            onViewPreview={(url, name) => {
              setCurrentFileUrl(url);
              setCurrentFileName(name);
              setShowFileViewer(true);
            }}
          />
        </main>
      )}

      {/* ── V2: Alumni Hub ── */}
      {currentView === "alumni" && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <Suspense fallback={
            <div className={`h-full flex items-center justify-center p-4 ${isDarkMode ? "bg-[#000000]" : "bg-slate-50"}`}>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1e9df1]"></div>
            </div>
          }>
            {alumniSubView === "directory" && (
              <AlumniDirectoryPage
                isDarkMode={isDarkMode}
                isLoggedIn={!!authSession?.user}
                onViewProfile={(id) => {
                  setSelectedAlumniId(id);
                  setAlumniSubView("profile");
                }}
                onRegisterClick={() => {
                  if (!authSession?.user) {
                    setMajorAccessMessage("Please sign in to register as alumni");
                    setShowSignInModal(true);
                  } else {
                    setAlumniSubView("register");
                  }
                }}
                onClose={() => goToView("home")}
              />
            )}
            {alumniSubView === "profile" && selectedAlumniId && (
              <AlumniProfilePage
                id={selectedAlumniId}
                isDarkMode={isDarkMode}
                onBack={() => {
                  setAlumniSubView("directory");
                  setSelectedAlumniId(null);
                }}
              />
            )}
            {alumniSubView === "register" && authSession?.user && (
              <AlumniRegisterForm
                isDarkMode={isDarkMode}
                userId={authSession.user.id}
                userEmail={authSession.user.email || ""}
                onBack={() => setAlumniSubView("directory")}
                onSubmitSuccess={() => {
                  setAlumniSubView("directory");
                }}
              />
            )}
          </Suspense>
        </main>
      )}

      {/* ── World Cup 2026 ── */}
      {currentView === "wc26" && authSession?.user?.id && (
        <main className="fixed top-[72px] lg:top-20 inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-y-contain">
          <WorldCupPage
            currentUserId={authSession.user.id}
            onClose={() => goToView("home")}
            isDarkMode={isDarkMode}
          />
        </main>
      )}

      {/* ── WC26 Intro Modal ── */}
      <WC26IntroModal
        isOpen={showWC26Intro}
        isDarkMode={isDarkMode}
        onPickTeam={() => {
          setShowWC26Intro(false);
          localStorage.setItem("wc26_intro_dismissed", "1");
          if (authSession?.user?.id) goToView("wc26");
        }}
        onDismiss={() => {
          setShowWC26Intro(false);
          localStorage.setItem("wc26_intro_dismissed", "1");
        }}
      />

      {/* PDF Viewer */}
      <PDFViewer
        fileUrl={currentFileUrl}
        fileName={currentFileName}
        isOpen={showFileViewer}
        onClose={closeFileViewer}
        isDarkMode={isDarkMode}
      />

      </Suspense>{/* end lazy views */}

      {/* Feedback Modal — open to anyone (guests + logged-in users) */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        isDarkMode={isDarkMode}
        currentUserId={authSession?.user?.id ?? null}
        currentUserName={isLoggedIn ? userProfile.name : ""}
        currentUserEmail={isLoggedIn ? (userProfile.notificationEmail || userProfile.bubtEmail) : ""}
        onResult={(type, message) => showMajorAccessNotification(type, message)}
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        isDarkMode={isDarkMode}
        onSignIn={(identifier, password, profile) => {
          // onSignIn is called from SignInModal right after auth succeeds.
          // The SIGNED_IN handler in onAuthStateChange has already applied
          // user_metadata to state — this callback just ensures password is set
          // and fills any gaps from the quick-profile built in SignInModal.
          const picFromProfile = profile?.profile_pic || profile?.profilePic || "";
          const cachedPic = localStorage.getItem("userProfilePic") || "";
          setUserProfile((prev: any) => ({
            ...prev,
            // Keep name from SIGNED_IN handler (meta.name) unless it's still blank
            name: (prev.name && prev.name !== "Welcome Student")
              ? prev.name
              : (profile?.name && profile.name !== "Welcome Student"
                  ? profile.name
                  : prev.name || identifier.split("@")[0] || "Student"),
            section: prev.section || profile?.section || "",
            major: prev.major || profile?.major || "",
            bubtEmail: prev.bubtEmail || profile?.bubt_email || profile?.bubtEmail || identifier,
            notificationEmail: prev.notificationEmail || profile?.notification_email || profile?.notificationEmail || "",
            phone: prev.phone || profile?.phone || "",
            password,
            profilePic: prev.profilePic || picFromProfile || cachedPic,
            avatar_url: prev.avatar_url || picFromProfile || cachedPic,
            isAlumni: prev.isAlumni || profile?.isAlumni || (localStorage.getItem("userProfileIsAlumni") === "true") || false,
            isVerified: prev.isVerified || profile?.isVerified || (localStorage.getItem("userProfileIsVerified") === "true") || false,
          }));
          setIsLoggedIn(true);
          setShowSignInModal(false);
        }}
        onOpenSignUp={() => {
          setShowSignInModal(false);
          setIsEditingProfile(false);
          setShowSignUpModal(true);
        }}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        isDarkMode={isDarkMode}
      />

      <SetNewPasswordModal
        isOpen={showSetNewPasswordModal}
        onClose={() => setShowSetNewPasswordModal(false)}
        isDarkMode={isDarkMode}
      />

      <ChangeEmailModal
        isOpen={showChangeEmailModal}
        onClose={() => setShowChangeEmailModal(false)}
        isDarkMode={isDarkMode}
      />

      {/* Sign Up / Profile Modal */}
      <SignUpModal
        isOpen={showSignUpModal}
        onClose={() => {
          setShowSignUpModal(false);
          setIsEditingProfile(false);
        }}
        isDarkMode={isDarkMode}
        initialProfile={isEditingProfile ? userProfile : undefined}
        onSave={(profile) => {
          // Update state with all profile fields
          setUserProfile({
            name: profile.name,
            section: profile.section,
            major: profile.major,
            bubtEmail: profile.bubtEmail,
            notificationEmail: profile.notificationEmail,
            phone: profile.phone,
            password: profile.password,
            profilePic: profile.profilePic,
            avatar_url: profile.profilePic,
          });
          setIsLoggedIn(true);
          setIsEditingProfile(false);
          setShowSignUpModal(false);

          // Reload profile from database in realtime
          const loadUpdatedProfile = async () => {
            try {
              const { data: profileData, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("bubt_email", profile.bubtEmail)
                .single();

              if (error) {
                console.warn(
                  "⚠️ Could not reload profile from database:",
                  error,
                );
                return;
              }

              if (profileData) {
                const updatedProfile = {
                  name: profileData.name || "Welcome Student",
                  section: profileData.section || "",
                  major: profileData.major || "",
                  bubtEmail: profileData.bubt_email || "",
                  notificationEmail: profileData.notification_email || "",
                  phone: profileData.phone || "",
                  password: profile.password,
                  profilePic: profileData.profile_pic || "",
                  avatar_url: profileData.profile_pic || "",
                };
                setUserProfile(updatedProfile);
                console.log("✅ Profile reloaded from database in realtime");
              }
            } catch (err) {
              console.error("Error reloading profile:", err);
            }
          };

          loadUpdatedProfile();
          console.log("Profile saved successfully");
        }}
        onResetPassword={() => {
          setShowSignUpModal(false);
          setShowResetPasswordModal(true);
        }}
        onChangeEmail={() => {
          setShowSignUpModal(false);
          setShowChangeEmailModal(true);
        }}
      />

      {isLoggedIn && authSession?.user?.id && (
        <Suspense fallback={null}>
          <AIAssistant isDarkMode={isDarkMode} userId={authSession.user.id} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
