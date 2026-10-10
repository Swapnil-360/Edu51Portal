import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Mail,
  Send,
  Plus,
  FileSpreadsheet,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
  Check,
  Building,
  GraduationCap,
  Filter,
  X,
  Linkedin,
} from 'lucide-react';
import {
  AlumniInvitation,
  CreateAlumniLeadInput,
  getAlumniInvitations,
  createAlumniLead,
  bulkImportAlumniLeads,
  deleteAlumniLead,
  sendAlumniInvitation,
  sendAllNewInvitations,
  sendAllEligibleReminders,
  checkReinviteEligibility,
} from '../../lib/api/alumniOutreachApi';

interface AlumniOutreachPanelProps {
  isDarkMode: boolean;
}

const DEPARTMENTS = ['CSE', 'EEE', 'Civil', 'Textile', 'BBA', 'Economics', 'English', 'Law', 'Mathematics'];

export const AlumniOutreachPanel: React.FC<AlumniOutreachPanelProps> = ({ isDarkMode }) => {
  const [invitations, setInvitations] = useState<AlumniInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'invited' | 'joined' | 'eligible'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLinkedInHelperOpen, setIsLinkedInHelperOpen] = useState(false);

  // Action busy states
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New lead form state
  const [newLead, setNewLead] = useState<CreateAlumniLeadInput>({
    full_name: '',
    email: '',
    department: 'CSE',
    passing_year: new Date().getFullYear() - 1,
    intake: null,
    company: '',
    designation: '',
    linkedin_url: '',
    phone: '',
    notes: '',
  });

  // CSV text input
  const [csvRawText, setCsvRawText] = useState('');

  // LinkedIn Search Assistant
  const [linkedInDept, setLinkedInDept] = useState('Computer Science');
  const [linkedInRole, setLinkedInRole] = useState('Software Engineer');

  const fetchLeads = async () => {
    setLoading(true);
    const res = await getAlumniInvitations();
    if (res.data) setInvitations(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return invitations.filter((item) => {
      // Status filter
      if (statusFilter === 'new' && item.status !== 'new') return false;
      if (statusFilter === 'invited' && item.status !== 'invited') return false;
      if (statusFilter === 'joined' && item.status !== 'joined') return false;
      if (statusFilter === 'eligible') {
        const elig = checkReinviteEligibility(item);
        if (!elig.eligible) return false;
      }

      // Department filter
      if (deptFilter !== 'all' && item.department !== deptFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.full_name.toLowerCase().includes(q);
        const matchesEmail = item.email.toLowerCase().includes(q);
        const matchesCompany = (item.company || '').toLowerCase().includes(q);
        const matchesRole = (item.designation || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesCompany && !matchesRole) return false;
      }

      return true;
    });
  }, [invitations, statusFilter, deptFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    let newCount = 0;
    let invitedCount = 0;
    let joinedCount = 0;
    let eligibleCount = 0;

    invitations.forEach((item) => {
      if (item.status === 'new') newCount++;
      if (item.status === 'invited') invitedCount++;
      if (item.status === 'joined') joinedCount++;
      const elig = checkReinviteEligibility(item);
      if (elig.eligible && item.status === 'invited') eligibleCount++;
    });

    return {
      total: invitations.length,
      new: newCount,
      invited: invitedCount,
      joined: joinedCount,
      eligible: eligibleCount,
    };
  }, [invitations]);

  // Handlers
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.full_name.trim() || !newLead.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    const res = await createAlumniLead(newLead);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Added ${newLead.full_name} to prospects!`);
      setIsAddModalOpen(false);
      setNewLead({
        full_name: '',
        email: '',
        department: 'CSE',
        passing_year: new Date().getFullYear() - 1,
        intake: null,
        company: '',
        designation: '',
        linkedin_url: '',
        phone: '',
        notes: '',
      });
      fetchLeads();
    }
  };

  const handleBulkImportCsv = async () => {
    if (!csvRawText.trim()) return;

    // Parse lines: Name, Email, Dept, Year, Company, Designation, LinkedIn
    const lines = csvRawText.trim().split('\n');
    const parsed: CreateAlumniLeadInput[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip header row if present
      if (i === 0 && line.toLowerCase().includes('email')) continue;

      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 2) {
        parsed.push({
          full_name: cols[0],
          email: cols[1],
          department: cols[2] || 'CSE',
          passing_year: cols[3] ? Number(cols[3]) : null,
          company: cols[4] || null,
          designation: cols[5] || null,
          linkedin_url: cols[6] || null,
        });
      }
    }

    if (parsed.length === 0) {
      showToast('Could not parse any valid rows. Check CSV format.', 'error');
      return;
    }

    const res = await bulkImportAlumniLeads(parsed);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Successfully imported ${res.count} alumni leads!`);
      setIsCsvModalOpen(false);
      setCsvRawText('');
      fetchLeads();
    }
  };

  const handleSendSingle = async (invitation: AlumniInvitation) => {
    setSendingId(invitation.id);
    const res = await sendAlumniInvitation(invitation.id);
    setSendingId(null);

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Invitation sent to ${invitation.email}!`);
      fetchLeads();
    }
  };

  const handleSendAllNew = async () => {
    if (counts.new === 0) return;
    setBatchSending(true);
    const res = await sendAllNewInvitations();
    setBatchSending(false);
    showToast(`Batch dispatch complete: ${res.sent} sent, ${res.failed} failed`);
    fetchLeads();
  };

  const handleSendAllReminders = async () => {
    if (counts.eligible === 0) return;
    setBatchSending(true);
    const res = await sendAllEligibleReminders();
    setBatchSending(false);
    showToast(`Reminders dispatched to ${res.sent} alumni!`);
    fetchLeads();
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from prospects?`)) return;
    const res = await deleteAlumniLead(id);
    if (res.success) {
      showToast(`Removed ${name}`);
      fetchLeads();
    } else {
      showToast(res.error || 'Failed to delete', 'error');
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live';
    const url = `${origin}/alumni-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    showToast('Magic invitation link copied to clipboard!');
  };

  const openLinkedInSearch = () => {
    const query = `site:linkedin.com/in ("BUBT" OR "Bangladesh University of Business and Technology") "${linkedInDept}" "${linkedInRole}"`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(googleUrl, '_blank');
  };

  return (
    <div className={`group relative overflow-hidden rounded-xl lg:rounded-2xl transition-all duration-300 ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-cyan-500/20'
        : 'bg-white/90 backdrop-blur-xl border border-cyan-200/80 shadow-sm'
    }`}>
      {/* Toast Notification */}
      {actionMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-semibold transition-all ${
          actionMessage.type === 'success'
            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
            : 'bg-rose-600 text-white shadow-rose-500/20'
        }`}>
          {actionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {actionMessage.text}
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-7 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Alumni Outreach & Concierge Invitations
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDarkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                72h Cooldown Guard
              </span>
            </div>
            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Collect former students on LinkedIn and databases, send pre-filled invites, and bypass manual forms with 30-second onboarding.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsLinkedInHelperOpen(true)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDarkMode ? 'bg-[#1e2330] hover:bg-[#252c3d] text-sky-400 border border-sky-500/30' : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
              }`}
            >
              <Linkedin className="w-3.5 h-3.5" />
              Find on LinkedIn
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Prospect
            </button>
          </div>
        </div>

        {/* Funnel Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Prospects</span>
            <p className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{counts.total}</p>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-blue-950/20 border-blue-500/20' : 'bg-blue-50/70 border-blue-200'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>New (Unsent)</span>
            <p className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{counts.new}</p>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-amber-950/20 border-amber-500/20' : 'bg-amber-50/70 border-amber-200'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>Pending (Invited)</span>
            <p className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>{counts.invited}</p>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50/70 border-emerald-200'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>Joined & Active</span>
            <p className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{counts.joined}</p>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-purple-950/20 border-purple-500/20' : 'bg-purple-50/70 border-purple-200'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>72h+ Re-invite Ready</span>
            <p className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>{counts.eligible}</p>
          </div>
        </div>

        {/* Filter and Batch Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: `All (${counts.total})` },
              { id: 'new', label: `New (${counts.new})` },
              { id: 'invited', label: `Invited (${counts.invited})` },
              { id: 'eligible', label: `Ready for Reminder (${counts.eligible})` },
              { id: 'joined', label: `Joined (${counts.joined})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : isDarkMode
                    ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Batch Actions */}
          <div className="flex items-center gap-2">
            {counts.new > 0 && (
              <button
                onClick={handleSendAllNew}
                disabled={batchSending}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Invite All New ({counts.new})
              </button>
            )}
            {counts.eligible > 0 && (
              <button
                onClick={handleSendAllReminders}
                disabled={batchSending}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${batchSending ? 'animate-spin' : ''}`} />
                Send Reminders ({counts.eligible})
              </button>
            )}
          </div>
        </div>

        {/* Search and Department Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by alumnus name, email, company, or job title..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                isDarkMode
                  ? 'bg-slate-900/60 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
              }`}
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className={`w-full sm:w-44 px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none font-medium ${
              isDarkMode
                ? 'bg-slate-900/60 border-slate-700/80 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Prospects Table / Grid */}
        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-500 mb-2" />
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading alumni prospects...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className={`py-12 text-center rounded-xl border border-dashed ${
            isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400 bg-slate-50/50'
          }`}>
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No alumni leads found</p>
            <p className="text-xs mt-0.5">Try searching with a different keyword or add a new prospect.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-3 font-semibold">Alumnus</th>
                  <th className="py-3 px-3 font-semibold">Department & Year</th>
                  <th className="py-3 px-3 font-semibold">Current Career</th>
                  <th className="py-3 px-3 font-semibold">Status & 72h Cooldown</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                {filteredLeads.map((item) => {
                  const eligibility = checkReinviteEligibility(item);
                  const isSendingThis = sendingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Alumnus Column */}
                      <td className="py-3 px-3 min-w-[180px]">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {item.full_name}
                          {item.linkedin_url && (
                            <a
                              href={item.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              title="LinkedIn Profile"
                              className="text-sky-500 hover:text-sky-400"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.email}
                        </p>
                      </td>

                      {/* Dept & Year */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">{item.department}</span>
                        <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.passing_year ? `Class of ${item.passing_year}` : 'Alumni'}
                          {item.intake ? ` · Intake ${item.intake}` : ''}
                        </div>
                      </td>

                      {/* Current Career */}
                      <td className="py-3 px-3 min-w-[160px]">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.designation || 'Alumnus'}
                        </p>
                        <p className={`text-[11px] truncate flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Building className="w-3 h-3 flex-shrink-0" />
                          {item.company || 'Not specified'}
                        </p>
                      </td>

                      {/* Status & 72h Cooldown */}
                      <td className="py-3 px-3 min-w-[180px]">
                        {item.status === 'joined' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Joined & Active
                          </span>
                        ) : item.status === 'new' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            New Lead
                          </span>
                        ) : item.status === 'already_registered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                            Existing User
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Invited ({item.invite_count}x)
                            </span>
                            <div className="mt-1">
                              {eligibility.eligible ? (
                                <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  72h+ passed · Ready to re-invite
                                </span>
                              ) : (
                                <span className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {eligibility.remainingHours}h cooldown left
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send / Re-invite Button */}
                          {item.status !== 'joined' && item.status !== 'already_registered' && (
                            <button
                              onClick={() => handleSendSingle(item)}
                              disabled={isSendingThis || !eligibility.eligible}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                item.status === 'new'
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                  : eligibility.eligible
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-slate-700/40 text-slate-500 cursor-not-allowed'
                              }`}
                              title={eligibility.reason}
                            >
                              {isSendingThis ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : item.status === 'new' ? (
                                <>
                                  <Send className="w-3 h-3" />
                                  Invite
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" />
                                  Re-invite
                                </>
                              )}
                            </button>
                          )}

                          {/* Copy Link Button */}
                          {item.status !== 'joined' && (
                            <button
                              onClick={() => handleCopyLink(item.invite_token, item.id)}
                              className={`p-1.5 rounded-lg transition-all ${
                                copiedId === item.id
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isDarkMode
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title="Copy Magic Invite Link"
                            >
                              {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Delete Lead */}
                          <button
                            onClick={() => handleDeleteLead(item.id, item.full_name)}
                            className={`p-1.5 rounded-lg transition-all ${
                              isDarkMode ? 'hover:bg-rose-500/20 text-slate-500 hover:text-rose-400' : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                            }`}
                            title="Delete Prospect"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Add Single Prospect */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1">Add Alumni Prospect</h3>
            <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Input details found on LinkedIn or graduate records. A pre-filled onboarding link will be generated.
            </p>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.full_name}
                    onChange={(e) => setNewLead({ ...newLead, full_name: e.target.value })}
                    placeholder="e.g. S. M. Farhan"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="farhan@example.com"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <select
                    value={newLead.department}
                    onChange={(e) => setNewLead({ ...newLead, department: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={newLead.passing_year || ''}
                    onChange={(e) => setNewLead({ ...newLead, passing_year: Number(e.target.value) })}
                    placeholder="2023"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Current Company</label>
                  <input
                    type="text"
                    value={newLead.company || ''}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                    placeholder="e.g. Brain Station 23 / Optimizely"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Job Designation</label>
                  <input
                    type="text"
                    value={newLead.designation || ''}
                    onChange={(e) => setNewLead({ ...newLead, designation: e.target.value })}
                    placeholder="Senior Software Engineer"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={newLead.linkedin_url || ''}
                  onChange={(e) => setNewLead({ ...newLead, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
                >
                  Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk CSV Import */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl p-6 border shadow-2xl relative ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsCsvModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1">Bulk Import Alumni CSV</h3>
            <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Paste lines formatted as: <code className="text-cyan-400 font-mono">Full Name, Email, Dept, Passing Year, Company, Designation, LinkedIn</code>
            </p>

            <textarea
              rows={8}
              value={csvRawText}
              onChange={(e) => setCsvRawText(e.target.value)}
              placeholder="Tanvir Ahmed, tanvir@gmail.com, CSE, 2022, Walton, Software Engineer, https://linkedin.com/in/tanvir&#10;Sadia Islam, sadia@yahoo.com, EEE, 2021, Grameenphone, Network Engineer"
              className={`w-full p-3 font-mono text-xs rounded-xl border outline-none ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-cyan-300' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />

            <div className="flex justify-between items-center pt-3">
              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {csvRawText.trim() ? `${csvRawText.trim().split('\n').length} row(s) detected` : 'No rows entered'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className={`px-4 py-2 rounded-lg font-medium text-xs ${
                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImportCsv}
                  className="px-5 py-2 rounded-lg font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
                >
                  Import Leads
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LinkedIn Smart Search Assistant */}
      {isLinkedInHelperOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsLinkedInHelperOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Linkedin className="w-5 h-5 text-sky-400" />
              <h3 className="text-lg font-bold">LinkedIn Prospecting Helper</h3>
            </div>
            <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              LinkedIn blocks direct public bot scraping, but you can use targeted Google Search queries (Google Dorks) to uncover hundreds of BUBT graduates by department and role!
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Department</label>
                <input
                  type="text"
                  value={linkedInDept}
                  onChange={(e) => setLinkedInDept(e.target.value)}
                  placeholder="Computer Science / EEE / BBA"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Job Designation / Skill</label>
                <input
                  type="text"
                  value={linkedInRole}
                  onChange={(e) => setLinkedInRole(e.target.value)}
                  placeholder="Software Engineer / Data Analyst / Product Manager"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-xl border font-mono text-[11px] ${
                isDarkMode ? 'bg-slate-900/80 border-slate-700 text-cyan-300' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}>
                site:linkedin.com/in ("BUBT" OR "Bangladesh University of Business and Technology") "{linkedInDept}" "{linkedInRole}"
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkedInHelperOpen(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={openLinkedInSearch}
                  className="px-5 py-2 rounded-lg font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Launch Google Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
