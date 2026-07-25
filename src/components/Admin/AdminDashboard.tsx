import React, { useState, useEffect } from 'react';
import { Bell, Plus, ChevronDown, ChevronUp, AlertCircle, Trash2, Edit2, BarChart3, BookOpen, Files, Users, TrendingUp, HardDrive, UsersRound, ShieldCheck, MessageSquare, RefreshCw, Bug, Lightbulb, Sparkles, Ban, GraduationCap, BadgeCheck, X, Loader2, Search } from 'lucide-react';
import MaterialManager from './MaterialManager';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { sendEmailNotification } from '../../lib/emailNotifications';
import { getAiUsageToday, GEMINI_FREE_TIER_DAILY_LIMIT, type AiUsageToday } from '../../lib/api/adminApi';

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
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

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
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    courseManagement: false,
    materialUpload: false,
  });

  // Live email preview toggle for the broadcast composer
  const [showEmailPreview, setShowEmailPreview] = useState(true);

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

  const submitBan = async (userId: string) => {
    setBanBusyId(userId);
    await onBanUser?.(userId, banReasonText.trim());
    setBanBusyId(null);
    setBanReasonOpenId(null);
    setBanReasonText('');
  };

  const submitUnban = async (userId: string) => {
    setBanBusyId(userId);
    await onUnbanUser?.(userId);
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
    setDeleteResult(
      res.teamsTransferred?.length
        ? `Account deleted. Ownership of ${res.teamsTransferred.length} team(s) was transferred to another member.`
        : 'Account deleted.'
    );
  };

  // Alumni approval queue state
  const [pendingAlumni, setPendingAlumni] = useState<any[]>([]);
  const [pendingAlumniLoading, setPendingAlumniLoading] = useState(false);

  const [aiUsage, setAiUsage] = useState<AiUsageToday | null>(null);

  useEffect(() => {
    getAiUsageToday().then(setAiUsage);
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
        setPendingAlumni(data || []);
      } else {
        const savedMock = localStorage.getItem('mock_pending_alumni');
        if (savedMock) {
          setPendingAlumni(JSON.parse(savedMock));
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
      fetchPendingAlumni();
    } catch (err) {
      console.error("Error approving alumni:", err);
    }
  };

  const rejectAlumni = async (id: string) => {
    try {
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
      fetchPendingAlumni();
    } catch (err) {
      console.error("Error rejecting alumni:", err);
    }
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

  const filteredUsers = (adminUsers || []).filter((u) => {
    const query = userSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = (u.name || '').toLowerCase().includes(query);
    const emailMatch = (u.bubt_email || '').toLowerCase().includes(query);
    const idMatch = (u.id || '').toLowerCase().includes(query);
    return nameMatch || emailMatch || idMatch;
  });

  const totalAlumniCount = (adminUsers || []).filter((u) => u.is_alumni).length;
  const totalStudentsCount = (adminUsers || []).filter((u) => !u.is_alumni).length;

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
          <img
            src="/image.png"
            alt="BUBT"
            className="block w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain flex-shrink-0 opacity-90"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
        {/* SECTION 1: Quick Stats Dashboard */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Platform Statistics
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* Storage Used Card (spans 2 cols on mobile for the gauge) */}
            <div title={storageTooltip} className={`col-span-2 group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40' : 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/80 backdrop-blur-xl border border-cyan-200/50 hover:border-cyan-300/80'}`}>
              <div className="relative z-10 p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Storage Used</p>
                  </div>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30' : 'bg-cyan-200 text-cyan-600 group-hover:bg-cyan-300'} transition-all group-hover:scale-110`}>
                    <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-cyan-300' : 'text-cyan-700'} transition-colors`}>
                  {formatBytes(storageBytes)}
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> / 1 GB</span>
                </p>
                {/* Gauge */}
                <div className={`mt-2.5 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${storageBarColor}`} style={{ width: `${Math.max(2, storagePct)}%` }} />
                </div>
                <p className={`mt-1.5 text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {storagePct.toFixed(1)}% used · hover for per-bucket breakdown
                </p>
              </div>
            </div>

            {/* Students Card */}
            <div className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-blue-500/20 hover:border-blue-400/40' : 'bg-gradient-to-br from-blue-50/80 to-blue-100/80 backdrop-blur-xl border border-blue-200/50 hover:border-blue-300/80'}`}>
              <div className="relative z-10 p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Students</p>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30' : 'bg-blue-200 text-blue-600 group-hover:bg-blue-300'} transition-all group-hover:scale-110`}>
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>{totalStudentsCount}</p>
                <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}></div>
              </div>
            </div>

            {/* Alumni Card */}
            <div className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-violet-500/20 hover:border-violet-400/40' : 'bg-gradient-to-br from-violet-50/80 to-violet-100/80 backdrop-blur-xl border border-violet-200/50 hover:border-violet-300/80'}`}>
              <div className="relative z-10 p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Alumni</p>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-violet-500/20 text-violet-400 group-hover:bg-violet-500/30' : 'bg-violet-200 text-violet-600 group-hover:bg-violet-300'} transition-all group-hover:scale-110`}>
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>{totalAlumniCount}</p>
                <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-violet-500 to-violet-400' : 'bg-gradient-to-r from-violet-500 to-violet-600'}`}></div>
              </div>
            </div>

            {/* Teams Card */}
            <div className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-400/40' : 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 backdrop-blur-xl border border-emerald-200/50 hover:border-emerald-300/80'}`}>
              <div className="relative z-10 p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teams</p>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30' : 'bg-emerald-200 text-emerald-600 group-hover:bg-emerald-300'} transition-all group-hover:scale-110`}>
                    <UsersRound className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>{teamsCount}</p>
                <div className={`mt-2 h-1 w-8 rounded-full ${isDarkMode ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}></div>
              </div>
            </div>

            {/* Active Now Card (realtime) */}
            <div className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40' : 'bg-gradient-to-br from-purple-50/80 to-purple-100/80 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/80'}`}>
              <div className="relative z-10 p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Active</p>
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
              </div>
            </div>

            {/* AI Usage Card — tracks combined usage against Gemini's free-tier
                project cap (250 req/day), since our own 30/user/day limit
                won't stop the shared project ceiling from being hit first. */}
            {(() => {
              const aiPct = aiUsage ? Math.min(100, (aiUsage.totalMessages / GEMINI_FREE_TIER_DAILY_LIMIT) * 100) : 0;
              const aiBarColor = aiPct >= 90 ? 'bg-red-500' : aiPct >= 70 ? 'bg-amber-500' : 'bg-pink-500';
              return (
                <div
                  title="Combined AI chat requests today vs. Gemini's free-tier daily project limit"
                  className={`col-span-2 group relative overflow-hidden rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl border border-pink-500/20 hover:border-pink-400/40' : 'bg-gradient-to-br from-pink-50/80 to-pink-100/80 backdrop-blur-xl border border-pink-200/50 hover:border-pink-300/80'}`}
                >
                  <div className="relative z-10 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>AI Usage Today</p>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-pink-500/20 text-pink-400 group-hover:bg-pink-500/30' : 'bg-pink-200 text-pink-600 group-hover:bg-pink-300'} transition-all group-hover:scale-110`}>
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <p className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-pink-300' : 'text-pink-700'} transition-colors`}>
                      {aiUsage ? aiUsage.totalMessages : '—'}
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> / {GEMINI_FREE_TIER_DAILY_LIMIT} requests</span>
                    </p>
                    <div className={`mt-2.5 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`}>
                      <div className={`h-full rounded-full transition-all duration-500 ${aiBarColor}`} style={{ width: `${Math.max(2, aiPct)}%` }} />
                    </div>
                    <p className={`mt-1.5 text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {aiUsage ? `${aiPct.toFixed(0)}% of free-tier cap · ${aiUsage.activeUsers} user${aiUsage.activeUsers === 1 ? '' : 's'} active` : 'Loading…'}
                    </p>
                  </div>
                </div>
              );
            })()}
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
                {userSearchQuery ? 'No users matching your search.' : 'No users found.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isProtected = u.is_owner || isSelf;
                  const banReasonOpen = banReasonOpenId === u.id;
                  const busy = banBusyId === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#16181c]/50 border-[#2f3336]/50' : 'bg-white/70 border-slate-200'} ${u.is_banned ? (isDarkMode ? 'border-red-500/30' : 'border-red-300') : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                              {u.name || 'Unnamed'}
                            </p>
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
                  onClick={onSendBroadcast}
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
                        onClick={() => onDeleteNotice && onDeleteNotice(notice.id)}
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

        {/* SECTION 5: Study Material Manager */}
        {currentUserId && (
          <MaterialManager
            isDarkMode={isDarkMode}
            currentUserId={currentUserId}
            onPreviewFile={onPreviewFile}
          />
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
