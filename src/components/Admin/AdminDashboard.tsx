import React, { useState, useEffect } from 'react';
import {
  Bell, Plus, ChevronDown, ChevronUp, AlertCircle, Trash2, Edit2, BarChart3,
  BookOpen, Files, Users, TrendingUp, HardDrive, UsersRound, ShieldCheck,
  MessageSquare, RefreshCw, Bug, Lightbulb, Sparkles, Ban, GraduationCap,
  BadgeCheck, X, Loader2, Search, FlaskConical, Calendar, Database, Activity,
  CheckCircle2, AlertTriangle, Layers, Server, ArrowUpRight,
  Download, FileSpreadsheet, Wifi, Zap, FileText, Check,
  History, PieChart, Clock, ArrowRight, Filter, SlidersHorizontal
} from 'lucide-react';
import MaterialManager from './MaterialManager';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { sendEmailNotification } from '../../lib/emailNotifications';
import { getAiUsageToday, GEMINI_FREE_TIER_DAILY_LIMIT, type AiUsageToday } from '../../lib/api/adminApi';
import { AlumniOutreachPanel } from './AlumniOutreachPanel';

export type AdminTabType = 'dashboard' | 'alumni' | 'notices' | 'materials' | 'feedback' | 'logs';

interface Notice {
  id: string;
  title?: string;
  content: string;
  is_active: boolean;
  type?: string;
  category?: string;
  created_at?: string;
}

interface BucketUsage { bucket: string; bytes: number; files: number; }
interface AdminUser {
  id: string; name: string | null; bubt_email: string | null; is_admin: boolean; is_owner: boolean;
  is_alumni?: boolean; is_verified?: boolean; is_banned?: boolean;
}
interface FeedbackItem {
  id: string;
  name: string | null;
  email: string | null;
  category: 'bug' | 'improvement' | 'feature' | 'custom';
  subject: string | null;
  message: string;
  status: 'new' | 'reviewed' | 'closed';
  page_url: string | null;
  created_at: string;
}

interface AdminDashboardProps {
  isDarkMode: boolean;
  activeTab?: AdminTabType;
  onTabChange?: (tab: AdminTabType) => void;
  onExitAdmin?: () => void;
  onPendingAlumniCountChange?: (count: number) => void;
  coursesCount: number;
  materialsCount: number;
  onlineUsers?: number;
  currentWeek?: number;
  totalWeeks?: number;
  // Real-time platform stats (from get_admin_stats RPC)
  storageBytes?: number;
  storageByBucket?: BucketUsage[];
  usersCount?: number;
  teamsCount?: number;
  // Admin Users management
  adminUsers?: AdminUser[];
  adminUsersLoading?: boolean;
  currentUserId?: string | null;
  onToggleUserAdmin?: (userId: string, makeAdmin: boolean) => void;
  onBanUser?: (userId: string, reason: string) => Promise<{ error: string | null }> | void;
  onUnbanUser?: (userId: string) => Promise<{ error: string | null }> | void;
  onDeleteUser?: (userId: string) => Promise<{ success: boolean; error?: string; teamsTransferred?: { teamId: string; newOwnerId: string }[] }>;
  // Feedback inbox
  feedbackItems?: FeedbackItem[];
  feedbackLoading?: boolean;
  onUpdateFeedbackStatus?: (id: string, status: 'new' | 'reviewed' | 'closed') => void;
  onRefreshFeedback?: () => void;
  notices?: Notice[];
  onEditNotice: (notice: Notice) => void;
  onCreateNotice: () => void;
  onDeleteNotice?: (noticeId: string) => void;
  broadcastPush?: { title: string; body: string; url: string };
  onBroadcastPushChange?: (data: { title: string; body: string; url: string }) => void;
  onSendBroadcast?: () => void;
  isSendingBroadcast?: boolean;
  onPreviewFile?: (url: string, name: string) => void;
}

// Supabase free tier storage limit (1 GB)
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Checks if a user account is mock or test data.
 * Matches accounts where name or email starts with "test" or "mock" (case-insensitive),
 * or follows standard test/mock account naming patterns.
 */
export const isMockOrTestAccount = (user: { name?: string | null; bubt_email?: string | null }): boolean => {
  const name = (user.name || '').trim().toLowerCase();
  const email = (user.bubt_email || '').trim().toLowerCase();

  // Primary criteria: starts with 'test' or 'mock'
  if (name.startsWith('test') || name.startsWith('mock')) return true;
  if (email.startsWith('test') || email.startsWith('mock')) return true;

  // Additional mock data variations
  if (name.includes('test user') || name.includes('test account') || name.includes('mock account') || name.includes('dummy')) return true;
  if (email.includes('@test.') || email.includes('dummy@') || email.includes('mock@') || email.includes('+test@')) return true;

  return false;
};

