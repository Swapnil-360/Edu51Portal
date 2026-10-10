import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  searchDiscoveredAlumni,
  DiscoveredAlumnus,
} from '../../lib/api/alumniOutreachApi';

interface AlumniOutreachPanelProps {
  isDarkMode: boolean;
}

const DEPARTMENTS = ['CSE', 'EEE', 'Civil', 'Textile', 'BBA', 'Economics', 'English', 'Law', 'Mathematics'];

export const AlumniOutreachPanel: React.FC<AlumniOutreachPanelProps> = ({ isDarkMode }) => {
  // Main Sub-Tab: 'outreach' (table) vs 'discovery' (search & capture)
  const [activeTab, setActiveTab] = useState<'outreach' | 'discovery'>('outreach');

  const [invitations, setInvitations] = useState<AlumniInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'invited' | 'joined' | 'eligible'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Auto-Discovery State
  const [discoveryDept, setDiscoveryDept] = useState<string>('all');
  const [discoveryKeyword, setDiscoveryKeyword] = useState<string>('');
  const [discoveredAlumni, setDiscoveredAlumni] = useState<DiscoveredAlumnus[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<Set<string>>(new Set());
  const [capturingIds, setCapturingIds] = useState<Set<string>>(new Set());
  const [capturedSuccessIds, setCapturedSuccessIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLinkedInHelperOpen, setIsLinkedInHelperOpen] = useState(false);
  const [isLinkedInExtractorOpen, setIsLinkedInExtractorOpen] = useState(false);
  const [extractorPastedText, setExtractorPastedText] = useState('');

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

  useEffect(() => {
    const isAnyModalOpen = isAddModalOpen || isCsvModalOpen || isLinkedInHelperOpen || isLinkedInExtractorOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddModalOpen, isCsvModalOpen, isLinkedInHelperOpen, isLinkedInExtractorOpen]);

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

  // Check if candidate is already in prospects
  const isAlreadyCaptured = (cand: DiscoveredAlumnus) => {
    return invitations.some(
      (inv) =>
        (cand.email && inv.email.toLowerCase() === cand.email.toLowerCase()) ||
        (inv.full_name.toLowerCase() === cand.full_name.toLowerCase() && inv.department === cand.department)
    );
  };

  const handleRunDiscovery = async () => {
    setDiscoveryLoading(true);
    try {
      const results = await searchDiscoveredAlumni(discoveryDept, discoveryKeyword);
      setDiscoveredAlumni(results);
      setSelectedDiscoveredIds(new Set(results.map((r) => r.id)));
    } catch (e) {
      console.error('Discovery error:', e);
      showToast('Failed to discover alumni', 'error');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'discovery' && discoveredAlumni.length === 0) {
      handleRunDiscovery();
    }
  }, [activeTab]);

  const handleToggleSelect = (id: string) => {
    setSelectedDiscoveredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedDiscoveredIds.size === discoveredAlumni.length) {
      setSelectedDiscoveredIds(new Set());
    } else {
      setSelectedDiscoveredIds(new Set(discoveredAlumni.map((c) => c.id)));
    }
  };

  const handleCaptureCandidate = async (candidate: DiscoveredAlumnus) => {
    setCapturingIds((prev) => new Set(prev).add(candidate.id));
    const fallbackEmail =
      candidate.email ||
      `${candidate.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@alumni.bubt.edu.bd`;

    const res = await createAlumniLead({
      full_name: candidate.full_name,
      email: fallbackEmail,
      department: candidate.department,
      passing_year: candidate.passing_year,
      intake: candidate.intake,
      company: candidate.company,
      designation: candidate.designation,
      linkedin_url: candidate.linkedin_url,
      notes: `Discovered from ${candidate.source}`,
    });

    setCapturingIds((prev) => {
      const next = new Set(prev);
      next.delete(candidate.id);
      return next;
    });

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setCapturedSuccessIds((prev) => new Set(prev).add(candidate.id));
      showToast(`Captured ${candidate.full_name} to prospects!`);
      fetchLeads();
    }
  };

  const handleCaptureAllSelected = async () => {
    const candidatesToCapture = discoveredAlumni.filter(
      (c) => selectedDiscoveredIds.has(c.id) && !isAlreadyCaptured(c) && !capturedSuccessIds.has(c.id)
    );
    if (candidatesToCapture.length === 0) {
      showToast('No uncaptured alumni selected to capture', 'error');
      return;
    }

    setDiscoveryLoading(true);
    const leads: CreateAlumniLeadInput[] = candidatesToCapture.map((c) => ({
      full_name: c.full_name,
      email:
        c.email ||
        `${c.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@alumni.bubt.edu.bd`,
      department: c.department,
      passing_year: c.passing_year,
      intake: c.intake,
      company: c.company,
      designation: c.designation,
      linkedin_url: c.linkedin_url,
      notes: `Discovered from ${c.source}`,
    }));

    const res = await bulkImportAlumniLeads(leads);
    setDiscoveryLoading(false);

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setCapturedSuccessIds((prev) => {
        const next = new Set(prev);
        candidatesToCapture.forEach((c) => next.add(c.id));
        return next;
      });
      showToast(`Successfully captured ${res.count} alumni profiles!`);
      fetchLeads();
    }
  };

  const [extractorDept, setExtractorDept] = useState<string>('CSE');

  const handleImportFromExtractorText = async () => {
    if (!extractorPastedText.trim()) {
      showToast('Please paste LinkedIn profile cards or JSON first.', 'error');
      return;
    }
    try {
      let parsedItems: any[] = [];
      const trimmed = extractorPastedText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        parsedItems = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const lines = trimmed.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.includes('\t')
            ? line.split('\t')
            : (line.includes('|') ? line.split('|') : line.split(' - '));
          if (parts.length >= 1) {
            parsedItems.push({
              name: parts[0]?.trim(),
              headline: parts[1]?.trim() || '',
              link: parts[2]?.trim() || '',
            });
          }
        }
      }

      const leads: CreateAlumniLeadInput[] = [];
      for (const item of parsedItems) {
        const name = item.name || item.full_name;
        if (!name) continue;
        let headline = item.headline || item.role || item.designation || '';
        let company = '';
        let designation = headline;
        if (headline.includes(' at ')) {
          const parts = headline.split(' at ');
          designation = parts[0]?.trim();
          company = parts[1]?.trim();
        }

        leads.push({
          full_name: name,
          email: item.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@alumni.bubt.edu.bd`,
          department: item.department || extractorDept,
          passing_year: item.passing_year ? Number(item.passing_year) : new Date().getFullYear() - 2,
          company: company || item.company || null,
          designation: designation || null,
          linkedin_url: item.link || item.linkedin_url || null,
          notes: 'Captured via LinkedIn 1-Click Extractor',
        });
      }

      if (leads.length === 0) {
        showToast('Could not parse any alumni profiles.', 'error');
        return;
      }

      const res = await bulkImportAlumniLeads(leads);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Captured ${res.count} alumni from LinkedIn!`);
        setIsLinkedInExtractorOpen(false);
        setExtractorPastedText('');
        fetchLeads();
        setActiveTab('outreach');
      }
    } catch (err: any) {
      showToast('Parse error: ' + (err.message || 'Invalid format'), 'error');
    }
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
              onClick={() => setIsLinkedInExtractorOpen(true)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDarkMode ? 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              LinkedIn Extractor
            </button>
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

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('outreach')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'outreach'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25 ring-2 ring-cyan-500/20'
                : isDarkMode
                ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Outreach Pipeline ({counts.total})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('discovery');
              if (discoveredAlumni.length === 0) {
                handleRunDiscovery();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'discovery'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                : isDarkMode
                ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Multi-Department Auto-Discovery</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider">
              All Depts
            </span>
          </button>
        </div>

        {/* Conditional Tab Rendering */}
        {activeTab === 'outreach' ? (
          <div className="space-y-6">
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
    ) : (
      /* SUB-TAB 2: AUTO-DISCOVERY & MASS CAPTURE */
      <div className="space-y-5">
        {/* Discovery Controls Bar */}
        <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-slate-900/70 border-slate-700/80' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  BUBT Multi-Department Graduate Directory & Discovery
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  All 9 Departments
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Query verified BUBT graduates across all faculties, or extract fresh live profiles directly from LinkedIn.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCaptureAllSelected}
                disabled={discoveryLoading || selectedDiscoveredIds.size === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Capture Selected ({selectedDiscoveredIds.size})
              </button>
              <button
                onClick={() => setIsLinkedInExtractorOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isDarkMode ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Linkedin className="w-3.5 h-3.5 text-sky-400" />
                LinkedIn 1-Click Extractor
              </button>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            isDarkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-300' : 'bg-sky-50/70 border-sky-200/80 text-sky-900'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <span className="leading-snug">
                <strong>How it works:</strong> The filter below searches our pre-indexed directory across all 9 departments. To discover <em>hundreds of fresh alumni</em> directly from LinkedIn, click <strong>LinkedIn 1-Click Extractor</strong>!
              </span>
            </div>
            <button
              onClick={() => setIsLinkedInExtractorOpen(true)}
              className="text-[11px] font-bold text-sky-400 hover:underline shrink-0 flex items-center gap-1"
            >
              Open Extractor →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Dept Selector */}
            <div className="sm:col-span-3">
              <select
                value={discoveryDept}
                onChange={(e) => setDiscoveryDept(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Departments ({discoveredAlumni.length})</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <div className="sm:col-span-7 relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={discoveryKeyword}
                onChange={(e) => setDiscoveryKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunDiscovery()}
                placeholder="Filter by alumnus name, company (e.g. Brain Station, bKash, Walton), or role..."
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Search Button */}
            <div className="sm:col-span-2">
              <button
                onClick={handleRunDiscovery}
                disabled={discoveryLoading}
                className="w-full h-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                <Search className={`w-3.5 h-3.5 ${discoveryLoading ? 'animate-spin' : ''}`} />
                {discoveryLoading ? 'Filtering...' : 'Search Directory'}
              </button>
            </div>
          </div>

          {/* Select all & counts status */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={discoveredAlumni.length > 0 && selectedDiscoveredIds.size === discoveredAlumni.length}
                  onChange={handleToggleSelectAll}
                  className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                />
                <span>Select All ({discoveredAlumni.length} Candidates)</span>
              </label>
            </div>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedDiscoveredIds.size} of {discoveredAlumni.length} selected
            </span>
          </div>
        </div>

        {/* Discovery Candidate Grid / Cards */}
        {discoveryLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-3" />
            <p className="text-sm font-bold">Scanning BUBT alumni records across departments...</p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Checking CSE portal, multi-department graduate database, and online networks...
            </p>
          </div>
        ) : discoveredAlumni.length === 0 ? (
          <div className={`py-12 text-center rounded-2xl border border-dashed ${
            isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500 bg-slate-50'
          }`}>
            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50 text-cyan-400" />
            <p className="text-sm font-bold">No alumni found for the selected criteria</p>
            <p className="text-xs mt-1">Try switching department to "All Departments" or clearing the keyword filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {discoveredAlumni.map((cand) => {
              const isCaptured = isAlreadyCaptured(cand);
              const isJustCaptured = capturedSuccessIds.has(cand.id);
              const isCapturing = capturingIds.has(cand.id);
              const isSelected = selectedDiscoveredIds.has(cand.id);

              return (
                <div
                  key={cand.id}
                  className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? (isDarkMode ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'bg-cyan-50/50 border-cyan-400/60 shadow-sm')
                      : (isDarkMode ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300')
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(cand.id)}
                          disabled={isCaptured || isJustCaptured}
                          className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5 mt-0.5"
                        />
                        <span className="font-bold text-sm leading-tight text-slate-900 dark:text-white">
                          {cand.full_name}
                        </span>
                      </label>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        cand.department === 'CSE'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : cand.department === 'EEE'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : cand.department === 'BBA'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : cand.department === 'Civil'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : cand.department === 'Textile'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : cand.department === 'Law'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {cand.department}
                      </span>
                    </div>

                    <div className={`text-xs space-y-1 mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building className="w-3.5 h-3.5 opacity-60 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          {cand.designation || 'Alumnus'} {cand.company ? `· ${cand.company}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] opacity-75">
                        <GraduationCap className="w-3.5 h-3.5 opacity-60 shrink-0" />
                        <span>
                          {cand.intake ? `Intake ${cand.intake}` : 'BUBT Graduate'}
                          {cand.passing_year ? ` · Class of ${cand.passing_year}` : ''}
                        </span>
                      </div>
                      {cand.linkedin_url && (
                        <div className="pt-1">
                          <a
                            href={cand.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                          >
                            <Linkedin className="w-3 h-3" />
                            View LinkedIn Profile
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className={`text-[10px] truncate max-w-[140px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} title={cand.source}>
                      {cand.source}
                    </span>

                    {isJustCaptured || isCaptured ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        In Prospects
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCaptureCandidate(cand)}
                        disabled={isCapturing}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                      >
                        <Plus className={`w-3 h-3 ${isCapturing ? 'animate-spin' : ''}`} />
                        {isCapturing ? 'Capturing...' : 'Capture'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div>

      {/* MODAL 1: Add Single Prospect */}
      {isAddModalOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
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
        </div>,
        document.body
      )}

      {/* MODAL 2: Bulk CSV Import */}
      {isCsvModalOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsCsvModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-xl rounded-2xl p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
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
        </div>,
        document.body
      )}

      {/* MODAL 3: LinkedIn Smart Search Assistant */}
      {isLinkedInHelperOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsLinkedInHelperOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
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
        </div>,
        document.body
      )}

      {/* MODAL 4: LinkedIn 1-Click Profile Extractor */}
      {isLinkedInExtractorOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsLinkedInExtractorOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-2xl rounded-2xl p-6 border shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsLinkedInExtractorOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                <Linkedin className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">LinkedIn 1-Click Profile Extractor</h3>
            </div>
            <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Capture dozens of alumni profiles directly from BUBT's LinkedIn People directory or search results.
            </p>

            {/* Step-by-Step Helper Card */}
            <div className={`p-4 rounded-xl border mb-4 space-y-3 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-sky-50/50 border-sky-200'
            }`}>
              <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                How to capture in 15 seconds:
              </div>
              <ol className="text-xs space-y-2 list-decimal list-inside opacity-90 leading-relaxed">
                <li>
                  Open <a href="https://www.linkedin.com/school/bubt/people/" target="_blank" rel="noreferrer" className="text-sky-400 underline font-semibold">BUBT on LinkedIn (People Tab)</a> in a new tab.
                </li>
                <li>
                  Filter by field of study / department (e.g. Computer Science, Business, Engineering) and scroll down to load profiles.
                </li>
                <li>
                  Copy the bookmarklet script below and paste it into your browser's DevTools Console (or bookmark bar).
                </li>
                <li>
                  Come back here and paste the copied data into the box below!
                </li>
              </ol>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const script = `javascript:(function(){const c=document.querySelectorAll('.org-people-profile-card,.artdeco-card,.entity-result');const l=[];c.forEach(x=>{const n=x.querySelector('.org-people-profile-card__profile-title,.entity-result__title-text a,.app-aware-link');const h=x.querySelector('.artdeco-entity-lockup__subtitle,.entity-result__primary-subtitle,.org-people-profile-card__profile-sub-title');const a=x.querySelector('a[href*="/in/"]');if(n&&a){const nm=n.innerText.trim().replace(/\\n+/g,' ');const hd=h?h.innerText.trim().replace(/\\n+/g,' '):'';const lk=a.href.split('?')[0];if(nm&&lk&&!l.some(y=>y.name===nm))l.push({name:nm,headline:hd,link:lk});}});if(!l.length){alert('No alumni profiles found. Scroll down the LinkedIn page and click again!');return;}navigator.clipboard.writeText(JSON.stringify(l,null,2)).then(()=>alert('Captured '+l.length+' BUBT alumni profiles! Now paste into Edu51 Portal.'));})();`;
                    navigator.clipboard.writeText(script);
                    showToast('Bookmarklet script copied to clipboard!');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Bookmarklet Script
                </button>
                <a
                  href="https://www.linkedin.com/school/bubt/people/"
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open BUBT LinkedIn People
                </a>
              </div>
            </div>

            {/* Input and Department Selection */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <label className="font-bold">Paste Extracted Profiles (JSON or Plain Text)</label>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assign Dept:</span>
                  <select
                    value={extractorDept}
                    onChange={(e) => setExtractorDept(e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                rows={7}
                value={extractorPastedText}
                onChange={(e) => setExtractorPastedText(e.target.value)}
                placeholder="Paste the JSON array from the bookmarklet or plain text lines (e.g. Nahid Bin Azhar - CTO at JoulesLabs - https://bd.linkedin.com/in/nahid-bin-azhar)"
                className={`w-full p-3 font-mono text-xs rounded-xl border outline-none ${
                  isDarkMode ? 'bg-slate-900 border-slate-700 text-cyan-300' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />

              <div className="flex justify-between items-center pt-2">
                <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {extractorPastedText.trim() ? 'Ready to parse profiles' : 'Paste content above'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkedInExtractorOpen(false)}
                    className={`px-4 py-2 rounded-lg font-medium text-xs ${
                      isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFromExtractorText}
                    className="px-5 py-2 rounded-lg font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Capture Into Prospects
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