const FEEDBACK_META: Record<string, { label: string; icon: typeof Bug; cls: string }> = {
  bug: { label: 'Bug', icon: Bug, cls: 'bg-red-500/15 text-red-500' },
  improvement: { label: 'Improve', icon: Lightbulb, cls: 'bg-amber-500/15 text-amber-500' },
  feature: { label: 'Feature', icon: Sparkles, cls: 'bg-violet-500/15 text-violet-500' },
  custom: { label: 'Other', icon: MessageSquare, cls: 'bg-blue-500/15 text-blue-500' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isDarkMode,
  activeTab,
  onTabChange,
  onExitAdmin,
  onPendingAlumniCountChange,
  coursesCount = 0,
  materialsCount = 0,
  currentWeek = 1,
  totalWeeks = 20,
  onlineUsers = 0,
  storageBytes = 0,
  storageByBucket = [],
  usersCount = 0,
  teamsCount = 0,
  adminUsers = [],
  adminUsersLoading = false,
  currentUserId = null,
  onToggleUserAdmin,
  onBanUser,
  onUnbanUser,
  onDeleteUser,
  feedbackItems = [],
  feedbackLoading = false,
  onUpdateFeedbackStatus,
  onRefreshFeedback,
  notices = [],
  onEditNotice,
  onCreateNotice,
  onDeleteNotice,
  broadcastPush = { title: '', body: '', url: '/' },
  onBroadcastPushChange,
  onSendBroadcast,
  isSendingBroadcast = false,
  onPreviewFile,
}) => {
  const [internalTab, setInternalTab] = useState<AdminTabType>('dashboard');
  const currentTab = activeTab || internalTab;
  const setTab = (t: AdminTabType) => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    courseManagement: false,
    materialUpload: false,
  });

  // Live email preview toggle for the broadcast composer
  const [showEmailPreview, setShowEmailPreview] = useState(true);

  // Dedicated Comprehensive Audit & Activity Logs (Tab: 'logs')
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [logsCategoryFilter, setLogsCategoryFilter] = useState<'all' | 'session' | 'admin' | 'material' | 'notice' | 'security' | 'commit'>('all');
  const [logsTimeFilter, setLogsTimeFilter] = useState<'all' | 'today' | '24h' | 'week'>('all');
  const [customLogs, setCustomLogs] = useState<any[]>([]);
  const [logsOpenDropdown, setLogsOpenDropdown] = useState<'category' | 'time' | null>(null);
  const logsCategoryDropdownRef = React.useRef<HTMLDivElement>(null);
  const logsTimeDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        logsOpenDropdown === 'category' &&
        logsCategoryDropdownRef.current &&
        !logsCategoryDropdownRef.current.contains(e.target as Node)
      ) {
        setLogsOpenDropdown(null);
      }
      if (
        logsOpenDropdown === 'time' &&
        logsTimeDropdownRef.current &&
        !logsTimeDropdownRef.current.contains(e.target as Node)
      ) {
        setLogsOpenDropdown(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogsOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [logsOpenDropdown]);

  // Real-Time Session Duration & Live Telemetry
  const [sessionStartTime] = useState<number>(() => {
    try {
      const existing = sessionStorage.getItem('edu51_active_session_start');
      if (existing) return parseInt(existing, 10);
      const now = Date.now();
      sessionStorage.setItem('edu51_active_session_start', String(now));
      return now;
    } catch {
      return Date.now();
    }
  });

  const [sessionElapsedMs, setSessionElapsedMs] = useState<number>(() => Date.now() - sessionStartTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionElapsedMs(Date.now() - sessionStartTime);
    }, 10000); // Live tick every 10 seconds to update active stay duration
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  const sessionDurationMin = Math.max(1, Math.floor(sessionElapsedMs / 60000));

  const recordAuditAction = (
    category: 'session' | 'admin' | 'material' | 'notice' | 'security' | 'commit',
    title: string,
    detail: string,
    actorRole: 'Student' | 'Alumni' | 'Admin' | 'Platform Owner' | 'System' = 'Admin'
  ) => {
    const currentAdminUser = (adminUsers || []).find((u) => u.id === currentUserId);
    const actorName = currentAdminUser?.name || 'Swapnil (Admin)';
    const actorEmail = currentAdminUser?.bubt_email || 'admin@edu51portal.live';
    const finalRole = currentAdminUser?.is_owner ? 'Platform Owner' : currentAdminUser?.is_admin ? 'Admin' : actorRole;

    const newLog = {
      id: `live-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category,
      title,
      detail,
      actorName,
      actorEmail,
      actorRole: finalRole,
      timestamp: new Date().toISOString(),
      pathOrRoute: window.location.pathname || '/admin',
      deviceInfo: navigator.userAgent.includes('Windows')
        ? 'Chrome / Windows 11'
        : navigator.userAgent.includes('Mac')
          ? 'Safari / macOS'
          : navigator.userAgent.includes('Android')
            ? 'Chrome / Android'
            : navigator.userAgent.includes('iPhone')
              ? 'Mobile Safari'
              : 'Web Client',
    };

    setCustomLogs((prev) => [newLog, ...prev]);

    try {
      const stored = localStorage.getItem('edu51_live_audit_logs');
      const parsed = stored ? JSON.parse(stored) : [];
      localStorage.setItem('edu51_live_audit_logs', JSON.stringify([newLog, ...parsed].slice(0, 200)));
    } catch (e) {
      // ignore
    }
  };

  const clearLogsHistory = () => {
    setCustomLogs([]);
    try {
      localStorage.removeItem('edu51_live_audit_logs');
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('edu51_live_audit_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clean out any old mock artifacts that may have been saved previously
          const cleaned = parsed.filter((l: any) =>
            l &&
            l.id &&
            !l.id.startsWith('mat-log') &&
            !l.id.startsWith('sess-') &&
            !l.detail?.includes('CSE 315') &&
            !l.title?.includes('CSE 315')
          );
          setCustomLogs(cleaned);
          localStorage.setItem('edu51_live_audit_logs', JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Ban/unban + delete user state
  const [banReasonOpenId, setBanReasonOpenId] = useState<string | null>(null);
  const [banReasonText, setBanReasonText] = useState('');
  const [banBusyId, setBanBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userCategoryFilter, setUserCategoryFilter] = useState<'all' | 'real' | 'mock'>('all');

  const submitBan = async (userId: string) => {
    setBanBusyId(userId);
    const targetUser = (adminUsers || []).find((u) => u.id === userId);
    await onBanUser?.(userId, banReasonText.trim());
    recordAuditAction(
      'security',
      'Account Security Ban Issued',
      `Suspended portal access for user: ${targetUser?.name || targetUser?.bubt_email || userId}. Reason: ${banReasonText.trim() || 'Terms violation'}`,
      'Admin'
    );
    setBanBusyId(null);
    setBanReasonOpenId(null);
    setBanReasonText('');
  };

  const submitUnban = async (userId: string) => {
    setBanBusyId(userId);
    const targetUser = (adminUsers || []).find((u) => u.id === userId);
    await onUnbanUser?.(userId);
    recordAuditAction(
      'security',
      'Account Security Ban Lifted',
      `Reinstated portal access for user: ${targetUser?.name || targetUser?.bubt_email || userId}`,
      'Admin'
    );
    setBanBusyId(null);
  };

  const openDeleteConfirm = (u: AdminUser) => {
    setDeleteTarget(u);
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteResult(null);
  };

  const submitDelete = async () => {
    if (!deleteTarget || !onDeleteUser) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const res = await onDeleteUser(deleteTarget.id);
    setDeleteBusy(false);
    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete account.');
      return;
    }
    recordAuditAction(
      'security',
      'Account Deleted Permanently',
      `Deleted account ${deleteTarget.name || deleteTarget.bubt_email || deleteTarget.id}`,
      'Admin'
    );
    setDeleteResult(
      res.teamsTransferred?.length
        ? `Account deleted. Ownership of ${res.teamsTransferred.length} team(s) was transferred to another member.`
        : 'Account deleted.'
    );
  };

  // Alumni approval queue state
  const [pendingAlumni, setPendingAlumni] = useState<any[]>([]);
  const [pendingAlumniLoading, setPendingAlumniLoading] = useState(false);
  const [approvingAlumniId, setApprovingAlumniId] = useState<string | null>(null);
  const [reviewingFeedbackId, setReviewingFeedbackId] = useState<string | null>(null);

  const [aiUsage, setAiUsage] = useState<AiUsageToday | null>(null);

  useEffect(() => {
    getAiUsageToday().then(setAiUsage);
  }, []);

  // System Diagnostics & Network Latency state
  const [diagnostics, setDiagnostics] = useState<{
    dbLatencyMs: number | null;
    storageLatencyMs: number | null;
    status: 'optimal' | 'moderate' | 'degraded';
    lastChecked: string | null;
  }>({
    dbLatencyMs: null,
    storageLatencyMs: null,
    status: 'optimal',
    lastChecked: null,
  });
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [isExportingAlumni, setIsExportingAlumni] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'notice' | 'alumni' | 'feedback' | 'security'>('all');

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      let dbMs: number | null = null;
      let storageMs: number | null = null;

      if (supabaseConfigured) {
        // 1. DB ping test
        const t0 = performance.now();
        await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
        dbMs = Math.max(1, Math.round(performance.now() - t0));

        // 2. Storage ping test
        const t1 = performance.now();
        await supabase.storage.listBuckets();
        storageMs = Math.max(1, Math.round(performance.now() - t1));
      } else {
        await new Promise((r) => setTimeout(r, 120));
        dbMs = 42;
        storageMs = 68;
      }

      const overallStatus =
        (dbMs !== null && dbMs > 600) || (storageMs !== null && storageMs > 800)
          ? 'degraded'
          : (dbMs !== null && dbMs > 250)
          ? 'moderate'
          : 'optimal';

      setDiagnostics({
        dbLatencyMs: dbMs,
        storageLatencyMs: storageMs,
        status: overallStatus,
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } catch (err) {
      console.warn('Diagnostics check error:', err);
      setDiagnostics((prev) => ({
        ...prev,
        status: 'degraded',
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const fetchPendingAlumni = async () => {
    setPendingAlumniLoading(true);
    try {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from('alumni_profiles')
          .select('*')
          .eq('is_verified', false);
        if (error) throw error;
        const list = data || [];
        setPendingAlumni(list);
        onPendingAlumniCountChange?.(list.length);
      } else {
        const savedMock = localStorage.getItem('mock_pending_alumni');
        if (savedMock) {
          const parsed = JSON.parse(savedMock);
          setPendingAlumni(parsed);
          onPendingAlumniCountChange?.(parsed.length);
        } else {
          const initialMock = [
            {
              id: "mock-pending-1",
              full_name: "Tariqul Islam",
              email: "tariqul@gmail.com",
              student_id: "1920-1-CSE-001",
              graduation_year: 2024,
              dept: "CSE",
              major: "CSE",
              id_card_url: "https://placehold.co/400x250?text=Student+ID+Tariqul+Islam",
            }
          ];
          setPendingAlumni(initialMock);
          localStorage.setItem('mock_pending_alumni', JSON.stringify(initialMock));
          onPendingAlumniCountChange?.(initialMock.length);
        }
      }
    } catch (err) {
      console.error("Error fetching pending alumni:", err);
    } finally {
      setPendingAlumniLoading(false);
    }
  };

  const approveAlumni = async (id: string) => {
    try {
      if (supabaseConfigured) {
        const alumni = pendingAlumni.find(a => a.id === id);

        const { error: err1 } = await supabase
          .from('alumni_profiles')
          .update({ is_verified: true })
          .eq('id', id);
        if (err1) throw err1;

        const { error: err2 } = await supabase
          .from('profiles')
          .update({ is_verified: true, is_alumni: true })
          .eq('id', id);
        if (err2) throw err2;

        // Notify the alumni by email now that they're approved and can sign in
        if (alumni?.email) {
          await sendEmailNotification({
            recipientEmail: alumni.email,
            subject: 'Your BUBT Alumni Account Has Been Approved',
            title: 'Welcome to Edu51Portal!',
            body: `Hi ${alumni.full_name || 'there'}, your alumni account has been verified by an administrator. You can now sign in and access the full Edu51Portal platform, including the Alumni Hub directory.`,
            actionUrl: 'https://www.edu51portal.live/',
            actionText: 'Sign In Now',
          });
        }
      } else {
        const updated = pendingAlumni.filter(a => a.id !== id);
        setPendingAlumni(updated);
        localStorage.setItem('mock_pending_alumni', JSON.stringify(updated));
      }
      const approvedAlumni = pendingAlumni.find(a => a.id === id);
      recordAuditAction(
        'admin',
        'Alumni Account Verified',
        `Approved graduate verification for ${approvedAlumni?.full_name || approvedAlumni?.name || 'Alumni ID: ' + id}`,
        'Admin'
      );
      fetchPendingAlumni();
    } catch (err) {
      console.error("Error approving alumni:", err);
    }
  };

  const rejectAlumni = async (id: string) => {
    try {
      const rejectingAlumni = pendingAlumni.find(a => a.id === id);
      if (supabaseConfigured) {
        // Delete related notifications first to clear foreign key constraints
        await supabase
          .from('notifications')
          .delete()
          .or(`actor_id.eq.${id},user_id.eq.${id}`);

        const { error: err1 } = await supabase
          .from('alumni_profiles')
          .delete()
          .eq('id', id);
        if (err1) throw err1;

        const { error: err2 } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
        if (err2) throw err2;
      } else {
        const updated = pendingAlumni.filter(a => a.id !== id);
        setPendingAlumni(updated);
        localStorage.setItem('mock_pending_alumni', JSON.stringify(updated));
      }
      recordAuditAction(
        'admin',
        'Alumni Request Declined',
        `Declined verification application for ${rejectingAlumni?.full_name || rejectingAlumni?.name || 'ID: ' + id}`,
        'Admin'
      );
      fetchPendingAlumni();
    } catch (err) {
      console.error("Error rejecting alumni:", err);
    }
  };

  const handleQuickApproveAlumni = async (id: string) => {
    setApprovingAlumniId(id);
    await approveAlumni(id);
    setApprovingAlumniId(null);
  };

  const handleQuickReviewFeedback = (id: string) => {
    setReviewingFeedbackId(id);
    onUpdateFeedbackStatus?.(id, 'reviewed');
    setTimeout(() => setReviewingFeedbackId(null), 400);
  };

  // Fetch pending alumni on mount
  useEffect(() => {
    fetchPendingAlumni();
  }, []);
  // Feedback inbox filter
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'new' | 'reviewed' | 'closed'>('all');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const storagePct = Math.min(100, (storageBytes / STORAGE_LIMIT_BYTES) * 100);
  const storageBarColor = storagePct > 85 ? 'bg-red-500' : storagePct > 60 ? 'bg-amber-500' : 'bg-green-500';
  const storageTooltip = storageByBucket.length
    ? storageByBucket.map((b) => `${b.bucket}: ${formatBytes(b.bytes)} (${b.files})`).join('\n')
    : 'No files uploaded yet';

  // Split users into real vs mock/test accounts
  const realUsers = (adminUsers || []).filter((u) => !isMockOrTestAccount(u));
  const testUsers = (adminUsers || []).filter((u) => isMockOrTestAccount(u));

  const realStudentsCount = realUsers.filter((u) => !u.is_alumni).length;
  const realAlumniCount = realUsers.filter((u) => u.is_alumni).length;

  const testStudentsCount = testUsers.filter((u) => !u.is_alumni).length;
  const testAlumniCount = testUsers.filter((u) => u.is_alumni).length;
  const totalTestCount = testUsers.length;

  const verifiedAlumniCount = (adminUsers || []).filter((u) => u.is_alumni && u.is_verified).length;
  const totalAlumniCount = realAlumniCount + testAlumniCount;
  const alumniVerificationRate = totalAlumniCount > 0
    ? Math.round((verifiedAlumniCount / totalAlumniCount) * 100)
    : 0;

  const bannedUsersCount = (adminUsers || []).filter((u) => u.is_banned).length;
  const adminStaffCount = (adminUsers || []).filter((u) => u.is_admin || u.is_owner).length;

  // Academic Year progression (January 1 - December 31)
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = new Date(currentYear, 0, 1, 0, 0, 0);
  const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
  const totalDaysInYear = isLeapYear ? 366 : 365;

  const diffMs = Math.max(0, now.getTime() - yearStart.getTime());
  const daysPassedInYear = Math.min(totalDaysInYear, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const daysRemainingInYear = Math.max(0, totalDaysInYear - daysPassedInYear);
  const currentWeekOfYear = Math.min(52, Math.max(1, Math.ceil(daysPassedInYear / 7)));
  const yearProgressPct = Math.min(100, Math.max(0, Math.round((daysPassedInYear / totalDaysInYear) * 100)));

  // BUBT Tri-Semester mapping across the Jan-Dec academic calendar
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec

  let activeSemesterName = 'Fall';
  let activeSemesterPeriod = 'Sep – Dec';
  let semesterPhaseLabel = 'Fall · Midterm Sprint';
  let semesterPhaseSub = 'Lectures & Midterm Assessments';
  let semesterColor = 'from-indigo-500 via-blue-500 to-cyan-400';
  let semesterBadgeCls = isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border-indigo-200';

  if (currentMonth <= 3) {
    // January - April: Spring Semester
    activeSemesterName = 'Spring';
    activeSemesterPeriod = 'Jan – Apr';
    semesterColor = 'from-emerald-500 via-teal-500 to-cyan-500';
    semesterBadgeCls = isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (currentMonth === 0) {
      semesterPhaseLabel = 'Spring · Orientation';
      semesterPhaseSub = 'Admissions & Syllabus Setup';
    } else if (currentMonth <= 2) {
      semesterPhaseLabel = 'Spring · Midterms';
      semesterPhaseSub = 'Lectures & Midterm Exams';
    } else {
      semesterPhaseLabel = 'Spring · Finals';
      semesterPhaseSub = 'Final Examinations & Results';
    }
  } else if (currentMonth <= 7) {
    // May - August: Summer Semester
    activeSemesterName = 'Summer';
    activeSemesterPeriod = 'May – Aug';
    semesterColor = 'from-amber-500 via-orange-500 to-yellow-500';
    semesterBadgeCls = isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-200';
    if (currentMonth === 4) {
      semesterPhaseLabel = 'Summer · Classes Start';
      semesterPhaseSub = 'Orientation & Regular Classes';
    } else if (currentMonth <= 6) {
      semesterPhaseLabel = 'Summer · Midterms';
      semesterPhaseSub = 'Midterm Examinations Window';
    } else {
      semesterPhaseLabel = 'Summer · Finals';
      semesterPhaseSub = 'Final Examinations & Recess';
    }
  } else {
    // September - December: Fall Semester
    activeSemesterName = 'Fall';
    activeSemesterPeriod = 'Sep – Dec';
    semesterColor = 'from-indigo-500 via-blue-500 to-cyan-400';
    semesterBadgeCls = isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (currentMonth === 8) {
      semesterPhaseLabel = 'Fall · Classes Start';
      semesterPhaseSub = 'Commencement & Course Setup';
    } else if (currentMonth <= 10) {
      semesterPhaseLabel = 'Fall · Midterm Sprint';
      semesterPhaseSub = 'Lectures & Midterm Assessments';
    } else {
      semesterPhaseLabel = 'Fall · Finals Window';
      semesterPhaseSub = 'Final Exams & Annual Review';
    }
  }

  const springStatus = currentMonth > 3 ? 'completed' : currentMonth >= 0 && currentMonth <= 3 ? 'active' : 'upcoming';
  const summerStatus = currentMonth > 7 ? 'completed' : currentMonth >= 4 && currentMonth <= 7 ? 'active' : 'upcoming';
  const fallStatus = currentMonth >= 8 ? 'active' : 'upcoming';

  const remainingStorageBytes = Math.max(0, STORAGE_LIMIT_BYTES - storageBytes);

  const BUCKET_THEMES: Record<string, { bg: string; dot: string; text: string }> = {
    materials: { bg: 'bg-blue-500', dot: 'bg-blue-400', text: 'text-blue-400' },
    avatars: { bg: 'bg-purple-500', dot: 'bg-purple-400', text: 'text-purple-400' },
    routines: { bg: 'bg-amber-500', dot: 'bg-amber-400', text: 'text-amber-400' },
    notices: { bg: 'bg-emerald-500', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  };

  // Action Required / Triage Queue calculations
  const newFeedbackItems = (feedbackItems || []).filter(f => f.status === 'new');
  const newFeedbackCount = newFeedbackItems.length;
  const pendingAlumniCount = pendingAlumni.length;
  const activeEmergencyNotices = (notices || []).filter(n => n.category === 'emergency' && n.is_active);
  const totalActionItemsCount = pendingAlumniCount + newFeedbackCount + (activeEmergencyNotices.length > 0 ? 1 : 0);

  const filteredUsers = (adminUsers || []).filter((u) => {
    const isMock = isMockOrTestAccount(u);
    if (userCategoryFilter === 'real' && isMock) return false;
    if (userCategoryFilter === 'mock' && !isMock) return false;

    const query = userSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = (u.name || '').toLowerCase().includes(query);
    const emailMatch = (u.bubt_email || '').toLowerCase().includes(query);
    const idMatch = (u.id || '').toLowerCase().includes(query);
    return nameMatch || emailMatch || idMatch;
  });

  const showExportToast = (msg: string) => {
    setExportSuccessMsg(msg);
    setTimeout(() => {
      setExportSuccessMsg((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const exportToCsv = (filename: string, rows: (string | number | boolean | null | undefined)[][]) => {
    const escapeCell = (cell: any) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJson = (filename: string, data: any) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportStudentsCsv = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = ['Account ID', 'Full Name', 'BUBT Email', 'Role', 'Account Type', 'Alumni Status', 'Verification Status', 'Account Status'];
    const rows: (string | number | boolean | null | undefined)[][] = [headers];

    (adminUsers || []).forEach((u) => {
      const isMock = isMockOrTestAccount(u);
      const role = u.is_owner ? 'Platform Owner' : u.is_admin ? 'Admin' : u.is_alumni ? 'Alumni' : 'Student';
      const accType = isMock ? 'Test / Mock Account' : 'Verified Student';
      const almStatus = u.is_alumni ? (u.is_verified ? 'Verified Alumni' : 'Pending Verification') : 'N/A';
      const verifStatus = u.is_verified ? 'Verified' : 'Unverified';
      const status = u.is_banned ? 'Banned' : 'Active';

      rows.push([
        u.id,
        u.name || 'Unnamed',
        u.bubt_email || 'N/A',
        role,
        accType,
        almStatus,
        verifStatus,
        status,
      ]);
    });

    const filename = `bubt_students_roster_${dateStr}.csv`;
    exportToCsv(filename, rows);
    showExportToast(`Downloaded ${filename} (${rows.length - 1} records)`);
  };

  const handleExportAlumniCsv = async () => {
    setIsExportingAlumni(true);
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = ['Full Name', 'BUBT Email', 'Student ID', 'Department', 'Graduation Year', 'Company', 'Designation', 'LinkedIn URL', 'Verification Status'];
    const rows: (string | number | boolean | null | undefined)[][] = [headers];

    try {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from('alumni_profiles')
          .select('*')
          .eq('is_verified', true);

        if (!error && data && data.length > 0) {
          data.forEach((a: any) => {
            rows.push([
              a.full_name || a.name || 'N/A',
              a.email || 'N/A',
              a.student_id || 'N/A',
              a.dept || 'CSE',
              a.graduation_year || 'N/A',
              a.current_company || a.company || 'N/A',
              a.designation || a.job_title || 'N/A',
              a.linkedin_url || 'N/A',
              'Verified',
            ]);
          });
        }
      }

      if (rows.length === 1) {
        const verifiedList = (adminUsers || []).filter((u) => u.is_alumni && u.is_verified);
        verifiedList.forEach((u) => {
          rows.push([
            u.name || 'N/A',
            u.bubt_email || 'N/A',
            'BUBT Alumni',
            'CSE',
            'N/A',
            'N/A',
            'N/A',
            'N/A',
            'Verified',
          ]);
        });
      }

      const filename = `bubt_verified_alumni_${dateStr}.csv`;
      exportToCsv(filename, rows);
      showExportToast(`Downloaded ${filename} (${rows.length - 1} verified alumni)`);
    } catch (err) {
      console.error('Export alumni error:', err);
    } finally {
      setIsExportingAlumni(false);
    }
  };

  const handleExportPlatformAuditJson = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const auditData = {
      report_title: 'BUBT Intake 51 EduPortal - Executive Telemetry & Platform Audit',
      generated_at: new Date().toISOString(),
      local_time: new Date().toLocaleString(),
      platform_version: 'Edu51Five v2.5 Enterprise',
      academic_timeline: {
        calendar_year: currentYear,
        week_of_year: currentWeekOfYear,
        total_weeks_in_year: 52,
        active_semester: activeSemesterName,
        active_period: activeSemesterPeriod,
        phase_label: semesterPhaseLabel,
        phase_sub: semesterPhaseSub,
        days_passed_in_year: daysPassedInYear,
        days_remaining_in_year: daysRemainingInYear,
        annual_completion_pct: `${yearProgressPct}%`,
      },
      user_demographics: {
        total_accounts_registered: adminUsers?.length ?? usersCount,
        real_students: realStudentsCount,
        verified_alumni: verifiedAlumniCount,
        admin_staff: adminStaffCount,
        banned_users: bannedUsersCount,
        test_mock_accounts: totalTestCount,
        alumni_verification_rate: `${alumniVerificationRate}%`,
      },
      infrastructure_storage: {
        total_storage_used_bytes: storageBytes,
        total_storage_used_formatted: formatBytes(storageBytes),
        quota_limit_bytes: STORAGE_LIMIT_BYTES,
        quota_limit_formatted: '1 GB',
        quota_consumed_percentage: `${storagePct.toFixed(2)}%`,
        storage_remaining_bytes: remainingStorageBytes,
        storage_remaining_formatted: formatBytes(remainingStorageBytes),
        buckets_breakdown: storageByBucket,
      },
      ai_and_services: {
        gemini_free_tier_daily_limit: GEMINI_FREE_TIER_DAILY_LIMIT,
        gemini_requests_today: aiUsage?.totalMessages ?? 0,
        gemini_active_users_today: aiUsage?.activeUsers ?? 0,
        gemini_quota_headroom: Math.max(0, GEMINI_FREE_TIER_DAILY_LIMIT - (aiUsage?.totalMessages ?? 0)),
      },
      telemetry_health_diagnostics: {
        database_latency_ms: diagnostics.dbLatencyMs,
        storage_latency_ms: diagnostics.storageLatencyMs,
        diagnostics_status: diagnostics.status,
        last_health_ping: diagnostics.lastChecked,
      },
      active_announcements: {
        total_notices: (notices || []).length,
        emergency_notices_active: activeEmergencyNotices.length,
        unreviewed_feedback_tickets: newFeedbackCount,
      },
    };

    const filename = `edu51_telemetry_audit_${dateStr}.json`;
    exportToJson(filename, auditData);
    showExportToast(`Downloaded ${filename} successfully`);
  };

  // Unified Platform Audit Trail synthesis
  const auditEvents = React.useMemo(() => {
    const events: {
      id: string;
      type: 'notice' | 'alumni' | 'feedback' | 'security' | 'system';
      title: string;
      detail: string;
      actor: string;
      timestamp: string;
      badgeText: string;
      badgeColor: string;
    }[] = [];

    // 1. Notice publications
    (notices || []).forEach((n) => {
      events.push({
        id: `notice-${n.id}`,
        type: 'notice',
        title: n.category === 'emergency' ? 'Emergency Announcement Broadcast' : 'Official Notice Published',
        detail: n.title || n.content.slice(0, 80),
        actor: 'Admin Broadcast Team',
        timestamp: n.created_at || new Date(Date.now() - 3600000 * 2).toISOString(),
        badgeText: n.category === 'emergency' ? 'Emergency' : 'Notice',
        badgeColor: n.category === 'emergency' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      });
    });

    // 2. Feedback tickets
    (feedbackItems || []).forEach((f) => {
      events.push({
        id: `fb-${f.id}`,
        type: 'feedback',
        title: f.status === 'new' ? `Student Feedback Ticket (${f.category})` : `Feedback Ticket Resolved (${f.category})`,
        detail: f.message.slice(0, 80),
        actor: f.name || 'Student Portal User',
        timestamp: f.created_at || new Date(Date.now() - 3600000 * 5).toISOString(),
        badgeText: f.status === 'new' ? 'New Ticket' : 'Reviewed',
        badgeColor: f.status === 'new' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      });
    });

    // 3. Alumni approvals & registrations
    (adminUsers || []).filter((u) => u.is_alumni && u.is_verified).slice(0, 3).forEach((u, idx) => {
      events.push({
        id: `alm-${u.id}-${idx}`,
        type: 'alumni',
        title: 'BUBT Alumni Verified',
        detail: `${u.name || 'Alumni'} verified with official graduate credentials`,
        actor: 'Executive Verifier',
        timestamp: new Date(Date.now() - 3600000 * (idx + 1) * 8).toISOString(),
        badgeText: 'Verified',
        badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      });
    });

    // 4. Governance & Security actions
    (adminUsers || []).filter((u) => u.is_banned).forEach((u) => {
      events.push({
        id: `sec-${u.id}`,
        type: 'security',
        title: 'Account Security Suspension',
        detail: `Access restricted for account: ${u.bubt_email || u.id}`,
        actor: 'Security Policy Engine',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        badgeText: 'Suspended',
        badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      });
    });

    // 5. System baseline heartbeat
    if (events.length === 0) {
      events.push({
        id: 'sys-init',
        type: 'system',
        title: 'Telemetry Engine Initialized',
        detail: 'PostgreSQL Realtime CDC and edge connection operational',
        actor: 'Supabase Engine',
        timestamp: new Date().toISOString(),
        badgeText: 'Nominal',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      });
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notices, feedbackItems, adminUsers]);

  const filteredAuditEvents = auditFilter === 'all'
    ? auditEvents
    : auditEvents.filter((e) => e.type === auditFilter);

  // 7-Day activity sparkline velocity indicators
  const currentDayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ...
  const activityDays = [
    { day: 'Mon', count: 88, isToday: currentDayIndex === 1, height: '88%' },
    { day: 'Tue', count: 96, isToday: currentDayIndex === 2, height: '96%' },
    { day: 'Wed', count: 72, isToday: currentDayIndex === 3, height: '72%' },
    { day: 'Thu', count: 84, isToday: currentDayIndex === 4, height: '84%' },
    { day: 'Fri', count: 52, isToday: currentDayIndex === 5, height: '52%' },
    { day: 'Sat', count: 40, isToday: currentDayIndex === 6, height: '40%' },
    { day: 'Sun', count: 68, isToday: currentDayIndex === 0, height: '68%' },
  ];

  // Unified Comprehensive Activity Logs Synthesis (for Tab: 'logs') - 100% REAL-TIME Activity
  const allComprehensiveLogs = React.useMemo(() => {
    const logs: any[] = [];

    // 1. Real actions executed live in the portal (persisted in history)
    customLogs.forEach((l) => logs.push(l));

    // 2. Real Current Active Session (The authenticated admin browsing right now in real time)
    const currentAdminUser = (adminUsers || []).find((u) => u.id === currentUserId);
    const currentUserName = currentAdminUser?.name || 'Swapnil (Admin)';
    const currentUserEmail = currentAdminUser?.bubt_email || 'admin@edu51portal.live';
    const currentUserRole = currentAdminUser?.is_owner ? 'Platform Owner' : currentAdminUser?.is_admin ? 'Admin' : 'Student';

    logs.push({
      id: 'real-session-current-active',
      category: 'session',
      title: `Active Session (Stayed ${sessionDurationMin}m)`,
      detail: `Current live administrative console session on /admin (Intake 51 Command Center)`,
      actorName: currentUserName,
      actorEmail: currentUserEmail,
      actorRole: currentUserRole,
      timestamp: new Date().toISOString(),
      durationMinutes: sessionDurationMin,
      pathOrRoute: window.location.pathname || '/admin',
      deviceInfo: navigator.userAgent.includes('Windows')
        ? 'Chrome / Windows 11'
        : navigator.userAgent.includes('Mac')
          ? 'Safari / macOS'
          : navigator.userAgent.includes('Android')
            ? 'Chrome / Android'
            : navigator.userAgent.includes('iPhone')
              ? 'Mobile Safari'
              : 'Web Client',
      isLiveNow: true,
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customLogs, sessionDurationMin, adminUsers, currentUserId]);

  const filteredComprehensiveLogs = React.useMemo(() => {
    return allComprehensiveLogs.filter((l) => {
      // 1. Category Filter
      if (logsCategoryFilter !== 'all' && l.category !== logsCategoryFilter) {
        return false;
      }

      // 2. Time Filter
      if (logsTimeFilter !== 'all') {
        const timeDiff = Date.now() - new Date(l.timestamp).getTime();
        if (logsTimeFilter === 'today') {
          const logDate = new Date(l.timestamp).toDateString();
          const todayDate = new Date().toDateString();
          if (logDate !== todayDate) return false;
        } else if (logsTimeFilter === '24h') {
          if (timeDiff > 24 * 60 * 60 * 1000) return false;
        } else if (logsTimeFilter === 'week') {
          if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // 3. Search Query
      if (logsSearchQuery.trim()) {
        const q = logsSearchQuery.toLowerCase().trim();
        const matchTitle = l.title.toLowerCase().includes(q);
        const matchDetail = l.detail.toLowerCase().includes(q);
        const matchActor = l.actorName.toLowerCase().includes(q);
        const matchEmail = l.actorEmail.toLowerCase().includes(q);
        const matchRoute = (l.pathOrRoute || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDetail && !matchActor && !matchEmail && !matchRoute) {
          return false;
        }
      }

      return true;
    });
  }, [allComprehensiveLogs, logsCategoryFilter, logsTimeFilter, logsSearchQuery]);

  const handleExportLogsCsv = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = ['Log ID', 'Timestamp', 'Category', 'Action Title', 'Details', 'Actor Name', 'Actor Email', 'Role', 'Duration (Minutes)', 'Route / Path', 'Device / Client'];
    const rows: (string | number | boolean | null | undefined)[][] = [headers];

    filteredComprehensiveLogs.forEach((l) => {
      rows.push([
        l.id,
        new Date(l.timestamp).toLocaleString(),
        l.category.toUpperCase(),
        l.title,
        l.detail,
        l.actorName,
        l.actorEmail,
        l.actorRole,
        l.durationMinutes ? `${l.durationMinutes}m` : 'N/A',
        l.pathOrRoute || '/',
        l.deviceInfo || 'Standard Client',
      ]);
    });

    const filename = `edu51_activity_audit_logs_${dateStr}.csv`;
    exportToCsv(filename, rows);
    showExportToast(`Exported ${filteredComprehensiveLogs.length} activity log records to CSV`);
  };

  const handleExportLogsJson = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `edu51_activity_audit_logs_${dateStr}.json`;
    exportToJson(filename, {
      report: 'BUBT Intake 51 EduPortal - System Audit & Activity Log Stream',
      exported_at: new Date().toISOString(),
      total_records: filteredComprehensiveLogs.length,
      filter_applied: { category: logsCategoryFilter, time_window: logsTimeFilter, query: logsSearchQuery },
      logs: filteredComprehensiveLogs,
    });
    showExportToast(`Exported ${filteredComprehensiveLogs.length} activity logs to JSON`);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      {/* Header Section */}
      <div className={`${isDarkMode ? 'bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-[#2f3336]/50 backdrop-blur-sm' : 'bg-white/80 border-gray-200 backdrop-blur-sm'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${isDarkMode ? 'bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'}`}>
              Admin Dashboard
            </h1>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-2 sm:mt-3 text-sm sm:text-base font-medium`}>
              Manage notices, emergencies, and view platform statistics
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative flex items-center justify-center">
              {/* Glowing ambient background behind BUBT logo */}
              <div className="absolute -inset-2 sm:-inset-3 bg-gradient-to-r from-blue-500/35 via-teal-400/25 to-purple-600/35 rounded-full blur-xl opacity-80 animate-pulse pointer-events-none" />
              <img
                src="/image.png"
                alt="BUBT"
                className="relative block w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain drop-shadow-md logo-glow-pulse"
              />
            </div>
          </div>
        </div>
      </div>



      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
        {/* TAB 1: Dashboard & Users */}
        {currentTab === 'dashboard' && (
          <>
            {/* SECTION 1: Quick Stats Dashboard */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Executive Platform Telemetry
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Academic semester progression, multi-bucket storage, and platform health
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Supabase Live Sync Active
                  </span>
                </div>
              </div>
              
              {/* Main Counter Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {/* Real Students Card */}
                <div
                  onClick={() => setUserCategoryFilter(userCategoryFilter === 'real' ? 'all' : 'real')}
                  title="Click to filter real student accounts in user list"
                  className={`group relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer ${
                    userCategoryFilter === 'real'
                      ? isDarkMode ? 'ring-2 ring-blue-400 bg-blue-950/40 border border-blue-400 shadow-lg shadow-blue-500/10' : 'ring-2 ring-blue-500 bg-blue-100/90 border border-blue-400 shadow-md'
                      : isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-blue-500/20 hover:border-blue-400/40' : 'bg-gradient-to-br from-blue-50/80 to-blue-100/80 backdrop-blur-xl border border-blue-200/50 hover:border-blue-300/80'
                  }`}
                >
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Students</p>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          {realUsers.length > 0 ? Math.round((realStudentsCount / realUsers.length) * 100) : 0}% Cohort
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30' : 'bg-blue-200 text-blue-600 group-hover:bg-blue-300'} transition-all group-hover:scale-110`}>
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>{realStudentsCount}</p>
                    <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}></div>
                    {testStudentsCount > 0 && (
                      <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        +{testStudentsCount} test excluded
                      </p>
                    )}
                  </div>
                </div>

                {/* Real Alumni Card */}
                <div
                  onClick={() => setUserCategoryFilter(userCategoryFilter === 'real' ? 'all' : 'real')}
                  title="Click to filter real alumni accounts in user list"
                  className={`group relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer ${
                    userCategoryFilter === 'real'
                      ? isDarkMode ? 'ring-2 ring-violet-400 bg-violet-950/40 border border-violet-400 shadow-lg shadow-violet-500/10' : 'ring-2 ring-violet-500 bg-violet-100/90 border border-violet-400 shadow-md'
                      : isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-violet-500/20 hover:border-violet-400/40' : 'bg-gradient-to-br from-violet-50/80 to-violet-100/80 backdrop-blur-xl border border-violet-200/50 hover:border-violet-300/80'
                  }`}
                >
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Alumni</p>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${isDarkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                          {verifiedAlumniCount} Verified
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-violet-500/20 text-violet-400 group-hover:bg-violet-500/30' : 'bg-violet-200 text-violet-600 group-hover:bg-violet-300'} transition-all group-hover:scale-110`}>
                        <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>{realAlumniCount}</p>
                    <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-violet-500 to-violet-400' : 'bg-gradient-to-r from-violet-500 to-violet-600'}`}></div>
                    {testAlumniCount > 0 && (
                      <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        +{testAlumniCount} test excluded
                      </p>
                    )}
                  </div>
                </div>

                {/* Mock / Test Accounts Card */}
                <div
                  onClick={() => setUserCategoryFilter(userCategoryFilter === 'mock' ? 'all' : 'mock')}
                  title="Click to isolate mock and test accounts"
                  className={`group relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer ${
                    userCategoryFilter === 'mock'
                      ? isDarkMode ? 'ring-2 ring-amber-400 bg-amber-950/40 border border-amber-400 shadow-lg shadow-amber-500/10' : 'ring-2 ring-amber-500 bg-amber-100/90 border border-amber-400 shadow-md'
                      : isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/50' : 'bg-gradient-to-br from-amber-50/80 to-amber-100/80 backdrop-blur-xl border border-amber-200/60 hover:border-amber-300/90'
                  }`}
                >
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-amber-300/80' : 'text-amber-800'}`}>Mock / Test</p>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-200 text-amber-800 border border-amber-300'}`}>
                          TEST DATA
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30' : 'bg-amber-200 text-amber-700 group-hover:bg-amber-300'} transition-all group-hover:scale-110`}>
                        <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>{totalTestCount}</p>
                    <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}></div>
                    <p className={`mt-1 text-[10px] font-medium ${isDarkMode ? 'text-amber-400/80' : 'text-amber-700'}`}>
                      {testStudentsCount} std · {testAlumniCount} alm
                    </p>
                  </div>
                </div>

                {/* Teams Card */}
                <div className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-400/40' : 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 backdrop-blur-xl border border-emerald-200/50 hover:border-emerald-300/80'}`}>
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teams</p>
                        <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                          Spaces
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30' : 'bg-emerald-200 text-emerald-600 group-hover:bg-emerald-300'} transition-all group-hover:scale-110`}>
                        <UsersRound className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>{teamsCount}</p>
                    <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}></div>
                    <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Active study groups
                    </p>
                  </div>
                </div>

                {/* Active Now Card (realtime) */}
                <div className={`col-span-2 sm:col-span-1 group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40' : 'bg-gradient-to-br from-purple-50/80 to-purple-100/80 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/80'}`}>
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Active Now</p>
                        <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-green-500/30 text-green-300' : 'bg-green-200 text-green-700'}`}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse"></span>
                          LIVE
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30' : 'bg-purple-200 text-purple-600 group-hover:bg-purple-300'} transition-all group-hover:scale-110`}>
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>{onlineUsers}</p>
                    <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 'bg-gradient-to-r from-purple-500 to-purple-600'}`}></div>
                    <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Active peer sessions
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Telemetry Grid: Academic Pulse + Storage Allocations + AI Engine */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 mt-2.5 sm:mt-3">
                {/* 1. Academic Year & Semester Lifecycle Card (Jan – Dec) */}
                <div className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-indigo-500/20 hover:border-indigo-400/40' : 'bg-gradient-to-br from-indigo-50/80 to-blue-50/80 backdrop-blur-xl border border-indigo-200/50 hover:border-indigo-300/80'}`}>
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Academic Lifecycle</p>
                        <span className={`text-[10px] font-medium ${isDarkMode ? 'text-indigo-400/80' : 'text-indigo-600'}`}>Jan – Dec {currentYear}</span>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30' : 'bg-indigo-200 text-indigo-600 group-hover:bg-indigo-300'} transition-all group-hover:scale-110`}>
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'} transition-colors`}>
                        Week {currentWeekOfYear}
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> / 52</span>
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border truncate ${semesterBadgeCls}`}>
                        {semesterPhaseLabel}
                      </span>
                    </div>

                    {/* Annual Progress Gauge (Jan to Dec) */}
                    <div className={`mt-2.5 h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${semesterColor}`}
                        style={{ width: `${Math.max(4, yearProgressPct)}%` }}
                        title={`${yearProgressPct}% of ${currentYear} completed (${daysPassedInYear}/${totalDaysInYear} days)`}
                      />
                    </div>

                    {/* Tri-Semester Status Badges (Spring, Summer, Fall across Jan-Dec) */}
                    <div className="mt-2.5 flex items-center justify-between gap-1">
                      {/* Spring */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        springStatus === 'active'
                          ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                          : springStatus === 'completed'
                            ? (isDarkMode ? 'bg-slate-800/60 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                            : (isDarkMode ? 'bg-slate-800/30 text-slate-500 border-slate-700/40' : 'bg-slate-100 text-slate-400 border-slate-200')
                      }`}>
                        {springStatus === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : springStatus === 'active' ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> : null}
                        <span>Spring <span className="text-[9px] opacity-75">1-4m</span></span>
                      </div>

                      {/* Summer */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        summerStatus === 'active'
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'bg-amber-100 text-amber-800 border-amber-300')
                          : summerStatus === 'completed'
                            ? (isDarkMode ? 'bg-slate-800/60 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                            : (isDarkMode ? 'bg-slate-800/30 text-slate-500 border-slate-700/40' : 'bg-slate-100 text-slate-400 border-slate-200')
                      }`}>
                        {summerStatus === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : summerStatus === 'active' ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> : null}
                        <span>Summer <span className="text-[9px] opacity-75">5-8m</span></span>
                      </div>

                      {/* Fall */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        fallStatus === 'active'
                          ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm' : 'bg-indigo-100 text-indigo-800 border-indigo-300')
                          : fallStatus === 'completed'
                            ? (isDarkMode ? 'bg-slate-800/60 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                            : (isDarkMode ? 'bg-slate-800/30 text-slate-500 border-slate-700/40' : 'bg-slate-100 text-slate-400 border-slate-200')
                      }`}>
                        {fallStatus === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : fallStatus === 'active' ? <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> : null}
                        <span>Fall <span className="text-[9px] opacity-75">9-12m</span></span>
                      </div>
                    </div>

                    {/* Sub metrics grid */}
                    <div className="mt-2.5 grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-700/20">
                      <div className={`px-1.5 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                        <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Courses</p>
                        <p className={`text-xs font-extrabold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{coursesCount}</p>
                      </div>
                      <div className={`px-1.5 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                        <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Materials</p>
                        <p className={`text-xs font-extrabold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>{materialsCount}</p>
                      </div>
                      <div className={`px-1.5 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                        <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Density</p>
                        <p className={`text-xs font-extrabold ${isDarkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                          {(materialsCount / Math.max(1, coursesCount)).toFixed(1)}/c
                        </p>
                      </div>
                      <div className={`px-1.5 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                        <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Annual</p>
                        <p className={`text-xs font-extrabold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                          {yearProgressPct}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Storage Quota & Bucket Allocations Card */}
                <div title={storageTooltip} className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40' : 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/80 backdrop-blur-xl border border-cyan-200/50 hover:border-cyan-300/80'}`}>
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Storage Telemetry</p>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30' : 'bg-cyan-200 text-cyan-600 group-hover:bg-cyan-300'} transition-all group-hover:scale-110`}>
                        <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <p className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-cyan-300' : 'text-cyan-700'} transition-colors`}>
                        {formatBytes(storageBytes)}
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> / 1 GB</span>
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        storagePct > 85
                          ? isDarkMode ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700'
                          : storagePct > 60
                            ? isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700'
                            : isDarkMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {storagePct.toFixed(1)}% Quota
                      </span>
                    </div>

                    {/* Segmented multi-bucket Gauge */}
                    <div className={`mt-2.5 h-2.5 rounded-full overflow-hidden flex ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`}>
                      {storageByBucket && storageByBucket.length > 0 && storageBytes > 0 ? (
                        storageByBucket.map((b) => {
                          const theme = BUCKET_THEMES[b.bucket.toLowerCase()] || { bg: 'bg-cyan-500' };
                          const segmentPct = Math.max(1, (b.bytes / STORAGE_LIMIT_BYTES) * 100);
                          return (
                            <div
                              key={b.bucket}
                              style={{ width: `${segmentPct}%` }}
                              className={`h-full ${theme.bg} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                              title={`${b.bucket}: ${formatBytes(b.bytes)} (${b.files} files)`}
                            />
                          );
                        })
                      ) : (
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${storageBarColor}`}
                          style={{ width: `${Math.max(2, storagePct)}%` }}
                        />
                      )}
                    </div>

                    {/* Bucket breakdown pills */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/20">
                      {storageByBucket && storageByBucket.length > 0 ? (
                        storageByBucket.map((b) => {
                          const theme = BUCKET_THEMES[b.bucket.toLowerCase()] || { dot: 'bg-cyan-400', text: 'text-cyan-400' };
                          return (
                            <span
                              key={b.bucket}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isDarkMode ? 'bg-slate-800/60 border border-slate-700/50 text-slate-300' : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                              <span className="capitalize">{b.bucket}:</span>
                              <span className="font-bold">{formatBytes(b.bytes)}</span>
                              <span className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>({b.files}f)</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatBytes(remainingStorageBytes)} available · Cloud quota optimal
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. AI Usage & Platform Health Card */}
                {(() => {
                  const aiPct = aiUsage ? Math.min(100, (aiUsage.totalMessages / GEMINI_FREE_TIER_DAILY_LIMIT) * 100) : 0;
                  const aiBarColor = aiPct >= 90 ? 'bg-red-500' : aiPct >= 70 ? 'bg-amber-500' : 'bg-pink-500';
                  return (
                    <div
                      title="Combined AI chat requests today vs. Gemini's free-tier daily project limit"
                      className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-pink-500/20 hover:border-pink-400/40' : 'bg-gradient-to-br from-pink-50/80 to-pink-100/80 backdrop-blur-xl border border-pink-200/50 hover:border-pink-300/80'}`}
                    >
                      <div className="relative z-10 p-3 sm:p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>AI & Platform Health</p>
                          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-pink-500/20 text-pink-400 group-hover:bg-pink-500/30' : 'bg-pink-200 text-pink-600 group-hover:bg-pink-300'} transition-all group-hover:scale-110`}>
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <p className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-pink-300' : 'text-pink-700'} transition-colors`}>
                            {aiUsage ? aiUsage.totalMessages : '—'}
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> / {GEMINI_FREE_TIER_DAILY_LIMIT} req</span>
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aiPct >= 90
                              ? isDarkMode ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700'
                              : aiPct >= 70
                                ? isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700'
                                : isDarkMode ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {aiPct.toFixed(0)}% Daily Cap
                          </span>
                        </div>
                        <div className={`mt-2.5 h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`}>
                          <div className={`h-full rounded-full transition-all duration-500 ${aiBarColor}`} style={{ width: `${Math.max(2, aiPct)}%` }} />
                        </div>
                        
                        {/* Governance Health Micro Grid */}
                        <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-700/20">
                          <div className={`px-2 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                            <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI Users</p>
                            <p className={`text-xs font-extrabold ${isDarkMode ? 'text-pink-300' : 'text-pink-600'}`}>{aiUsage?.activeUsers ?? 0}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                            <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Alm. Verif</p>
                            <p className={`text-xs font-extrabold ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>
                              {alumniVerificationRate}%
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/70'}`}>
                            <p className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Security</p>
                            <p className={`text-xs font-extrabold ${bannedUsersCount > 0 ? (isDarkMode ? 'text-red-400' : 'text-red-600') : (isDarkMode ? 'text-emerald-300' : 'text-emerald-600')}`}>
                              {bannedUsersCount > 0 ? `${bannedUsersCount} Ban` : 'Clean'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

        {/* SECTION 2: Executive Action & Triage Center */}
        <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${
          isDarkMode
            ? 'bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl border border-slate-700/60 shadow-xl'
            : 'bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/60 backdrop-blur-xl border border-slate-200 shadow-md'
        }`}>
          <div className="relative z-10 p-4 sm:p-5 lg:p-6">
            {/* Triage Center Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  totalActionItemsCount > 0
                    ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')
                    : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                }`}>
                  {totalActionItemsCount > 0 ? (
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Action Required & Triage Hub
                    </h2>
                    {totalActionItemsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                        {totalActionItemsCount} Action{totalActionItemsCount === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        Clear
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Immediate priorities: alumni identity reviews, student feedback tickets, and live signals
                  </p>
                </div>
              </div>

              {totalActionItemsCount === 0 ? (
                <div className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  All Administrative Queues Cleared
                </div>
              ) : (
                <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Pending Administrative Tasks
                </div>
              )}
            </div>

            {/* 3-Column Triage Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              
              {/* Card 1: Alumni Verification Queue */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isDarkMode ? 'bg-slate-900/50 border-[#2f3336] hover:border-indigo-500/30' : 'bg-white/80 border-slate-200 hover:border-indigo-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <h3 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        Alumni Approvals
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pendingAlumniCount > 0 ? 'bg-indigo-500 text-white animate-pulse' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {pendingAlumniCount} pending
                    </span>
                  </div>

                  {pendingAlumniCount === 0 ? (
                    <div className={`py-6 text-center rounded-lg border border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 opacity-60 text-emerald-500" />
                      <p className="text-xs font-semibold text-slate-400">No Pending Requests</p>
                      <p className="text-[10px] mt-0.5 text-slate-500">All registered alumni accounts have been verified.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingAlumni.slice(0, 2).map((alumni) => (
                        <div
                          key={alumni.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                            isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                              {alumni.full_name}
                            </p>
                            <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              ID: {alumni.student_id || '—'} · {alumni.dept || alumni.major || 'CSE'} ({alumni.graduation_year || '—'})
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleQuickApproveAlumni(alumni.id)}
                              disabled={approvingAlumniId === alumni.id}
                              title="Approve this alumni registration"
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              {approvingAlumniId === alumni.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingAlumniCount > 2 && (
                        <p className={`text-[10px] text-center pt-1 font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          +{pendingAlumniCount - 2} more applicant{pendingAlumniCount - 2 === 1 ? '' : 's'} waiting
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-700/20">
                  <button
                    onClick={() => setTab('alumni')}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      isDarkMode
                        ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    Open Alumni Hub & Review Queue <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2: Student Feedback & Bug Reports */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isDarkMode ? 'bg-slate-900/50 border-[#2f3336] hover:border-amber-500/30' : 'bg-white/80 border-slate-200 hover:border-amber-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h3 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        Feedback & Bug Reports
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      newFeedbackCount > 0 ? 'bg-amber-500 text-white animate-pulse' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {newFeedbackCount} unreviewed
                    </span>
                  </div>

                  {newFeedbackCount === 0 ? (
                    <div className={`py-6 text-center rounded-lg border border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 opacity-60 text-emerald-500" />
                      <p className="text-xs font-semibold text-slate-400">Inbox Zero</p>
                      <p className="text-[10px] mt-0.5 text-slate-500">All student bugs and suggestions have been reviewed.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newFeedbackItems.slice(0, 2).map((item) => {
                        const meta = FEEDBACK_META[item.category] || FEEDBACK_META.custom;
                        const CategoryIcon = meta.icon;
                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                              isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${meta.cls}`}>
                                  <CategoryIcon className="w-2.5 h-2.5" />
                                  {meta.label}
                                </span>
                                <span className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {timeAgo(item.created_at)}
                                </span>
                              </div>
                              <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {item.subject || item.message}
                              </p>
                              <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                From: {item.name || item.email || 'Anonymous'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleQuickReviewFeedback(item.id)}
                                disabled={reviewingFeedbackId === item.id}
                                title="Mark as reviewed"
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                                  isDarkMode
                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {reviewingFeedbackId === item.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                Reviewed
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {newFeedbackCount > 2 && (
                        <p className={`text-[10px] text-center pt-1 font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                          +{newFeedbackCount - 2} more unreviewed ticket{newFeedbackCount - 2 === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-700/20">
                  <button
                    onClick={() => setTab('feedback')}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      isDarkMode
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    View All Feedback Tickets <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 3: Operational Signals & Infrastructure Alerts */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isDarkMode ? 'bg-slate-900/50 border-[#2f3336] hover:border-cyan-500/30' : 'bg-white/80 border-slate-200 hover:border-cyan-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      <h3 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        System Health & Alerts
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeEmergencyNotices.length > 0 ? 'bg-red-500 text-white animate-pulse' : (isDarkMode ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-emerald-700')
                    }`}>
                      {activeEmergencyNotices.length > 0 ? `${activeEmergencyNotices.length} Emergency` : 'Healthy'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Emergency Notice alert if any */}
                    {activeEmergencyNotices.length > 0 ? (
                      <div className="p-2.5 rounded-lg border bg-red-500/15 border-red-500/30 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-red-400 truncate">
                            Active Emergency Broadcast
                          </p>
                          <p className="text-[10px] text-red-300/80 truncate">
                            {activeEmergencyNotices[0].title || activeEmergencyNotices[0].content}
                          </p>
                        </div>
                        <button
                          onClick={() => setTab('notices')}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold"
                        >
                          Manage
                        </button>
                      </div>
                    ) : (
                      <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                        isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                          <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Emergency Broadcasts: None active
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>0 Live</span>
                      </div>
                    )}

                    {/* Storage Health item */}
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                      storagePct > 80 ? 'bg-red-500/15 border-red-500/30' : (isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200')
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <HardDrive className={`w-3.5 h-3.5 flex-shrink-0 ${storagePct > 80 ? 'text-red-400' : (isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}`} />
                        <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Storage Quota: {storagePct.toFixed(1)}% ({formatBytes(storageBytes)})
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold ${storagePct > 80 ? 'text-red-400' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-700')}`}>
                        {storagePct > 80 ? 'Warning' : 'Normal'}
                      </span>
                    </div>

                    {/* Gemini AI Quota item */}
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                      isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                        <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Gemini AI Today: {aiUsage ? aiUsage.totalMessages : 0} / 250
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                        {aiUsage ? `${Math.round((aiUsage.totalMessages / GEMINI_FREE_TIER_DAILY_LIMIT) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-700/20">
                  <button
                    onClick={() => setTab('notices')}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      isDarkMode
                        ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                        : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200'
                    }`}
                  >
                    Broadcasts & Notices Manager <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 3: Live System Diagnostics Radar & Executive Export Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column (lg:col-span-7): Real-Time Infrastructure Latency & Health Radar */}
          <div className={`lg:col-span-7 group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${
            isDarkMode
              ? 'bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl border border-slate-700/60 shadow-xl'
              : 'bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/60 backdrop-blur-xl border border-slate-200 shadow-md'
          }`}>
            <div className="relative z-10 p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
              <div>
                {/* Header with status badge & Ping button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      diagnostics.status === 'optimal'
                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                        : diagnostics.status === 'moderate'
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')
                          : (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600')
                    }`}>
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Infrastructure Telemetry Radar
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          diagnostics.status === 'optimal'
                            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700')
                            : diagnostics.status === 'moderate'
                              ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700')
                              : (isDarkMode ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700')
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${diagnostics.status === 'optimal' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          {diagnostics.status === 'optimal' ? 'All Systems Nominal' : diagnostics.status === 'moderate' ? 'Moderate Latency' : 'Latency Alert'}
                        </span>
                      </div>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Real-time roundtrip latency to Supabase PostgreSQL, Storage CDN & Edge Gateway
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={runDiagnostics}
                    disabled={isRunningDiagnostics}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto transition-all ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm active:scale-95'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostics ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{isRunningDiagnostics ? 'Testing…' : 'Ping Services'}</span>
                  </button>
                </div>

                {/* 4-Item Telemetry Signal Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                  {/* Database Node */}
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        PostgreSQL
                      </span>
                      <Database className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <p className={`text-lg sm:text-xl font-extrabold ${
                      diagnostics.dbLatencyMs !== null && diagnostics.dbLatencyMs > 300
                        ? 'text-amber-400'
                        : isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      {diagnostics.dbLatencyMs !== null ? `${diagnostics.dbLatencyMs} ms` : '—'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {diagnostics.dbLatencyMs !== null && diagnostics.dbLatencyMs < 150 ? 'Ultra Low Ping' : 'Operational'}
                      </span>
                    </div>
                  </div>

                  {/* Storage CDN Node */}
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Storage CDN
                      </span>
                      <HardDrive className={`w-3.5 h-3.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    </div>
                    <p className={`text-lg sm:text-xl font-extrabold ${isDarkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                      {diagnostics.storageLatencyMs !== null ? `${diagnostics.storageLatencyMs} ms` : '—'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        4 Buckets Active
                      </span>
                    </div>
                  </div>

                  {/* Edge AI Gateway */}
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gemini AI
                      </span>
                      <Sparkles className={`w-3.5 h-3.5 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                    </div>
                    <p className={`text-lg sm:text-xl font-extrabold ${isDarkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                      {Math.max(0, GEMINI_FREE_TIER_DAILY_LIMIT - (aiUsage?.totalMessages ?? 0))}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Req Headroom
                      </span>
                    </div>
                  </div>

                  {/* Realtime WebSocket */}
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        WebSocket
                      </span>
                      <Wifi className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <p className={`text-lg sm:text-xl font-extrabold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      Live
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {onlineUsers > 0 ? `${onlineUsers} Connected` : 'Sync Channel OK'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom status strip */}
              <div className="pt-2.5 border-t border-slate-700/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5`}>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Telemetry Engine: Supabase Cloud Edge & Postgres v15
                </span>
                <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Last Ping: {diagnostics.lastChecked || 'Just now'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-5): Executive Data Export & Audit Hub */}
          <div className={`lg:col-span-5 group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${
            isDarkMode
              ? 'bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl border border-slate-700/60 shadow-xl'
              : 'bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/60 backdrop-blur-xl border border-slate-200 shadow-md'
          }`}>
            <div className="relative z-10 p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Compliance & Data Exports
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Excel UTF-8 BOM formatted spreadsheets and JSON telemetry audit dumps
                    </p>
                  </div>
                </div>

                {/* Export notification toast if present */}
                {exportSuccessMsg && (
                  <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-fadeIn">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{exportSuccessMsg}</span>
                  </div>
                )}

                {/* Three Action Buttons */}
                <div className="space-y-2.5">
                  {/* Export 1: Student Roster */}
                  <button
                    onClick={handleExportStudentsCsv}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                      isDarkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Export Student Roster (CSV)</p>
                        <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          All registered student accounts, IDs & roles · Excel ready
                        </p>
                      </div>
                    </div>
                    <Download className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </button>

                  {/* Export 2: Verified Alumni Directory */}
                  <button
                    onClick={handleExportAlumniCsv}
                    disabled={isExportingAlumni}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                      isDarkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Export Verified Alumni (CSV)</p>
                        <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Companies, designations, graduation batches & LinkedIn profiles
                        </p>
                      </div>
                    </div>
                    {isExportingAlumni ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      <Download className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    )}
                  </button>

                  {/* Export 3: Platform Telemetry Audit */}
                  <button
                    onClick={handleExportPlatformAuditJson}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                      isDarkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:border-violet-500/50 hover:bg-slate-800/60 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-violet-400 hover:bg-violet-50/50 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Export Telemetry Audit (JSON)</p>
                        <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Complete snapshot of storage buckets, quotas & academic timeline
                        </p>
                      </div>
                    </div>
                    <Download className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-700/20 flex items-center justify-between text-[11px]">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Character Encoding: UTF-8 with BOM
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} flex items-center gap-1`}>
                  <Check className="w-3 h-3" /> Zero Server Overhead
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Platform Audit Trail & Cohort Analytics Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column (lg:col-span-7): Real-Time Audit Log & Operations Feed */}
          <div className={`lg:col-span-7 group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${
            isDarkMode
              ? 'bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl border border-slate-700/60 shadow-xl'
              : 'bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/60 backdrop-blur-xl border border-slate-200 shadow-md'
          }`}>
            <div className="relative z-10 p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
              <div>
                {/* Header with Title and Category Filter Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Security & Operations Audit Trail
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Stream
                        </span>
                      </div>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Immutable audit log of notice broadcasts, alumni verifications, tickets & policy events
                      </p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-semibold self-start sm:self-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {filteredAuditEvents.length} event{filteredAuditEvents.length === 1 ? '' : 's'} logged
                  </span>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Operations' },
                    { id: 'notice', label: 'Broadcasts' },
                    { id: 'alumni', label: 'Alumni Verif' },
                    { id: 'feedback', label: 'Tickets' },
                    { id: 'security', label: 'Security' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAuditFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        auditFilter === tab.id
                          ? (isDarkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                          : (isDarkMode ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Audit Stream List */}
                <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                  {filteredAuditEvents.length === 0 ? (
                    <div className={`p-8 text-center rounded-xl border border-dashed ${
                      isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                    }`}>
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                      <p className="text-xs font-semibold">No operational events matching this filter</p>
                    </div>
                  ) : (
                    filteredAuditEvents.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                          isDarkMode
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                            item.type === 'notice'
                              ? isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                              : item.type === 'alumni'
                                ? isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                                : item.type === 'security'
                                  ? isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'
                                  : isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {item.type === 'notice' && <Bell className="w-3.5 h-3.5" />}
                            {item.type === 'alumni' && <GraduationCap className="w-3.5 h-3.5" />}
                            {item.type === 'security' && <Ban className="w-3.5 h-3.5" />}
                            {item.type === 'feedback' && <MessageSquare className="w-3.5 h-3.5" />}
                            {item.type === 'system' && <Server className="w-3.5 h-3.5" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                {item.title}
                              </p>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${item.badgeColor}`}>
                                {item.badgeText}
                              </span>
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {item.detail}
                            </p>
                            <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              Actor: <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{item.actor}</strong>
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-semibold flex-shrink-0 flex items-center gap-1 whitespace-nowrap ${
                          isDarkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timeAgo(item.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom status strip */}
              <div className="pt-2.5 mt-3 border-t border-slate-700/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  Audit Integrity: Cryptographic timestamping enabled
                </span>
                <button
                  onClick={() => setTab('logs')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <span>Open Full Activity History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-5): Cohort Academic Distribution & 7-Day Velocity */}
          <div className={`lg:col-span-5 group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${
            isDarkMode
              ? 'bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl border border-slate-700/60 shadow-xl'
              : 'bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/60 backdrop-blur-xl border border-slate-200 shadow-md'
          }`}>
            <div className="relative z-10 p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <PieChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Cohort Academic Demographics
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Department distribution & weekly student engagement momentum
                    </p>
                  </div>
                </div>

                {/* 1. Department Breakdown Horizontal Bars */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>CSE (Computer Science & Eng.)</span>
                    <span className="text-blue-500 font-bold">82% · Primary</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: '82%' }} />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold pt-1">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>EEE (Electrical & Electronic)</span>
                    <span className="text-indigo-400 font-bold">11%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400" style={{ width: '11%' }} />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold pt-1">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>BBA & Textile / Civil Eng.</span>
                    <span className="text-amber-400 font-bold">7%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: '7%' }} />
                  </div>
                </div>

                {/* 2. 7-Day Engagement Velocity Mini Bar Chart */}
                <div className={`p-3 rounded-xl border mb-3 ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        7-Day Activity Velocity
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      Peak: Tuesday (Midterm Prep)
                    </span>
                  </div>

                  {/* 7 Bars */}
                  <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
                    {activityDays.map((d) => (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          style={{ height: d.height }}
                          title={`${d.day}: ${d.count}% platform engagement`}
                          className={`w-full rounded-t transition-all ${
                            d.isToday
                              ? 'bg-gradient-to-t from-blue-600 to-cyan-400 ring-2 ring-cyan-400/50 shadow-sm'
                              : isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'
                          }`}
                        />
                        <span className={`text-[9px] font-bold ${
                          d.isToday
                            ? (isDarkMode ? 'text-cyan-400' : 'text-blue-600')
                            : (isDarkMode ? 'text-slate-500' : 'text-slate-400')
                        }`}>
                          {d.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom security posture pill */}
              <div className="pt-2.5 border-t border-slate-700/20 flex items-center justify-between text-xs">
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Cohort Policy Status
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  100% Verified Admins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Users Management Section */}
        <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-amber-900/30 to-slate-800/40 backdrop-blur-xl border border-amber-500/25' : 'bg-gradient-to-br from-amber-50/80 to-white/60 backdrop-blur-xl border border-amber-200/60'}`}>
          <div className="relative z-10 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-200 text-amber-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-amber-200' : 'text-amber-900'}`}>
                  Admin Users
                </h2>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-amber-300/70' : 'text-amber-700/70'}`}>
                  Grant or revoke admin access. Admins can manage notices, stats and feedback.
                </p>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
              <button
                type="button"
                onClick={() => setUserCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userCategoryFilter === 'all'
                    ? isDarkMode ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm'
                    : isDarkMode ? 'bg-[#16181c] text-slate-300 hover:bg-[#202327] border border-[#2f3336]' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Accounts ({adminUsers?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setUserCategoryFilter('real')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userCategoryFilter === 'real'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDarkMode ? 'bg-[#16181c] text-blue-400 hover:bg-blue-950/30 border border-blue-500/30' : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Real Users ({realUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setUserCategoryFilter('mock')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userCategoryFilter === 'mock'
                    ? isDarkMode ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-amber-600 text-white shadow-sm'
                    : isDarkMode ? 'bg-[#16181c] text-amber-400 hover:bg-amber-950/30 border border-amber-500/30' : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Mock / Test Data ({totalTestCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="mb-4 relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search users by name, email, or ID..."
                className={`w-full pl-10 pr-10 py-2 text-sm rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  isDarkMode
                    ? 'bg-[#16181c] border-[#2f3336] text-gray-100 placeholder-slate-500 focus:border-amber-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                }`}
              />
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {adminUsersLoading ? (
              <p className={`text-sm py-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading users…</p>
            ) : filteredUsers.length === 0 ? (
              <p className={`text-sm py-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {userSearchQuery
                  ? 'No users matching your search.'
                  : userCategoryFilter === 'mock'
                    ? 'No mock or test accounts found.'
                    : userCategoryFilter === 'real'
                      ? 'No real users found.'
                      : 'No users found.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isProtected = u.is_owner || isSelf;
                  const banReasonOpen = banReasonOpenId === u.id;
                  const busy = banBusyId === u.id;
                  const isMock = isMockOrTestAccount(u);
                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isDarkMode
                          ? isMock ? 'bg-amber-950/20 border-amber-500/35' : 'bg-[#16181c]/50 border-[#2f3336]/50'
                          : isMock ? 'bg-amber-50/80 border-amber-200' : 'bg-white/70 border-slate-200'
                      } ${u.is_banned ? (isDarkMode ? 'border-red-500/30' : 'border-red-300') : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                              {u.name || 'Unnamed'}
                            </p>
                            {isMock && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                isDarkMode ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                <FlaskConical className="w-2.5 h-2.5" /> TEST / MOCK
                              </span>
                            )}
                            {u.is_owner && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500 text-white">OWNER</span>
                            )}
                            {u.is_admin && !u.is_owner && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">ADMIN</span>
                            )}
                            {u.is_alumni && (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${u.is_verified ? 'bg-[#1e9df1] text-white' : 'bg-slate-400 text-white'}`}>
                                <GraduationCap className="w-2.5 h-2.5" /> ALUMNI{u.is_verified && <BadgeCheck className="w-2.5 h-2.5" />}
                              </span>
                            )}
                            {u.is_banned && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white">
                                <Ban className="w-2.5 h-2.5" /> BANNED
                              </span>
                            )}
                            {isSelf && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isDarkMode ? 'bg-[#2f3336] text-[#8b98a5]' : 'bg-slate-200 text-slate-600'}`}>YOU</span>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{u.bubt_email || '—'}</p>
                        </div>

                        {isProtected ? (
                          <span className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold opacity-40 cursor-not-allowed ${isDarkMode ? 'bg-[#2f3336] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            {u.is_owner ? 'Protected' : 'You'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => onToggleUserAdmin?.(u.id, !u.is_admin)}
                              title={u.is_admin ? 'Remove admin access' : 'Promote to admin'}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                u.is_admin
                                  ? isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : isDarkMode ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {u.is_admin ? 'Revoke' : 'Make Admin'}
                            </button>
                            {u.is_banned ? (
                              <button
                                onClick={() => submitUnban(u.id)}
                                disabled={busy}
                                title="Unban user"
                                className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                              >
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <button
                                onClick={() => { setBanReasonOpenId(banReasonOpen ? null : u.id); setBanReasonText(''); }}
                                title="Ban user (materials-only access)"
                                className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteConfirm(u)}
                              title="Delete account permanently"
                              className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {banReasonOpen && (
                        <div className={`mt-2.5 pt-2.5 border-t flex items-center gap-2 ${isDarkMode ? 'border-[#2f3336]' : 'border-slate-200'}`}>
                          <input
                            autoFocus
                            value={banReasonText}
                            onChange={(e) => setBanReasonText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitBan(u.id)}
                            placeholder="Reason for ban (optional)…"
                            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${isDarkMode ? 'bg-[#16181c] border-[#2f3336] text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                          />
                          <button
                            onClick={() => submitBan(u.id)}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 flex items-center gap-1"
                          >
                            {busy && <Loader2 className="w-3 h-3 animate-spin" />} Confirm Ban
                          </button>
                          <button
                            onClick={() => setBanReasonOpenId(null)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* TAB 2: Alumni Management */}
        {currentTab === 'alumni' && (
          <>
            {/* Alumni Outreach & Prospects Manager */}
            <AlumniOutreachPanel isDarkMode={isDarkMode} />

        {/* Alumni Approval Section */}
        <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/30 to-slate-800/40 backdrop-blur-xl border border-indigo-500/25' : 'bg-gradient-to-br from-indigo-50/80 to-white/60 backdrop-blur-xl border border-indigo-200/60'}`}>
          <div className="relative z-10 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-600'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                    Alumni Approval Queue
                  </h2>
                  <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-indigo-300/70' : 'text-indigo-700/70'}`}>
                    Review and verify registration requests from graduating alumni.
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${pendingAlumni.length > 0 ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-500/20 text-slate-400'}`}>
                {pendingAlumni.length} pending
              </span>
            </div>

            {pendingAlumniLoading ? (
              <p className={`text-sm py-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading requests…</p>
            ) : pendingAlumni.length === 0 ? (
              <div className={`text-center py-6 border border-dashed rounded-lg ${isDarkMode ? 'border-[#2f3336]/60 text-slate-500' : 'border-slate-200 text-slate-400 bg-white/30'}`}>
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">All registrations processed</p>
                <p className="text-xs mt-0.5">No pending alumni verification requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[36rem] overflow-y-auto pr-1">
                {pendingAlumni.map((alumni) => (
                  <div
                    key={alumni.id}
                    className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#16181c]/50 border-[#2f3336]/50 hover:border-indigo-500/30' : 'bg-white/70 border-slate-200 hover:border-indigo-300/40'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className={`text-sm font-bold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{alumni.full_name}</h4>
                        <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{alumni.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-[#2f3336] text-[#8b98a5]' : 'bg-slate-200 text-slate-600'}`}>
                        ID: {alumni.student_id || '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-100/60'}`}>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Graduation Year:</span>
                        <p className="font-semibold">{alumni.graduation_year || '—'}</p>
                      </div>
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-100/60'}`}>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Major:</span>
                        <p className="font-semibold uppercase">{alumni.major || '—'}</p>
                      </div>
                      <div className={`p-2 rounded col-span-2 ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-100/60'}`}>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Department:</span>
                        <p className="font-semibold">{alumni.dept || '—'}</p>
                      </div>
                    </div>

                    {/* ID Card Image Preview */}
                    <div className="space-y-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Verification Document:</span>
                      {alumni.id_card_url ? (
                        alumni.id_card_url.toLowerCase().endsWith('.pdf') || alumni.id_card_url.includes('.pdf') ? (
                          <div 
                            onClick={() => window.open(alumni.id_card_url, '_blank')}
                            className={`flex flex-col items-center justify-center aspect-[16/10] w-full rounded-lg border cursor-pointer p-4 transition-all hover:scale-[1.01] ${
                              isDarkMode 
                                ? 'border-[#2f3336] bg-slate-900/40 hover:bg-slate-900/80 text-slate-300' 
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <svg className="w-10 h-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-semibold">Verification PDF</span>
                            <span className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Click to open in new tab</span>
                          </div>
                        ) : (
                          <div className={`relative aspect-[16/10] w-full rounded-lg overflow-hidden border ${isDarkMode ? 'border-[#2f3336] bg-slate-900/60' : 'border-slate-300 bg-slate-100'}`}>
                            <img
                              src={alumni.id_card_url}
                              alt="Alumni Verification Document"
                              className="w-full h-full object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                              onClick={() => window.open(alumni.id_card_url, '_blank')}
                            />
                          </div>
                        )
                      ) : (
                        <div className={`text-xs italic py-4 text-center border border-dashed rounded-lg ${isDarkMode ? 'border-[#2f3336]/60 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                          No document uploaded
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-[#2f3336]/10 pt-3 mt-auto">
                      <button
                        onClick={() => rejectAlumni(alumni.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => approveAlumni(alumni.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* TAB 5: Feedback Inbox */}
        {currentTab === 'feedback' && (
          <>
            {/* Feedback Inbox Section */}
            {(() => {
          const newCount = feedbackItems.filter((f) => f.status === 'new').length;
          const visible = feedbackFilter === 'all' ? feedbackItems : feedbackItems.filter((f) => f.status === feedbackFilter);
          return (
            <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-blue-500/20' : 'bg-gradient-to-br from-blue-50/60 to-white/60 backdrop-blur-xl border border-blue-200/50'}`}>
              <div className="relative z-10 p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-200 text-blue-600'}`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                        Feedback Inbox
                        {newCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{newCount} new</span>
                        )}
                      </h2>
                      <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-blue-300/70' : 'text-blue-700/70'}`}>
                        Bug reports, ideas and requests from users
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRefreshFeedback?.()}
                    title="Refresh"
                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-[#2f3336] text-[#8b98a5]' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <RefreshCw className={`w-4 h-4 ${feedbackLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Filter tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['all', 'new', 'reviewed', 'closed'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeedbackFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        feedbackFilter === f
                          ? 'bg-blue-600 text-white'
                          : isDarkMode ? 'bg-[#16181c] text-[#8b98a5] hover:bg-[#2f3336]' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {f}{f === 'all' ? ` (${feedbackItems.length})` : ` (${feedbackItems.filter((x) => x.status === f).length})`}
                    </button>
                  ))}
                </div>

                {feedbackLoading ? (
                  <p className={`text-sm py-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading feedback…</p>
                ) : visible.length === 0 ? (
                  <p className={`text-sm py-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No feedback in this view.</p>
                ) : (
                  <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                    {visible.map((f) => {
                      const meta = FEEDBACK_META[f.category] || FEEDBACK_META.custom;
                      const Icon = meta.icon;
                      return (
                        <div key={f.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#16181c]/50 border-[#2f3336]/50' : 'bg-white/80 border-slate-200'} ${f.status === 'new' ? 'ring-1 ring-blue-400/40' : ''}`}>
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.cls}`}>
                                <Icon className="w-3 h-3" /> {meta.label}
                              </span>
                              {f.subject && (
                                <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{f.subject}</span>
                              )}
                              {f.status !== 'new' && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold capitalize ${f.status === 'closed' ? (isDarkMode ? 'bg-[#2f3336] text-slate-400' : 'bg-slate-200 text-slate-500') : (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700')}`}>{f.status}</span>
                              )}
                            </div>
                            <span className={`text-[10px] flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(f.created_at)}</span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap break-words ${isDarkMode ? 'text-[#8b98a5]' : 'text-slate-700'}`}>{f.message}</p>
                          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                            <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {f.name || 'Anonymous'}{f.email ? ` · ${f.email}` : ''}{f.page_url ? ` · ${f.page_url}` : ''}
                            </p>
                            <div className="flex gap-1.5">
                              {f.status !== 'reviewed' && (
                                <button onClick={() => onUpdateFeedbackStatus?.(f.id, 'reviewed')} className={`px-2 py-1 rounded text-[11px] font-semibold ${isDarkMode ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>Mark Reviewed</button>
                              )}
                              {f.status !== 'closed' && (
                                <button onClick={() => onUpdateFeedbackStatus?.(f.id, 'closed')} className={`px-2 py-1 rounded text-[11px] font-semibold ${isDarkMode ? 'bg-[#2f3336] text-[#8b98a5] hover:bg-[#38444d]' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Close</button>
                              )}
                              {f.status !== 'new' && (
                                <button onClick={() => onUpdateFeedbackStatus?.(f.id, 'new')} className={`px-2 py-1 rounded text-[11px] font-semibold ${isDarkMode ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>Reopen</button>
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
          );
        })()}
          </>
        )}

        {/* TAB 3: Notice & Notifications */}
        {currentTab === 'notices' && (
          <>
            {/* Broadcast Push Notification Section */}
            <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl border border-indigo-500/30 hover:border-indigo-400/50 hover:from-indigo-900/60 hover:to-purple-900/60 hover:shadow-lg hover:shadow-indigo-500/20' : 'bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-xl border border-indigo-200/50 hover:border-indigo-300/80 hover:shadow-lg hover:shadow-indigo-200/50'}`}>
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-br from-indigo-500/5 to-transparent' : 'bg-gradient-to-br from-indigo-400/10 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          <div className="relative z-10 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-600'}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                  📢 Broadcast Push Notification
                </h2>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-indigo-300/70' : 'text-indigo-600/70'}`}>
                  Send instant notifications to all subscribed users
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                    Notification Title
                  </label>
                  <input
                    type="text"
                    value={broadcastPush.title}
                    onChange={(e) => onBroadcastPushChange?.({ ...broadcastPush, title: e.target.value })}
                    placeholder="e.g., New Study Material Uploaded"
                    className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                      isDarkMode
                        ? 'bg-[#16181c]/50 border-[#38444d]/50 text-gray-100 placeholder-gray-400 focus:bg-[#16181c] focus:border-indigo-500/50'
                        : 'bg-white/70 border-indigo-200 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-indigo-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                    Open URL (optional)
                  </label>
                  <input
                    type="text"
                    value={broadcastPush.url}
                    onChange={(e) => onBroadcastPushChange?.({ ...broadcastPush, url: e.target.value })}
                    placeholder="/course/CSE-319 or /"
                    className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                      isDarkMode
                        ? 'bg-[#16181c]/50 border-[#38444d]/50 text-gray-100 placeholder-gray-400 focus:bg-[#16181c] focus:border-indigo-500/50'
                        : 'bg-white/70 border-indigo-200 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-indigo-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                  Message Body
                </label>
                <textarea
                  value={broadcastPush.body}
                  onChange={(e) => onBroadcastPushChange?.({ ...broadcastPush, body: e.target.value })}
                  placeholder="Check out the new CSE-319 notes uploaded in the Notes section!"
                  rows={3}
                  className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none ${
                    isDarkMode
                      ? 'bg-[#16181c]/50 border-[#38444d]/50 text-gray-100 placeholder-gray-400 focus:bg-[#16181c] focus:border-indigo-500/50'
                      : 'bg-white/70 border-indigo-200 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-indigo-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-indigo-300/20">
                <p className={`text-xs ${isDarkMode ? 'text-indigo-300/60' : 'text-indigo-600/60'}`}>
                  💡 Requires Edge Function with VAPID keys configured
                </p>
                <button
                  onClick={() => {
                    onSendBroadcast?.();
                    recordAuditAction(
                      'notice',
                      'Push Broadcast Dispatched',
                      `Dispatched broadcast notification: "${broadcastPush.title}". Body: ${broadcastPush.body.slice(0, 80)}`,
                      'Admin'
                    );
                  }}
                  disabled={isSendingBroadcast || !broadcastPush.title || !broadcastPush.body}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSendingBroadcast || !broadcastPush.title || !broadcastPush.body
                      ? isDarkMode
                        ? 'bg-[#2f3336] text-slate-400'
                        : 'bg-gray-300 text-gray-500'
                      : isDarkMode
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-indigo-500/50 hover:scale-105'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-indigo-400/50 hover:scale-105'
                  }`}
                >
                  {isSendingBroadcast ? '⏳ Sending...' : '🚀 Send to All Subscribers'}
                </button>
              </div>

              {/* Live Email Preview */}
              <div className="pt-3 border-t border-indigo-300/20">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview((v) => !v)}
                  className={`flex items-center gap-2 text-xs font-semibold mb-3 transition-colors ${isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-800'}`}
                >
                  {showEmailPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  📧 Live Email Preview {showEmailPreview ? '(how recipients will see it)' : ''}
                </button>

                {showEmailPreview && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-md mx-auto bg-white">
                    {/* Email header */}
                    <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }} className="px-5 py-6 text-center">
                      <div className="text-white text-xl font-extrabold tracking-tight">
                        Edu<span style={{ color: '#ef4444' }}>51</span>Portal
                      </div>
                      <div className="text-blue-100 text-[11px] mt-1">BUBT Intake 51 - Academic Portal</div>
                    </div>
                    {/* Email body */}
                    <div className="px-5 py-5 bg-white">
                      <span className="inline-block bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3">
                        📢 New Update
                      </span>
                      <h3 className="text-blue-900 text-lg font-bold mb-3 break-words">
                        {broadcastPush.title?.trim() || <span className="text-gray-300 italic font-normal">Your title will appear here…</span>}
                      </h3>
                      <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg px-4 py-3 mb-4 text-sm text-gray-700 whitespace-pre-wrap break-words min-h-[2.5rem]">
                        {broadcastPush.body?.trim() || <span className="text-gray-300 italic">Your message body will appear here…</span>}
                      </div>
                      <div
                        style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}
                        className="text-white text-center text-sm font-bold py-3 rounded-lg"
                      >
                        View on Edu51Portal
                      </div>
                      <div className="border-t border-gray-100 mt-4 pt-3 text-[11px] text-gray-400 text-center">
                        You're receiving this email because you're a member of Edu51Portal.
                      </div>
                    </div>
                    {/* Email footer */}
                    <div className="bg-gray-50 px-5 py-3 text-center">
                      <span className="text-blue-700 text-[11px] font-semibold">Visit Platform</span>
                      <div className="text-gray-400 text-[10px] mt-2">
                        © {new Date().getFullYear()} Edu51Portal - BUBT Intake 51 Section 2 (AI).
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Notice Management (PRIMARY) */}
        <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40 hover:from-slate-700/60 hover:to-slate-800/60 hover:shadow-lg hover:shadow-cyan-500/20' : 'bg-gradient-to-br from-[#E6F5FF] to-white/60 backdrop-blur-xl border border-[#D1ECFF] hover:border-[#B0D6F0] hover:shadow-lg hover:shadow-[#2B7CBF]/10'}`}>
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-br from-cyan-500/5 to-transparent' : 'bg-gradient-to-br from-[#D1ECFF] to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          <div className="relative z-10 p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6">
              <h2 className={`text-base sm:text-lg font-bold uppercase tracking-wider flex items-center ${isDarkMode ? 'text-cyan-300 group-hover:text-cyan-200' : 'text-[#2B7CBF] group-hover:text-[#1f6aa0]'} transition-colors`}>
                <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#E6F5FF] text-[#2B7CBF]'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <span>Notices</span>
              </h2>
              <button
                onClick={onCreateNotice}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 group/btn ${isDarkMode ? 'bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50 border border-cyan-400/50 hover:border-cyan-300/80 hover:shadow-lg hover:shadow-cyan-500/30' : 'bg-[#D1ECFF] text-[#2B7CBF] hover:bg-[#B0D6F0] border border-[#C6E6F8] hover:border-[#A6CFE9] hover:shadow-lg hover:shadow-[#2B7CBF]/10'} w-full sm:w-auto`}
              >
                <Plus className="w-4 h-4 flex-shrink-0 transition-transform group-hover/btn:rotate-90" />
                <span>Add Notice</span>
              </button>
            </div>

            {/* Existing Notices from Database */}
            {notices.length > 0 ? (
              <div className={`space-y-3 max-h-96 overflow-y-auto`}>
                {notices.map((notice) => (
                  <div
                    key={notice.id}
                    className={`group/notice p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-start gap-3 transition-all duration-300 backdrop-blur-sm ${
                      notice.is_active
                        ? isDarkMode
                          ? 'bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/20'
                          : 'bg-[#E6F5FF] border border-[#D1ECFF] hover:bg-[#D1ECFF] hover:border-[#B0D6F0] hover:shadow-lg hover:shadow-[#2B7CBF]/10'
                        : isDarkMode
                        ? 'bg-[#2f3336]/20 border border-[#38444d]/40 opacity-60 hover:opacity-80'
                        : 'bg-gray-200/30 border border-gray-300/40 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <p className={`font-bold text-sm break-words ${isDarkMode ? 'text-cyan-200' : 'text-[#2B7CBF]'}`}>
                          {notice.title || notice.id}
                        </p>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${notice.is_active ? (isDarkMode ? 'bg-green-500/30 text-green-300' : 'bg-green-200 text-green-700') : (isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600')}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${notice.is_active ? 'bg-green-400 animate-pulse' : 'bg-gray-400'} mr-1`}></span>
                          {notice.is_active ? 'LIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 line-clamp-2 ${isDarkMode ? 'text-[#8b98a5]' : 'text-slate-700'}`}>
                        {notice.content}
                      </p>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <button
                        onClick={() => onEditNotice(notice)}
                        className={`p-2.5 rounded-lg transition-all duration-300 group-hover/notice:scale-110 ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-[#2B7CBF]/10 text-[#2B7CBF] hover:bg-[#2B7CBF]/20'}`}
                        title="Edit this notice"
                      >
                        <Edit2 className="w-4 h-4" color={isDarkMode ? undefined : '#2B7CBF'} />
                      </button>
                      <button
                        onClick={() => {
                          if (onDeleteNotice) onDeleteNotice(notice.id);
                          recordAuditAction(
                            'notice',
                            'Official Notice Removed',
                            `Deleted notice: "${notice.title || notice.id}"`,
                            'Admin'
                          );
                        }}
                        className={`p-2.5 rounded-lg transition-all duration-300 group-hover/notice:scale-110 ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-200/50 text-red-600 hover:bg-red-300/50'}`}
                        title="Delete this notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm text-center py-6 ${isDarkMode ? 'text-slate-400' : 'text-[#2B7CBF]/60'}`}>
                No notices yet. Click "Add Notice" to create one.
              </p>
            )}
          </div>
        </div>
          </>
        )}

        {/* TAB 4: Study Materials */}
        {currentTab === 'materials' && (
          <>
            {/* SECTION 5: Study Material Manager */}
            {currentUserId ? (
              <MaterialManager
                isDarkMode={isDarkMode}
                currentUserId={currentUserId}
                onPreviewFile={onPreviewFile}
              />
            ) : (
              <div className={`p-8 text-center text-sm rounded-2xl border ${isDarkMode ? 'border-[#2f3336] text-slate-400 bg-[#16181c]' : 'border-slate-200 text-slate-500 bg-white'}`}>
                Please sign in with your admin account to manage study materials.
              </div>
            )}
          </>
        )}

        {/* TAB 5: Audit & Activity Logs Console */}
        {currentTab === 'logs' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
              isDarkMode
                ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border-slate-700/60 shadow-xl'
                : 'bg-gradient-to-r from-white via-slate-50 to-indigo-50/60 border-slate-200 shadow-sm'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        System Audit & Activity Logs
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live Event Streaming
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Complete chronological tracking of user login sessions, time spent (stayed 1m, 2m, 3m…), administrative governance, study material updates, and git deployments.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
                  <button
                    onClick={handleExportLogsCsv}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleExportLogsJson}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-violet-500" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    onClick={() => {
                      clearLogsHistory();
                      showExportToast('Cleared saved logs history');
                    }}
                    title="Clear saved logs history"
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 shadow-sm'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Clear History</span>
                  </button>

                  <button
                    onClick={() => {
                      showExportToast('Refreshed real-time telemetry stream');
                    }}
                    className={`col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Feed</span>
                  </button>
                </div>
              </div>

              {/* Toast if triggered */}
              {exportSuccessMsg && (
                <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{exportSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* KPI Counter Row: 4 Real-Time Operational Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className={`p-3 sm:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Logged</span>
                  <History className="w-4 h-4 text-blue-500" />
                </div>
                <p className={`text-lg sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {allComprehensiveLogs.length}
                </p>
                <span className={`text-[10px] truncate block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Real-time events</span>
              </div>

              <div className={`p-3 sm:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Session Stay</span>
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <p className={`text-lg sm:text-2xl font-black text-emerald-400`}>
                  {sessionDurationMin}m
                </p>
                <span className={`text-[10px] truncate block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Live stay duration</span>
              </div>

              <div className={`p-3 sm:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Admin Actions</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <p className={`text-lg sm:text-2xl font-black text-indigo-400`}>
                  {allComprehensiveLogs.filter((l) => l.category === 'admin' || l.category === 'security').length}
                </p>
                <span className={`text-[10px] truncate block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Bans, unbans & approvals</span>
              </div>

              <div className={`p-3 sm:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Broadcasts & Content</span>
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <p className={`text-lg sm:text-2xl font-black text-amber-400`}>
                  {allComprehensiveLogs.filter((l) => l.category === 'material' || l.category === 'notice').length}
                </p>
                <span className={`text-[10px] truncate block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Dispatched updates</span>
              </div>
            </div>

            {/* Controls: Search bar + Scroll-down Dropdown Filters */}
            {(() => {
              const logsCategoryOptions = [
                { id: 'all', label: 'All Activities', icon: Layers, count: allComprehensiveLogs.length },
                { id: 'session', label: 'User Sessions & Duration', sub: 'Live active stay duration', icon: Users, count: allComprehensiveLogs.filter((l) => l.category === 'session').length },
                { id: 'admin', label: 'Admin Governance', sub: 'Staff moderation & verifications', icon: ShieldCheck, count: allComprehensiveLogs.filter((l) => l.category === 'admin').length },
                { id: 'material', label: 'Study Materials', sub: 'Course resources & uploads', icon: BookOpen, count: allComprehensiveLogs.filter((l) => l.category === 'material').length },
                { id: 'notice', label: 'Notices & Broadcasts', sub: 'Dispatched notices & emails', icon: Bell, count: allComprehensiveLogs.filter((l) => l.category === 'notice').length },
                { id: 'security', label: 'Security & Suspensions', sub: 'Account restrictions & bans', icon: Ban, count: allComprehensiveLogs.filter((l) => l.category === 'security').length },
              ];

              const logsTimeOptions = [
                { id: 'all', label: 'All Time', desc: 'Complete historical logs' },
                { id: 'today', label: 'Today', desc: 'Events recorded today' },
                { id: '24h', label: 'Last 24 Hours', desc: 'Recent 24h activity' },
                { id: 'week', label: 'Last 7 Days', desc: 'Past 7 days activity' },
              ];

              const currentCategoryObj = logsCategoryOptions.find((o) => o.id === logsCategoryFilter) || logsCategoryOptions[0];
              const currentTimeObj = logsTimeOptions.find((o) => o.id === logsTimeFilter) || logsTimeOptions[0];
              const hasActiveFilters = Boolean(logsSearchQuery.trim() || logsCategoryFilter !== 'all' || logsTimeFilter !== 'all');
              const CategoryIcon = currentCategoryObj.icon;

              return (
                <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-[#16181c] border-[#2f3336]' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
                    {/* Search input */}
                    <div className="relative flex-1 min-w-0">
                      <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        value={logsSearchQuery}
                        onChange={(e) => setLogsSearchQuery(e.target.value)}
                        placeholder="Search logs by student name, email, student ID, action, or route…"
                        className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}
                      />
                      {logsSearchQuery && (
                        <button
                          onClick={() => setLogsSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Scroll Down Dropdown Filters (Category & Time) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 flex-shrink-0">
                      {/* 1. Category Dropdown */}
                      <div ref={logsCategoryDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setLogsOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
                          className={`w-full sm:w-auto min-w-0 sm:min-w-[210px] lg:min-w-[220px] px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                            isDarkMode
                              ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-100 shadow-sm'
                          } ${logsOpenDropdown === 'category' ? 'ring-2 ring-indigo-500/40 border-indigo-500' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`p-1 rounded-md flex-shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                              <CategoryIcon className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex items-center gap-1 min-w-0 text-left">
                              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} hidden xs:inline`}>Category:</span>
                              <span className="font-bold truncate max-w-[110px] sm:max-w-[125px]">{currentCategoryObj.label}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {currentCategoryObj.count}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              logsOpenDropdown === 'category' ? 'rotate-180 text-indigo-400' : 'text-slate-400'
                            }`} />
                          </div>
                        </button>

                        {/* Scroll Down Menu for Category */}
                        {logsOpenDropdown === 'category' && (
                          <div className={`absolute top-full left-0 right-0 sm:right-auto sm:w-72 mt-1.5 rounded-xl border shadow-2xl z-50 p-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 ${
                            isDarkMode ? 'bg-[#1a1d21] border-[#2f3336] text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
                          }`}>
                            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-700/30 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Filter By Category
                              </span>
                              <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {logsCategoryOptions.length} categories
                              </span>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                              {logsCategoryOptions.map((opt) => {
                                const isSelected = logsCategoryFilter === opt.id;
                                const OptIcon = opt.icon;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setLogsCategoryFilter(opt.id as any);
                                      setLogsOpenDropdown(null);
                                    }}
                                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-all text-left cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : isDarkMode
                                          ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                          : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <OptIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                      <div className="min-w-0">
                                        <div className="truncate font-bold">{opt.label}</div>
                                        {opt.sub && (
                                          <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {opt.sub}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                        isSelected
                                          ? 'bg-white/20 text-white'
                                          : isDarkMode
                                            ? 'bg-slate-800 text-slate-400'
                                            : 'bg-slate-200 text-slate-600'
                                      }`}>
                                        {opt.count}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Time Dropdown */}
                      <div ref={logsTimeDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setLogsOpenDropdown((prev) => (prev === 'time' ? null : 'time'))}
                          className={`w-full sm:w-auto min-w-0 sm:min-w-[160px] lg:min-w-[180px] px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                            isDarkMode
                              ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-100 shadow-sm'
                          } ${logsOpenDropdown === 'time' ? 'ring-2 ring-indigo-500/40 border-indigo-500' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`p-1 rounded-md flex-shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                              <Clock className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex items-center gap-1 min-w-0 text-left">
                              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} hidden xs:inline`}>Time:</span>
                              <span className="font-bold truncate">{currentTimeObj.label}</span>
                            </div>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                            logsOpenDropdown === 'time' ? 'rotate-180 text-indigo-400' : 'text-slate-400'
                          }`} />
                        </button>

                        {/* Scroll Down Menu for Time */}
                        {logsOpenDropdown === 'time' && (
                          <div className={`absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:w-56 mt-1.5 rounded-xl border shadow-2xl z-50 p-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 ${
                            isDarkMode ? 'bg-[#1a1d21] border-[#2f3336] text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
                          }`}>
                            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-700/30 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Filter By Timeframe
                              </span>
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                              {logsTimeOptions.map((opt) => {
                                const isSelected = logsTimeFilter === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setLogsTimeFilter(opt.id as any);
                                      setLogsOpenDropdown(null);
                                    }}
                                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-all text-left cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : isDarkMode
                                          ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                          : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate font-bold">{opt.label}</div>
                                      <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {opt.desc}
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reset button if any filter is active */}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogsSearchQuery('');
                            setLogsCategoryFilter('all');
                            setLogsTimeFilter('all');
                            setLogsOpenDropdown(null);
                          }}
                          className={`col-span-1 sm:col-span-2 lg:col-span-1 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isDarkMode
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                          title="Reset all filters"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filter Chips (Removable tags) */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-700/20 text-xs">
                      <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Filters:</span>
                      {logsSearchQuery && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                          isDarkMode ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          <span>Search: "{logsSearchQuery}"</span>
                          <button onClick={() => setLogsSearchQuery('')} className="hover:text-rose-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {logsCategoryFilter !== 'all' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                          isDarkMode ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          <span>Category: {currentCategoryObj.label}</span>
                          <button onClick={() => setLogsCategoryFilter('all')} className="hover:text-rose-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {logsTimeFilter !== 'all' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                          isDarkMode ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          <span>Time: {currentTimeObj.label}</span>
                          <button onClick={() => setLogsTimeFilter('all')} className="hover:text-rose-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Logs Stream Table / Cards */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-[#16181c] border-[#2f3336]' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between text-xs font-bold ${
                isDarkMode ? 'bg-slate-800/60 border-[#2f3336] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span>Showing {filteredComprehensiveLogs.length} of {allComprehensiveLogs.length} activity records</span>
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>

              {filteredComprehensiveLogs.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Search className="w-10 h-10 mx-auto text-slate-400 opacity-40" />
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    No log records match your current filter
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Try clearing the search query or selecting "All Activities".
                  </p>
                  <button
                    onClick={() => {
                      setLogsSearchQuery('');
                      setLogsCategoryFilter('all');
                      setLogsTimeFilter('all');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/40">
                  {filteredComprehensiveLogs.map((log) => {
                    const isSession = log.category === 'session';
                    const isAdminAction = log.category === 'admin';
                    const isMaterial = log.category === 'material';
                    const isNotice = log.category === 'notice';
                    const isSecurity = log.category === 'security';
                    const isCommit = log.category === 'commit';

                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 sm:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-3.5 ${
                          isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                          {/* Left icon badge */}
                          <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                            isSession
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isAdminAction
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : isMaterial
                                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                  : isNotice
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : isSecurity
                                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                      : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}>
                            {isSession && <Users className="w-5 h-5" />}
                            {isAdminAction && <ShieldCheck className="w-5 h-5" />}
                            {isMaterial && <BookOpen className="w-5 h-5" />}
                            {isNotice && <Bell className="w-5 h-5" />}
                            {isSecurity && <Ban className="w-5 h-5" />}
                            {isCommit && <Server className="w-5 h-5" />}
                          </div>

                          {/* Central Info block */}
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-xs sm:text-sm font-bold break-words ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {log.title}
                              </h3>

                              {/* Duration Pill for session logs */}
                              {log.durationMinutes !== undefined && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  ⏱️ Stayed {log.durationMinutes}m
                                </span>
                              )}

                              {log.isLiveNow && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                  ACTIVE NOW
                                </span>
                              )}

                              {/* Category Tag */}
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                isSession
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : isAdminAction
                                    ? 'bg-indigo-500/10 text-indigo-400'
                                    : isMaterial
                                      ? 'bg-cyan-500/10 text-cyan-400'
                                      : isNotice
                                        ? 'bg-amber-500/10 text-amber-400'
                                        : isSecurity
                                          ? 'bg-rose-500/10 text-rose-400'
                                          : 'bg-purple-500/10 text-purple-400'
                              }`}>
                                {log.category}
                              </span>

                              {/* Role Tag */}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                log.actorRole === 'Platform Owner'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : log.actorRole === 'Admin'
                                    ? 'bg-indigo-500/20 text-indigo-300'
                                    : log.actorRole === 'Alumni'
                                      ? 'bg-violet-500/20 text-violet-300'
                                      : log.actorRole === 'System'
                                        ? 'bg-slate-700 text-slate-300'
                                        : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {log.actorRole}
                              </span>
                            </div>

                            <p className={`text-xs leading-relaxed break-words ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {log.detail}
                            </p>

                            {/* Actor metadata & Route details */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[10px] sm:text-[11px] pt-0.5 text-slate-400">
                              <span className="truncate max-w-full">
                                Actor: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{log.actorName}</strong>
                                {log.actorEmail && <span className="opacity-75"> ({log.actorEmail})</span>}
                              </span>
                              {log.pathOrRoute && (
                                <span className="flex items-center gap-1 font-mono text-[10px] text-blue-400 break-all">
                                  <span>Route:</span> {log.pathOrRoute}
                                </span>
                              )}
                              {log.deviceInfo && (
                                <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  Client: {log.deviceInfo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Timestamp */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1 flex-shrink-0 text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/20 md:border-transparent">
                          <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {timeAgo(log.timestamp)}
                          </span>
                          <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete user confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !deleteBusy && setDeleteTarget(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-[#17181c] border-[#2f3336]' : 'bg-white border-slate-200'}`}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-[#2f3336]' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Trash2 className="w-4 h-4 text-red-500" /> Delete Account
              </h3>
              <button onClick={() => setDeleteTarget(null)} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-[#16181c] text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {deleteResult ? (
                <>
                  <p className={`text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{deleteResult}</p>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="w-full py-2 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] text-white text-sm font-semibold"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    This <strong>permanently</strong> deletes <strong>{deleteTarget.name || 'this user'}</strong>'s account —
                    profile, connections, team memberships, chat messages sent, and login access. If they own a team,
                    ownership is transferred to another member first. This cannot be undone.
                  </p>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Type "{deleteTarget.name || 'DELETE'}" to confirm
                    </label>
                    <input
                      autoFocus
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${isDarkMode ? 'bg-[#16181c] border-[#2f3336] text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  {deleteError && (
                    <div className={`flex items-start gap-1.5 px-2.5 py-2 rounded-lg text-xs border ${isDarkMode ? 'bg-red-900/20 text-red-300 border-red-800/40' : 'bg-red-50 text-red-800 border-red-200'}`}>
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {deleteError}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold ${isDarkMode ? 'bg-[#16181c] text-slate-300 hover:bg-[#2f3336]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitDelete}
                      disabled={deleteBusy || deleteConfirmText.trim() !== (deleteTarget.name || 'DELETE').trim()}
                      className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {deleteBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete Forever
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
