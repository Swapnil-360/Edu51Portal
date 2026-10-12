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
  FileText,
  Eye,
  Edit3,
  RotateCcw,
  Globe,
  Facebook,
  MessageCircle,
  Share2,
  Link,
  MessageSquare,
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
  EmailTemplateConfig,
  DEFAULT_EMAIL_TEMPLATES,
  getEmailTemplates,
  saveEmailTemplates,
  resetEmailTemplates,
  interpolateTemplate,
  buildInvitationEmailHtml,
} from '../../lib/api/alumniOutreachApi';

interface AlumniOutreachPanelProps {
  isDarkMode: boolean;
}

const DEPARTMENTS = ['CSE', 'EEE', 'Civil', 'Textile', 'BBA', 'Economics', 'English', 'Law', 'Mathematics'];

const VARIABLE_CHIPS = [
  { label: '{{name}}', desc: 'Full Name' },
  { label: '{{first_name}}', desc: 'First Name' },
  { label: '{{department}}', desc: 'Department' },
  { label: '{{company}}', desc: 'Company' },
  { label: '{{designation}}', desc: 'Job Title' },
  { label: '{{year}}', desc: 'Class Year' },
  { label: '{{intake}}', desc: 'Intake' },
];

export interface ParsedUniversalAlumnus {
  full_name: string;
  designation: string | null;
  company: string | null;
  department: string;
  intake: number | null;
  passing_year: number | null;
  linkedin_url: string | null;
  email: string | null;
  source: 'Facebook' | 'LinkedIn' | 'Google / Web';
}

export function getVerifiedSocialLink(
  url: string | null | undefined,
  notes?: string | null
): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'null' || trimmed === 'undefined') return null;

  // Reject synthetic placeholder / guess suffixes seeded in older mocks
  const isSynthetic =
    trimmed.includes('-therap') ||
    trimmed.includes('-chaldal') ||
    trimmed.includes('-ebl') ||
    trimmed.includes('-shohoz') ||
    trimmed.includes('-walton') ||
    trimmed.includes('-bkash') ||
    trimmed.includes('-brainstation') ||
    trimmed.includes('-tigerit');

  if (isSynthetic) return null;

  // Reject if notes indicate it was a mock guess
  if (notes && notes.includes('Discovered from') && !trimmed.includes('facebook.com')) {
    if (trimmed.includes('bd.linkedin.com/in/')) return null;
  }

  // Reject generic domain roots without an actual profile slug
  const clean = trimmed.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  if (
    clean === 'linkedin.com' ||
    clean === 'linkedin.com/in' ||
    clean === 'facebook.com' ||
    clean === 'facebook.com/messages'
  ) {
    return null;
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function buildSocialDmMessage(lead: {
  full_name: string;
  department?: string;
  invite_token?: string;
  intake?: number | null;
  passing_year?: number | null;
}): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://bubt.edu51portal.live';
  const inviteUrl = `${origin}/alumni-invite?token=${lead.invite_token || ''}`;
  const deptStr = lead.department ? `Department of ${lead.department}` : 'BUBT';

  return `Assalamu Alaikum ${lead.full_name}! 🎓\n\nGreetings from Team CoreWe5 (BUBT Intake 51).\n\nWe've built Edu51Portal — the centralized official academic and alumni community platform for BUBT students and graduates (${deptStr}).\n\nYour official alumni profile has been pre-verified based on university records. We would be honored to have you join our verified directory with VIP pre-approval:\n\n👉 Claim & Activate Your Profile in 30 seconds:\n${inviteUrl}\n\nLooking forward to having you with us!`;
}

export function parseUniversalAlumniText(
  rawText: string,
  defaultDept: string = 'CSE'
): ParsedUniversalAlumnus[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. JSON Array format
  if (trimmed.startsWith('[') || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items
        .map((item) => {
          const name = (item.name || item.full_name || '').trim();
          const rawHeadline = item.headline || item.designation || item.role || '';
          let designation = rawHeadline;
          let company = item.company || '';
          if (!company && rawHeadline.includes(' at ')) {
            const parts = rawHeadline.split(' at ');
            designation = parts[0]?.trim();
            company = parts[1]?.trim();
          } else if (!company && rawHeadline.includes(' @ ')) {
            const parts = rawHeadline.split(' @ ');
            designation = parts[0]?.trim();
            company = parts[1]?.trim();
          }
          const profileUrl = item.link || item.linkedin_url || item.facebook_url || item.url || '';
          const source: 'Facebook' | 'LinkedIn' | 'Google / Web' = profileUrl.includes('facebook.com')
            ? 'Facebook'
            : profileUrl.includes('linkedin.com')
            ? 'LinkedIn'
            : 'Google / Web';

          return {
            full_name: name,
            designation: designation || null,
            company: company || null,
            department: item.department || defaultDept,
            passing_year: item.passing_year
              ? Number(item.passing_year)
              : item.year
              ? Number(item.year)
              : new Date().getFullYear() - 2,
            intake: item.intake ? Number(item.intake) : null,
            linkedin_url: profileUrl || null,
            email: item.email || null,
            source,
          };
        })
        .filter((item) => item.full_name.length > 0);
    } catch {
      // fallback to line parsing
    }
  }

  const detectDept = (str: string) => {
    const s = str.toUpperCase();
    if (s.includes('CSE') || s.includes('COMPUTER SCIENCE')) return 'CSE';
    if (s.includes('EEE') || s.includes('ELECTRICAL')) return 'EEE';
    if (s.includes('CIVIL')) return 'Civil';
    if (s.includes('TEXTILE')) return 'Textile';
    if (s.includes('BBA') || s.includes('BUSINESS')) return 'BBA';
    if (s.includes('ECONOMICS')) return 'Economics';
    if (s.includes('ENGLISH')) return 'English';
    if (s.includes('LAW')) return 'Law';
    if (s.includes('MATH')) return 'Mathematics';
    return defaultDept;
  };

  const detectIntake = (str: string) => {
    const m = str.match(/(?:intake|batch)\s*[:#-]?\s*(\d{1,3})/i);
    return m ? Number(m[1]) : null;
  };

  const detectYear = (str: string) => {
    const m = str.match(/(?:class of|year|passed|batch\s*of)?\s*\b(20\d{2}|19\d{2})\b/i);
    return m ? Number(m[1]) : null;
  };

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: ParsedUniversalAlumnus[] = [];

  for (const rawLine of lines) {
    if (!rawLine) continue;
    let line = rawLine;

    // 1. Extract URL if present
    let url = '';
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      url = urlMatch[1].replace(/[),.;]+$/, '');
      line = line.replace(urlMatch[0], ' ').trim();
    }

    // Determine platform
    let source: 'Facebook' | 'LinkedIn' | 'Google / Web' = 'Google / Web';
    if (url.includes('facebook.com') || line.toLowerCase().includes('facebook')) {
      source = 'Facebook';
    } else if (url.includes('linkedin.com') || line.toLowerCase().includes('linkedin')) {
      source = 'LinkedIn';
    }

    // Extract email if present
    let email: string | null = null;
    const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      email = emailMatch[1];
      line = line.replace(emailMatch[0], ' ').trim();
    }

    const dept = detectDept(line);
    const intake = detectIntake(line);
    const passing_year = detectYear(line);

    // Strip platform and location suffixes from snippet: e.g. "| LinkedIn", "- Facebook", "... - BUBT"
    line = line
      .replace(/\s*\|\s*(?:LinkedIn|Facebook|Google|BUBT).*/gi, '')
      .replace(/\s*-\s*(?:LinkedIn|Facebook).*$/gi, '')
      .replace(/\s*·\s*(?:LinkedIn|Facebook).*$/gi, '')
      .replace(/Dhaka,?\s*Bangladesh/gi, '')
      .replace(/Bangladesh University of Business and Technology.*$/gi, '')
      .trim();

    // Remove bracketed annotations like (Intake 48, BBA)
    line = line.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();

    let name = '';
    let designation = '';
    let company = '';

    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      name = parts[0] || '';
      designation = parts[1] || '';
      company = parts[2] || '';
    } else if (line.includes(' - ')) {
      const parts = line.split(' - ').map((p) => p.trim()).filter(Boolean);
      name = parts[0] || '';
      if (parts.length === 2) {
        if (parts[1].includes(' at ')) {
          const atParts = parts[1].split(' at ');
          designation = atParts[0]?.trim();
          company = atParts[1]?.trim();
        } else if (parts[1].includes(' @ ')) {
          const atParts = parts[1].split(' @ ');
          designation = atParts[0]?.trim();
          company = atParts[1]?.trim();
        } else {
          designation = parts[1];
        }
      } else if (parts.length >= 3) {
        designation = parts[1];
        company = parts[2];
      }
    } else if (line.includes(' | ')) {
      const parts = line.split(' | ').map((p) => p.trim()).filter(Boolean);
      name = parts[0] || '';
      designation = parts[1] || '';
      company = parts[2] || '';
    } else if (line.includes(',') && line.split(',').length >= 3) {
      const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
      name = parts[0] || '';
      designation = parts[1] || '';
      company = parts[2] || '';
    } else {
      if (line.includes(' at ')) {
        const parts = line.split(' at ');
        name = parts[0]?.trim();
        company = parts[1]?.trim();
      } else if (line.includes(' @ ')) {
        const parts = line.split(' @ ');
        name = parts[0]?.trim();
        company = parts[1]?.trim();
      } else {
        name = line;
      }
    }

    // Clean name
    name = name
      .replace(/^(?:Engr\.|Dr\.|Md\.|Mr\.|Ms\.|Mrs\.)\s*/i, (m) => m)
      .trim();

    // Clean up designation/company
    if (designation.includes(' at ')) {
      const atParts = designation.split(' at ');
      designation = atParts[0].trim();
      if (!company) company = atParts[1].trim();
    } else if (designation.includes(' @ ')) {
      const atParts = designation.split(' @ ');
      designation = atParts[0].trim();
      if (!company) company = atParts[1].trim();
    }

    company = company.replace(/^(?:at|@)\s*/i, '').replace(/[-–—]/g, '').trim();
    designation = designation.replace(/[-–—]/g, '').trim();

    if (!name || name.length < 2) continue;

    results.push({
      full_name: name,
      designation: designation || null,
      company: company || null,
      department: dept,
      intake: intake || null,
      passing_year: passing_year || new Date().getFullYear() - 2,
      linkedin_url: url || null,
      email: email || null,
      source,
    });
  }

  return results;
}

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
  const [isUniversalCollectorOpen, setIsUniversalCollectorOpen] = useState(false);
  const [collectorTab, setCollectorTab] = useState<'google' | 'facebook' | 'linkedin'>('google');
  const [universalPastedText, setUniversalPastedText] = useState('');
  const [universalDept, setUniversalDept] = useState<string>('CSE');

  // Google X-Ray Search Assistant
  const [googleDept, setGoogleDept] = useState('Computer Science');
  const [googleRole, setGoogleRole] = useState('Software Engineer');
  const [googleTarget, setGoogleTarget] = useState<'linkedin' | 'facebook' | 'web'>('linkedin');

  // Email Template & Custom Message Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateActiveTab, setTemplateActiveTab] = useState<'invite' | 'reminder'>('invite');
  const [templateDraft, setTemplateDraft] = useState<EmailTemplateConfig>(() => getEmailTemplates());
  const [templatePreviewMode, setTemplatePreviewMode] = useState(false);

  // Single Alumnus Send & Message Inspection modal
  const [inviteModalLead, setInviteModalLead] = useState<AlumniInvitation | null>(null);
  const [customSubjectDraft, setCustomSubjectDraft] = useState('');
  const [customBodyDraft, setCustomBodyDraft] = useState('');
  const [singlePreviewMode, setSinglePreviewMode] = useState(false);
  const [saveAsDefaultTemplate, setSaveAsDefaultTemplate] = useState(false);

  // Social DM Outreach Modal state
  const [socialModalLead, setSocialModalLead] = useState<AlumniInvitation | null>(null);
  const [socialDmDraft, setSocialDmDraft] = useState('');
  const [copiedSocialDm, setCopiedSocialDm] = useState(false);

  // Generate VIP Invite Link Modal state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    full_name: '',
    department: 'CSE',
    passing_year: new Date().getFullYear() - 2,
    intake: '' as number | '',
    company: '',
    designation: '',
    social_url: '',
    email: '',
    phone: '',
    source_platform: 'Facebook',
  });
  const [generatedInviteResult, setGeneratedInviteResult] = useState<{
    lead: AlumniInvitation;
    inviteUrl: string;
    dmMessage: string;
  } | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedGeneratedDm, setCopiedGeneratedDm] = useState(false);
  const [copiedGeneratedUrl, setCopiedGeneratedUrl] = useState(false);

  // Action busy states
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live Universal Parser Memoization
  const parsedUniversalLeads = useMemo(() => {
    return parseUniversalAlumniText(universalPastedText, universalDept);
  }, [universalPastedText, universalDept]);

  const parsedCountsBySource = useMemo(() => {
    let fb = 0;
    let li = 0;
    let web = 0;
    for (const lead of parsedUniversalLeads) {
      if (lead.source === 'Facebook') fb++;
      else if (lead.source === 'LinkedIn') li++;
      else web++;
    }
    return { fb, li, web, total: parsedUniversalLeads.length };
  }, [parsedUniversalLeads]);

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
    const isAnyModalOpen =
      isAddModalOpen ||
      isCsvModalOpen ||
      isUniversalCollectorOpen ||
      isTemplateModalOpen ||
      isGenerateModalOpen ||
      !!socialModalLead ||
      !!inviteModalLead;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [
    isAddModalOpen,
    isCsvModalOpen,
    isUniversalCollectorOpen,
    isTemplateModalOpen,
    isGenerateModalOpen,
    socialModalLead,
    inviteModalLead,
  ]);

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

  // Open the review & customize modal for an alumnus
  const handleOpenSendModal = (lead: AlumniInvitation) => {
    const isReminder = lead.status === 'invited';
    const templates = getEmailTemplates();
    const defaultSubject = isReminder ? templates.reminderSubject : templates.inviteSubject;
    const defaultBody = isReminder ? templates.reminderBody : templates.inviteBody;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live';
    const inviteUrl = `${origin}/alumni-invite?token=${lead.invite_token}`;

    setInviteModalLead(lead);
    setCustomSubjectDraft(interpolateTemplate(defaultSubject, lead, inviteUrl));
    setCustomBodyDraft(interpolateTemplate(defaultBody, lead, inviteUrl));
    setSinglePreviewMode(false);
    setSaveAsDefaultTemplate(false);
  };

  // Dispatches the single invitation with any customized subject and body text
  const handleConfirmSendInvite = async () => {
    if (!inviteModalLead) return;
    setSendingId(inviteModalLead.id);

    // If user checked "save as default", update default templates
    if (saveAsDefaultTemplate) {
      const isReminder = inviteModalLead.status === 'invited';
      const currentTemplates = getEmailTemplates();
      if (isReminder) {
        saveEmailTemplates({
          ...currentTemplates,
          reminderSubject: customSubjectDraft,
          reminderBody: customBodyDraft,
        });
      } else {
        saveEmailTemplates({
          ...currentTemplates,
          inviteSubject: customSubjectDraft,
          inviteBody: customBodyDraft,
        });
      }
    }

    const res = await sendAlumniInvitation(inviteModalLead.id, undefined, {
      subject: customSubjectDraft,
      bodyText: customBodyDraft,
    });
    setSendingId(null);

    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Invitation dispatched to ${inviteModalLead.email}!`);
      setInviteModalLead(null);
      fetchLeads();
    }
  };

  const handleSaveDefaultTemplate = () => {
    saveEmailTemplates(templateDraft);
    showToast('Outreach message templates saved successfully!');
    setIsTemplateModalOpen(false);
  };

  const handleResetDefaultTemplate = () => {
    if (window.confirm('Reset outreach message templates back to university defaults?')) {
      const def = resetEmailTemplates();
      setTemplateDraft(def);
      showToast('Templates reset to defaults');
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

  const getGoogleSearchQuery = () => {
    if (googleTarget === 'linkedin') {
      return `site:linkedin.com/in ("BUBT" OR "Bangladesh University of Business and Technology") "${googleDept}" "${googleRole}"`;
    }
    if (googleTarget === 'facebook') {
      return `site:facebook.com ("BUBT" OR "Bangladesh University of Business and Technology") "${googleDept}" ("Alumni" OR "Intake" OR "Batch")`;
    }
    return `("BUBT" OR "Bangladesh University of Business and Technology") "${googleDept}" ("${googleRole}" OR "Alumni" OR "Graduate")`;
  };

  const handleLaunchGoogleSearch = () => {
    const query = getGoogleSearchQuery();
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(googleUrl, '_blank');
  };

  const handleCopyGoogleQuery = () => {
    navigator.clipboard.writeText(getGoogleSearchQuery());
    showToast('Google X-Ray search query copied to clipboard!');
  };

  const handleOpenSocialModal = (lead: AlumniInvitation) => {
    setSocialModalLead(lead);
    setSocialDmDraft(buildSocialDmMessage(lead));
    setCopiedSocialDm(false);
  };

  const handleCopySocialDm = () => {
    if (!socialDmDraft) return;
    navigator.clipboard.writeText(socialDmDraft);
    setCopiedSocialDm(true);
    setTimeout(() => setCopiedSocialDm(false), 2500);
    showToast('Social DM message copied to clipboard!');
  };

  const handleLaunchSocialWhatsApp = () => {
    if (!socialModalLead) return;
    navigator.clipboard.writeText(socialDmDraft);
    const cleanPhone = socialModalLead.phone ? socialModalLead.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(socialDmDraft)}`
      : `https://wa.me/?text=${encodeURIComponent(socialDmDraft)}`;
    window.open(waUrl, '_blank');
    showToast('DM message copied & opening WhatsApp!');
  };

  const handleLaunchSocialMessenger = () => {
    if (!socialModalLead) return;
    navigator.clipboard.writeText(socialDmDraft);
    const verifiedUrl = getVerifiedSocialLink(socialModalLead.linkedin_url, socialModalLead.notes);
    if (verifiedUrl && verifiedUrl.includes('facebook.com')) {
      window.open(verifiedUrl, '_blank');
      showToast('DM copied! Opening Facebook profile.');
    } else {
      window.open('https://www.facebook.com/messages/t/', '_blank');
      showToast('DM copied! Opening Messenger.');
    }
  };

  const handleGenerateInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.full_name.trim()) {
      showToast('Alumnus full name is required', 'error');
      return;
    }
    setIsGeneratingInvite(true);

    const cleanName = generateForm.full_name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const finalEmail =
      generateForm.email.trim() ||
      `${slug}.${Math.random().toString(36).substring(2, 6)}@alumni.bubt.edu.bd`;

    const verifiedSocial = getVerifiedSocialLink(generateForm.social_url);

    const res = await createAlumniLead({
      full_name: cleanName,
      email: finalEmail,
      department: generateForm.department,
      passing_year: generateForm.passing_year ? Number(generateForm.passing_year) : null,
      intake: generateForm.intake ? Number(generateForm.intake) : null,
      company: generateForm.company.trim() || null,
      designation: generateForm.designation.trim() || null,
      linkedin_url: verifiedSocial || (generateForm.social_url.trim() ? generateForm.social_url.trim() : null),
      phone: generateForm.phone.trim() || null,
      notes: `Manual VIP invite generated by admin (${generateForm.source_platform || 'Online Discovery'})`,
    });

    setIsGeneratingInvite(false);

    if (res.error || !res.data) {
      showToast(res.error || 'Failed to generate invite link', 'error');
    } else {
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : 'https://bubt.edu51portal.live';
      const inviteUrl = `${origin}/alumni-invite?token=${res.data.invite_token}`;
      const dmText = buildSocialDmMessage(res.data);
      setGeneratedInviteResult({
        lead: res.data,
        inviteUrl,
        dmMessage: dmText,
      });
      showToast(`VIP Invite Link generated for ${cleanName}!`);
      fetchLeads();
    }
  };

  const handleShareWhatsApp = (item: AlumniInvitation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live';
    const inviteUrl = `${origin}/alumni-invite?token=${item.invite_token}`;
    const message = `Assalamu Alaikum ${item.full_name}! 🎓\n\nOn behalf of BUBT Intake 51, your official alumni profile has been pre-verified on Edu51Portal.\n\nPlease claim and activate your official profile in 30 seconds:\n${inviteUrl}\n\nWe look forward to reconnecting with you!`;
    navigator.clipboard.writeText(message);
    const cleanPhone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    showToast('WhatsApp invitation prepared & copied to clipboard!');
  };

  const handleShareFacebook = (item: AlumniInvitation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live';
    const inviteUrl = `${origin}/alumni-invite?token=${item.invite_token}`;
    const message = `Assalamu Alaikum ${item.full_name}! 🎓\n\nOn behalf of BUBT Intake 51, your official alumni profile has been pre-verified on Edu51Portal.\n\nPlease claim and activate your profile here:\n${inviteUrl}`;
    navigator.clipboard.writeText(message);
    if (item.linkedin_url && item.linkedin_url.includes('facebook.com')) {
      window.open(item.linkedin_url, '_blank');
      showToast('Invite copied! Opening Facebook profile to send via Messenger.');
    } else {
      window.open('https://www.facebook.com/messages/t/', '_blank');
      showToast('Invite message copied to clipboard for Messenger!');
    }
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

  const loadSampleData = (type: 'google' | 'facebook' | 'linkedin') => {
    if (type === 'google') {
      setUniversalPastedText(
`Md. Tanvir Ahmed - Senior Software Engineer at Brain Station 23 | LinkedIn · Bangladesh University of Business and Technology · Dhaka, Bangladesh
Sadia Sultana - Data Analyst at Robi Axiata | LinkedIn · BUBT CSE Intake 46 · Dhaka
Engr. Rakibul Hasan - Lead Architect - Selise Digital Platforms https://linkedin.com/in/rakib-bubt`
      );
    } else if (type === 'facebook') {
      setUniversalPastedText(
`Ashikur Rahman (Intake 42, CSE) - Network Engineer at Grameenphone - https://facebook.com/ashikur.rahman
Sadia Afrin (Intake 48, BBA) @ bKash Limited https://www.facebook.com/sadia.afrin.99
Engr. Mahmudul Hasan, Intake 39, Textile Engineering, Senior Merchandiser at DBL Group, https://facebook.com/mahmudul.dbl`
      );
    } else {
      setUniversalPastedText(
`[
  {
    "name": "Nahid Bin Azhar",
    "headline": "CTO at JoulesLabs",
    "department": "CSE",
    "link": "https://bd.linkedin.com/in/nahid-bin-azhar"
  },
  {
    "name": "Sharmin Akter",
    "headline": "Software Quality Assurance Engineer at Enosis Solutions",
    "department": "CSE",
    "link": "https://bd.linkedin.com/in/sharmin-sqa"
  }
]`
      );
    }
    showToast(`Loaded sample ${type} alumni records!`);
  };

  const handleImportUniversalLeads = async () => {
    if (parsedUniversalLeads.length === 0) {
      showToast('Please paste alumni text, search snippets, or profiles first.', 'error');
      return;
    }

    const leads: CreateAlumniLeadInput[] = parsedUniversalLeads.map((item) => {
      const cleanName = item.full_name;
      const fallbackEmail =
        item.email ||
        `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@alumni.bubt.edu.bd`;
      return {
        full_name: cleanName,
        email: fallbackEmail,
        department: item.department || universalDept,
        passing_year: item.passing_year,
        intake: item.intake,
        company: item.company,
        designation: item.designation,
        linkedin_url: item.linkedin_url,
        notes: `Captured via Universal Collector (${item.source})`,
      };
    });

    const res = await bulkImportAlumniLeads(leads);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Successfully captured ${res.count} alumni from ${parsedUniversalLeads.length} parsed profiles!`);
      setIsUniversalCollectorOpen(false);
      setUniversalPastedText('');
      fetchLeads();
      setActiveTab('outreach');
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || 'AL').toUpperCase();
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 border ${
      isDarkMode
        ? 'bg-slate-900/60 backdrop-blur-2xl border-slate-800/80 shadow-2xl shadow-black/40'
        : 'bg-white/95 backdrop-blur-xl border-slate-200/90 shadow-xl shadow-slate-200/40'
    }`}>
      {/* Subtle ambient lighting gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none blur-2xl" />

      {/* Toast Notification */}
      {actionMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-semibold transition-all backdrop-blur-xl border animate-in slide-in-from-bottom-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-600/95 border-emerald-500/50 text-white shadow-emerald-500/25'
            : 'bg-rose-600/95 border-rose-500/50 text-white shadow-rose-500/25'
        }`}>
          {actionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      <div className="relative z-10 p-4 sm:p-6 lg:p-7 space-y-6">
        {/* Executive Header Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-5 border-b border-slate-200/70 dark:border-slate-800/70">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                isDarkMode
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 text-cyan-700 shadow-sm'
              }`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Alumni Outreach & Intelligence
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isDarkMode
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
                      : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{counts.total} Candidates</span>
                  </span>
                </div>
              </div>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Multi-channel prospect collection across web networks, automated 72h cooldown dispatch, and frictionless VIP onboarding.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            <button
              onClick={() => {
                setTemplateDraft(getEmailTemplates());
                setIsTemplateModalOpen(true);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Inspect or customize invitation email templates and dynamic tags"
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Email Templates</span>
            </button>

            <button
              onClick={() => setIsUniversalCollectorOpen(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Prospect and extract alumni from Google X-Ray, Facebook groups, and LinkedIn directory"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Universal Collector</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
              }`}>
                Google · FB · In
              </span>
            </button>

            <button
              onClick={() => setIsCsvModalOpen(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Bulk import alumnus leads from CSV text"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => {
                setGeneratedInviteResult(null);
                setGenerateForm({
                  full_name: '',
                  department: 'CSE',
                  passing_year: new Date().getFullYear() - 2,
                  intake: '',
                  company: '',
                  designation: '',
                  social_url: '',
                  email: '',
                  phone: '',
                  source_platform: 'Facebook Group / Post',
                });
                setIsGenerateModalOpen(true);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border-emerald-500/30 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200 shadow-sm'
              }`}
              title="Generate instant VIP invite link & Social DM copy for an alumnus found online"
            >
              <Link className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant VIP Link</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Prospect</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar (Modern Segmented Style) */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100/80 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('outreach')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'outreach'
                  ? isDarkMode
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                    : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Outreach Pipeline</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'outreach'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('discovery');
                if (discoveredAlumni.length === 0) {
                  handleRunDiscovery();
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'discovery'
                  ? isDarkMode
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                    : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Faculty Directory</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'discovery'
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                9 Faculties
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Autonomous 72h Cooldown Protection Active</span>
          </div>
        </div>

        {/* Conditional Tab Rendering */}
        {activeTab === 'outreach' ? (
          <div className="space-y-6">
            {/* Executive KPI Funnel Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Card 1: Total Prospects */}
              <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-800/40'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total Prospects
                  </span>
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {counts.total}
                </p>
                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  All active candidate leads
                </span>
              </div>

              {/* Card 2: New (Unsent) */}
              <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-800/40'
                  : 'bg-white border-slate-200/80 hover:border-blue-300 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600'}`}>
                    New (Unsent)
                  </span>
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {counts.new}
                </p>
                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Ready for initial dispatch
                </span>
              </div>

              {/* Card 3: Pending (Invited) */}
              <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-800/40'
                  : 'bg-white border-slate-200/80 hover:border-amber-300 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-amber-300/80' : 'text-amber-600'}`}>
                    Pending (Invited)
                  </span>
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  {counts.invited}
                </p>
                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  In 72h cooldown window
                </span>
              </div>

              {/* Card 4: Joined & Active */}
              <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-800/40'
                  : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-600'}`}>
                    Joined & Active
                  </span>
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {counts.joined}
                </p>
                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Claimed & registered users
                </span>
              </div>

              {/* Card 5: 72h+ Re-invite Ready */}
              <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden group col-span-2 sm:col-span-1 ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-800/40'
                  : 'bg-white border-slate-200/80 hover:border-purple-300 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-300/80' : 'text-purple-600'}`}>
                    Re-invite Ready
                  </span>
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {counts.eligible}
                </p>
                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Cooldown expired (72h+)
                </span>
              </div>
            </div>

            {/* Unified Command & Filter Toolbar */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-0">
                  <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by alumnus name, email, company, job designation..."
                    className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dept Selector & Batch Actions */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className={`w-full sm:w-44 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-semibold ${
                      isDarkMode
                        ? 'bg-slate-950/60 border-slate-800 text-slate-200 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-600'
                    }`}
                  >
                    <option value="all">All Departments</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {counts.new > 0 && (
                    <button
                      onClick={handleSendAllNew}
                      disabled={batchSending}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Invite All New ({counts.new})</span>
                    </button>
                  )}

                  {counts.eligible > 0 && (
                    <button
                      onClick={handleSendAllReminders}
                      disabled={batchSending}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${batchSending ? 'animate-spin' : ''}`} />
                      <span>Send Reminders ({counts.eligible})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filters Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                {[
                  { id: 'all', label: 'All', count: counts.total },
                  { id: 'new', label: 'New Leads', count: counts.new },
                  { id: 'invited', label: 'Invited', count: counts.invited },
                  { id: 'eligible', label: 'Ready for Reminder', count: counts.eligible },
                  { id: 'joined', label: 'Joined', count: counts.joined },
                ].map((tab) => {
                  const isSelected = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                          : isDarkMode
                          ? 'bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isDarkMode
                          ? 'bg-slate-700/60 text-slate-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modern Prospects Table */}
            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-500 mb-3" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading alumni outreach prospects...</p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Connecting to Supabase and evaluating 72-hour cooldown states...
                </p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className={`py-16 text-center rounded-2xl border border-dashed ${
                isDarkMode ? 'border-slate-800 text-slate-400 bg-slate-950/20' : 'border-slate-200 text-slate-500 bg-slate-50/50'
              }`}>
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
                <p className="text-sm font-bold">No alumni prospects found</p>
                <p className="text-xs mt-1 text-slate-500">
                  Try clearing search filters or import new candidates from Universal Collector or CSV.
                </p>
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden transition-all ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-white'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                        isDarkMode ? 'border-slate-800/80 text-slate-400 bg-slate-900/60' : 'border-slate-200 text-slate-500 bg-slate-50'
                      }`}>
                        <th className="py-3.5 px-4">Alumnus Profile</th>
                        <th className="py-3.5 px-4">Department & Class</th>
                        <th className="py-3.5 px-4">Current Career</th>
                        <th className="py-3.5 px-4">Status & Cooldown</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
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
                              isDarkMode ? 'hover:bg-cyan-500/[0.04]' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Alumnus Profile Column */}
                            <td className="py-3.5 px-4 min-w-[200px]">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                                  isDarkMode
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-300 border-cyan-500/30'
                                    : 'bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-800 border-cyan-200'
                                }`}>
                                  {getInitials(item.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span className="truncate">{item.full_name}</span>
                                    {(() => {
                                      const verifiedUrl = getVerifiedSocialLink(item.linkedin_url, item.notes);
                                      if (!verifiedUrl) return null;
                                      const isFb = verifiedUrl.includes('facebook.com');
                                      const isLi = verifiedUrl.includes('linkedin.com');
                                      return (
                                        <a
                                          href={verifiedUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          title={
                                            isFb
                                              ? 'Verified Facebook Profile'
                                              : isLi
                                              ? 'Verified LinkedIn Profile'
                                              : 'Verified Social Profile'
                                          }
                                          className={`p-0.5 rounded transition-colors ${
                                            isFb
                                              ? 'text-blue-500 hover:text-blue-400'
                                              : isLi
                                              ? 'text-sky-500 hover:text-sky-400'
                                              : 'text-slate-400 hover:text-cyan-400'
                                          }`}
                                        >
                                          {isFb ? (
                                            <Facebook className="w-3.5 h-3.5" />
                                          ) : isLi ? (
                                            <Linkedin className="w-3.5 h-3.5" />
                                          ) : (
                                            <Globe className="w-3.5 h-3.5" />
                                          )}
                                        </a>
                                      );
                                    })()}
                                  </div>
                                  <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {item.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Department & Class */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                  isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                }`}>
                                  {item.department}
                                </span>
                                <div className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {item.passing_year ? `Class of ${item.passing_year}` : 'Graduate'}
                                  {item.intake ? ` · Intake ${item.intake}` : ''}
                                </div>
                              </div>
                            </td>

                            {/* Current Career */}
                            <td className="py-3.5 px-4 min-w-[170px]">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                                  {item.designation || 'Alumnus'}
                                </p>
                                <p className={`text-[11px] truncate flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  <Building className="w-3 h-3 flex-shrink-0 text-slate-500" />
                                  <span className="truncate">{item.company || 'Not specified'}</span>
                                </p>
                              </div>
                            </td>

                            {/* Status & 72h Cooldown */}
                            <td className="py-3.5 px-4 min-w-[180px]">
                              {item.status === 'joined' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Active Member
                                </span>
                              ) : item.status === 'new' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  New Lead
                                </span>
                              ) : item.status === 'already_registered' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                                  Registered
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Invited ({item.invite_count}x)
                                  </span>
                                  <div>
                                    {eligibility.eligible ? (
                                      <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-purple-400" />
                                        72h+ cleared · Ready to re-invite
                                      </span>
                                    ) : (
                                      <span className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        <Clock className="w-3 h-3" />
                                        {eligibility.remainingHours}h cooldown left
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Send / Re-invite */}
                                {item.status !== 'joined' && item.status !== 'already_registered' && (
                                  <button
                                    onClick={() => handleOpenSendModal(item)}
                                    disabled={isSendingThis || !eligibility.eligible}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                      item.status === 'new'
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/20 active:scale-95'
                                        : eligibility.eligible
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-600/20 active:scale-95'
                                        : 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800'
                                    }`}
                                    title={eligibility.eligible ? 'Review & customize message body before sending' : eligibility.reason}
                                  >
                                    {isSendingThis ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : item.status === 'new' ? (
                                      <>
                                        <Mail className="w-3 h-3" />
                                        <span>Invite</span>
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Re-invite</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Social DM Ready Message Button */}
                                {item.status !== 'joined' && (
                                  <button
                                    onClick={() => handleOpenSocialModal(item)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                                      isDarkMode
                                        ? 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border-emerald-500/30 shadow-sm'
                                        : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200 shadow-sm'
                                    }`}
                                    title="Social Media Ready DM (Copy invitation text & link for Messenger / WhatsApp / DM)"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="hidden sm:inline">Social DM</span>
                                  </button>
                                )}

                                {/* Copy Magic Link Button */}
                                {item.status !== 'joined' && (
                                  <button
                                    onClick={() => handleCopyLink(item.invite_token, item.id)}
                                    className={`p-1.5 rounded-xl border transition-all active:scale-95 ${
                                      copiedId === item.id
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                        : isDarkMode
                                        ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                    title="Copy Magic Invite Link"
                                  >
                                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}

                                {/* Delete Lead */}
                                <button
                                  onClick={() => handleDeleteLead(item.id, item.full_name)}
                                  className={`p-1.5 rounded-xl border border-transparent transition-all active:scale-95 ${
                                    isDarkMode
                                      ? 'hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 hover:border-rose-500/30'
                                      : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-200'
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
              </div>
            )}
          </div>
        ) : (
          /* SUB-TAB 2: AUTO-DISCOVERY & MASS CAPTURE */
          <div className="space-y-5">
            {/* Discovery Controls Bar */}
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      BUBT Multi-Department Graduate Directory & Discovery
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      All 9 Faculties
                    </span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Query verified BUBT graduates across all faculties, or prospect live profiles directly from Google, Facebook, and LinkedIn.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCaptureAllSelected}
                    disabled={discoveryLoading || selectedDiscoveredIds.size === 0}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Capture Selected ({selectedDiscoveredIds.size})</span>
                  </button>
                  <button
                    onClick={() => setIsUniversalCollectorOpen(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
                      isDarkMode ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Universal Collector (Google · FB · In)</span>
                  </button>
                </div>
              </div>

              {/* Explanation Banner */}
              <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-sky-50/70 border-sky-200/80 text-sky-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">💡</span>
                  <span className="leading-snug">
                    <strong>How it works:</strong> Search our pre-indexed directory across all 9 faculties below, or launch <strong>Universal Collector</strong> to prospect directly from social networks.
                  </span>
                </div>
                <button
                  onClick={() => setIsUniversalCollectorOpen(true)}
                  className="text-[11px] font-bold text-sky-400 hover:underline shrink-0 flex items-center gap-1"
                >
                  Open Universal Collector →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Dept Selector */}
                <div className="sm:col-span-3">
                  <select
                    value={discoveryDept}
                    onChange={(e) => setDiscoveryDept(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold border outline-none ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white focus:border-cyan-500' : 'bg-white border-slate-300 text-slate-800 focus:border-cyan-600'
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
                      isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* Search Button */}
                <div className="sm:col-span-2">
                  <button
                    onClick={handleRunDiscovery}
                    disabled={discoveryLoading}
                    className="w-full h-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Search className={`w-3.5 h-3.5 ${discoveryLoading ? 'animate-spin' : ''}`} />
                    <span>{discoveryLoading ? 'Filtering...' : 'Search'}</span>
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
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Scanning BUBT alumni records across departments...</p>
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
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
                            : 'bg-cyan-50/50 border-cyan-400/60 shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-800/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
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
                                <span>View LinkedIn Profile</span>
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>In Prospects</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCaptureCandidate(cand)}
                            disabled={isCapturing}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Plus className={`w-3 h-3 ${isCapturing ? 'animate-spin' : ''}`} />
                            <span>{isCapturing ? 'Capturing...' : 'Capture'}</span>
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

      {/* MODAL 3: Universal Alumni Collector (Google · Facebook · LinkedIn) */}
      {isUniversalCollectorOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsUniversalCollectorOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-3xl rounded-2xl p-5 sm:p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsUniversalCollectorOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Universal Alumni Collector
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    Google · Facebook · LinkedIn
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Prospect and extract BUBT alumni from Google X-Ray Search, Facebook Alumni Groups & Posts, and LinkedIn Directory.
                </p>
              </div>
            </div>

            {/* Platform Discovery Tabs */}
            <div className="border-b pb-3 mb-4 border-slate-700/60">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <span>1. Select Discovery Tool:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCollectorTab('google')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    collectorTab === 'google'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google X-Ray</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCollectorTab('facebook')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    collectorTab === 'facebook'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-400" />
                  <span>Facebook Groups</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCollectorTab('linkedin')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    collectorTab === 'linkedin'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Linkedin className="w-3.5 h-3.5 text-sky-400" />
                  <span>LinkedIn Directory</span>
                </button>
              </div>
            </div>

            {/* Platform Launcher Card */}
            {collectorTab === 'google' && (
              <div className={`p-4 rounded-xl border mb-4 space-y-3 ${
                isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    Targeted Google Search Query Generator
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Target:</span>
                    <button
                      type="button"
                      onClick={() => setGoogleTarget('linkedin')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        googleTarget === 'linkedin' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      LinkedIn
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleTarget('facebook')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        googleTarget === 'facebook' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Facebook
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleTarget('web')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        googleTarget === 'web' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      General Web
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Target Department</label>
                    <input
                      type="text"
                      value={googleDept}
                      onChange={(e) => setGoogleDept(e.target.value)}
                      placeholder="Computer Science / EEE / BBA"
                      className={`w-full px-3 py-1.5 rounded-lg border outline-none text-xs ${
                        isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Target Role / Skill</label>
                    <input
                      type="text"
                      value={googleRole}
                      onChange={(e) => setGoogleRole(e.target.value)}
                      placeholder="Software Engineer / Marketing / Officer"
                      className={`w-full px-3 py-1.5 rounded-lg border outline-none text-xs ${
                        isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border font-mono text-[11px] overflow-x-auto ${
                  isDarkMode ? 'bg-slate-950/80 border-slate-800 text-amber-300' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {getGoogleSearchQuery()}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyGoogleQuery}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Query
                  </button>
                  <button
                    type="button"
                    onClick={handleLaunchGoogleSearch}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch Google Search
                  </button>
                </div>
              </div>
            )}

            {collectorTab === 'facebook' && (
              <div className={`p-4 rounded-xl border mb-4 space-y-3 ${
                isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5" />
                  1-Click Facebook Alumni Launchers:
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open Facebook to discover alumni profiles, graduate groups, and alumni batch posts. Simply copy profile links or post texts and paste below!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <a
                    href="https://www.facebook.com/search/groups/?q=BUBT+alumni"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    BUBT Alumni Groups
                  </a>
                  <a
                    href="https://www.facebook.com/search/people/?q=BUBT+alumni"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    BUBT Alumni People
                  </a>
                  <a
                    href="https://www.facebook.com/search/top/?q=BUBT+CSE+Alumni"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    CSE Alumni Association
                  </a>
                </div>
              </div>
            )}

            {collectorTab === 'linkedin' && (
              <div className={`p-4 rounded-xl border mb-4 space-y-3 ${
                isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-sky-50/50 border-sky-200'
              }`}>
                <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" />
                  BUBT LinkedIn People Directory & Bookmarklet Extractor
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open BUBT's official LinkedIn page to scroll verified graduates, or run our fast bookmarklet script to copy dozens of profiles at once:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <a
                    href="https://www.linkedin.com/school/bubt/people/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open BUBT LinkedIn People
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const script = `javascript:(function(){const c=document.querySelectorAll('.org-people-profile-card,.artdeco-card,.entity-result');const l=[];c.forEach(x=>{const n=x.querySelector('.org-people-profile-card__profile-title,.entity-result__title-text a,.app-aware-link');const h=x.querySelector('.artdeco-entity-lockup__subtitle,.entity-result__primary-subtitle,.org-people-profile-card__profile-sub-title');const a=x.querySelector('a[href*="/in/"]');if(n&&a){const nm=n.innerText.trim().replace(/\\n+/g,' ');const hd=h?h.innerText.trim().replace(/\\n+/g,' '):'';const lk=a.href.split('?')[0];if(nm&&lk&&!l.some(y=>y.name===nm))l.push({name:nm,headline:hd,link:lk});}});if(!l.length){alert('No alumni profiles found. Scroll down the LinkedIn page and click again!');return;}navigator.clipboard.writeText(JSON.stringify(l,null,2)).then(()=>alert('Captured '+l.length+' BUBT alumni profiles! Now paste into Edu51 Portal.'));})();`;
                      navigator.clipboard.writeText(script);
                      showToast('Bookmarklet script copied to clipboard!');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Bookmarklet Script
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Universal Smart Paste Box */}
            <div className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-slate-300">
                    2. Universal Freeform Paste Box:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (Auto-detects FB, Google, In & JSON)
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Default Dept:</span>
                  <select
                    value={universalDept}
                    onChange={(e) => setUniversalDept(e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sample loader chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-slate-400 font-medium">Load sample test:</span>
                <button
                  type="button"
                  onClick={() => loadSampleData('google')}
                  className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                >
                  + Google Search Snippet
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleData('facebook')}
                  className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20"
                >
                  + Facebook Post / Profile
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleData('linkedin')}
                  className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20"
                >
                  + LinkedIn JSON
                </button>
              </div>

              <textarea
                rows={6}
                value={universalPastedText}
                onChange={(e) => setUniversalPastedText(e.target.value)}
                placeholder="Paste anything here! Examples:&#10;• Ashikur Rahman (Intake 42, CSE) - Network Engineer at Grameenphone - https://facebook.com/ashikur&#10;• Md. Tanvir Ahmed - Senior Software Engineer at Brain Station 23 | LinkedIn&#10;• Sadia Afrin (Intake 48, BBA) @ bKash Limited&#10;• JSON array from bookmarklet extractor"
                className={`w-full p-3 font-mono text-xs rounded-xl border outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-cyan-300 placeholder:text-slate-600 focus:border-cyan-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
                }`}
              />

              {/* Live Parser Analysis Card */}
              {parsedUniversalLeads.length > 0 && (
                <div className={`p-3 rounded-xl border space-y-2 max-h-48 overflow-y-auto ${
                  isDarkMode ? 'bg-slate-900/90 border-cyan-500/30' : 'bg-cyan-50/50 border-cyan-200'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold border-b pb-1.5 border-slate-700/60">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {parsedCountsBySource.total} alumni profile(s) successfully detected:
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {parsedCountsBySource.fb > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {parsedCountsBySource.fb} Facebook
                        </span>
                      )}
                      {parsedCountsBySource.li > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {parsedCountsBySource.li} LinkedIn
                        </span>
                      )}
                      {parsedCountsBySource.web > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {parsedCountsBySource.web} Web / Google
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {parsedUniversalLeads.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                          isDarkMode ? 'bg-slate-800/60' : 'bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-100">{item.full_name}</span>
                          <span className="text-slate-400 ml-1.5">
                            {item.designation ? `${item.designation}` : 'Alumnus'}
                            {item.company ? ` @ ${item.company}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                            {item.department} {item.intake ? `· In ${item.intake}` : ''}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.source === 'Facebook'
                              ? 'bg-blue-500/20 text-blue-400'
                              : item.source === 'LinkedIn'
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2">
                <div>
                  {universalPastedText.trim() && (
                    <button
                      type="button"
                      onClick={() => setUniversalPastedText('')}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Clear Text
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUniversalCollectorOpen(false)}
                    className={`px-4 py-2 rounded-lg font-medium text-xs ${
                      isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={parsedUniversalLeads.length === 0}
                    onClick={handleImportUniversalLeads}
                    className="px-5 py-2 rounded-lg font-bold text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Capture All ({parsedUniversalLeads.length}) Into Prospects
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 5: Global Email Template & Message Customizer */}
      {isTemplateModalOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsTemplateModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-3xl rounded-2xl p-5 sm:p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Alumni Invitation Message & Email Template</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customize the default email subject and message body delivered to alumni prospects.
                </p>
              </div>
            </div>

            {/* Template Type Tabs & Preview Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 mb-4 border-b pb-3 border-slate-700/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateActiveTab('invite')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    templateActiveTab === 'invite'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Initial Invitation (New Leads)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateActiveTab('reminder')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    templateActiveTab === 'reminder'
                      ? 'bg-purple-600 text-white shadow-md'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  72h Follow-up Reminder
                </button>
              </div>

              {/* View Switcher: Edit vs Preview */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setTemplatePreviewMode(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                    !templatePreviewMode ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Message
                </button>
                <button
                  type="button"
                  onClick={() => setTemplatePreviewMode(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                    templatePreviewMode ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Live Preview
                </button>
              </div>
            </div>

            {!templatePreviewMode ? (
              /* Edit Mode */
              <div className="space-y-4 text-xs">
                {/* Subject Field */}
                <div>
                  <label className="block font-bold mb-1.5 text-slate-300">Email Subject Line</label>
                  <input
                    type="text"
                    value={templateActiveTab === 'invite' ? templateDraft.inviteSubject : templateDraft.reminderSubject}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (templateActiveTab === 'invite') {
                        setTemplateDraft({ ...templateDraft, inviteSubject: val });
                      } else {
                        setTemplateDraft({ ...templateDraft, reminderSubject: val });
                      }
                    }}
                    placeholder="Subject line..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Dynamic Variables Chips */}
                <div className={`p-3 rounded-xl border ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`block font-semibold mb-1.5 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Click to insert dynamic variable tag into message body:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLE_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          if (templateActiveTab === 'invite') {
                            setTemplateDraft({
                              ...templateDraft,
                              inviteBody: templateDraft.inviteBody + ' ' + chip.label,
                            });
                          } else {
                            setTemplateDraft({
                              ...templateDraft,
                              reminderBody: templateDraft.reminderBody + ' ' + chip.label,
                            });
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all ${
                          isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                            : 'bg-white hover:bg-cyan-50 text-cyan-800 border border-slate-200'
                        }`}
                        title={chip.desc}
                      >
                        <span className="font-bold">{chip.label}</span>
                        <span className="opacity-60 text-[10px]">({chip.desc})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Body Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-300">
                      Message Body (Greeting & Introduction)
                    </label>
                    <span className="text-[11px] text-slate-500">Separate paragraphs with an empty line</span>
                  </div>
                  <textarea
                    rows={8}
                    value={templateActiveTab === 'invite' ? templateDraft.inviteBody : templateDraft.reminderBody}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (templateActiveTab === 'invite') {
                        setTemplateDraft({ ...templateDraft, inviteBody: val });
                      } else {
                        setTemplateDraft({ ...templateDraft, reminderBody: val });
                      }
                    }}
                    placeholder="Write the message greeting and body text..."
                    className={`w-full p-3.5 rounded-xl border font-sans text-xs sm:text-sm leading-relaxed outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-400' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    💡 This message text appears prominently at the top of the invitation email, followed by the alumnus's pre-filled university file card and instant profile claim button.
                  </p>
                </div>
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="space-y-3">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Simulating preview with sample alumnus profile</span>
                  <span className="text-cyan-400 font-semibold font-mono text-[11px]">
                    Subject: {interpolateTemplate(
                      templateActiveTab === 'invite' ? templateDraft.inviteSubject : templateDraft.reminderSubject,
                      { full_name: 'Engr. Md. Tanvir Ahmed' }
                    )}
                  </span>
                </div>
                <iframe
                  title="Email Template Preview"
                  srcDoc={buildInvitationEmailHtml(
                    {
                      full_name: 'Engr. Md. Tanvir Ahmed',
                      department: 'CSE',
                      passing_year: 2022,
                      intake: 42,
                      company: 'Brain Station 23',
                      designation: 'Senior Full Stack Engineer',
                      status: templateActiveTab === 'reminder' ? 'invited' : 'new',
                      invite_count: templateActiveTab === 'reminder' ? 1 : 0,
                    },
                    'https://bubt.edu51portal.live/alumni-invite?token=demo',
                    templateActiveTab === 'reminder',
                    interpolateTemplate(
                      templateActiveTab === 'invite' ? templateDraft.inviteSubject : templateDraft.reminderSubject,
                      { full_name: 'Engr. Md. Tanvir Ahmed' }
                    ),
                    interpolateTemplate(
                      templateActiveTab === 'invite' ? templateDraft.inviteBody : templateDraft.reminderBody,
                      { full_name: 'Engr. Md. Tanvir Ahmed', department: 'CSE' }
                    )
                  )}
                  className="w-full h-[460px] rounded-xl border border-slate-700 bg-[#0b0e14]"
                  sandbox="allow-same-origin"
                />
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 mt-4 border-t border-slate-700/60">
              <button
                type="button"
                onClick={handleResetDefaultTemplate}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to University Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDefaultTemplate}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Default Template
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 6: Single Alumnus Send & Message Inspection */}
      {inviteModalLead && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setInviteModalLead(null); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-3xl rounded-2xl p-5 sm:p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setInviteModalLead(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  Send Invitation to {inviteModalLead.full_name}
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Review and customize the message body and subject before dispatching.
                </p>
              </div>
            </div>

            {/* Alumnus Recipient Card */}
            <div className={`p-3.5 rounded-xl border my-3.5 flex flex-wrap items-center justify-between gap-3 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{inviteModalLead.full_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                    {inviteModalLead.department}
                  </span>
                  {inviteModalLead.status === 'invited' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      Follow-up Reminder
                    </span>
                  )}
                </div>
                <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {inviteModalLead.email} · {inviteModalLead.designation || 'Alumnus'} {inviteModalLead.company ? `at ${inviteModalLead.company}` : ''}
                </div>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setSinglePreviewMode(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                    !singlePreviewMode ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  Customize Message
                </button>
                <button
                  type="button"
                  onClick={() => setSinglePreviewMode(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                    singlePreviewMode ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Live Email Preview
                </button>
              </div>
            </div>

            {!singlePreviewMode ? (
              /* Edit Form */
              <div className="space-y-3.5 text-xs">
                {/* Subject Line */}
                <div>
                  <label className="block font-bold mb-1.5 text-slate-300">Email Subject Line</label>
                  <input
                    type="text"
                    value={customSubjectDraft}
                    onChange={(e) => setCustomSubjectDraft(e.target.value)}
                    placeholder="Invitation subject line..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Variable tags */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`text-[11px] mr-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Insert tag:</span>
                  {VARIABLE_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setCustomBodyDraft((prev) => prev + ' ' + chip.label)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300' : 'bg-slate-100 text-cyan-800'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Message Body</label>
                    <span className="text-[11px] text-slate-500">Edit or add personal notes for this alumnus</span>
                  </div>
                  <textarea
                    rows={7}
                    value={customBodyDraft}
                    onChange={(e) => setCustomBodyDraft(e.target.value)}
                    placeholder="Enter customized invitation message..."
                    className={`w-full p-3.5 rounded-xl border font-sans text-xs sm:text-sm leading-relaxed outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-400' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Save as default template checkbox */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 select-none pt-1">
                  <input
                    type="checkbox"
                    checked={saveAsDefaultTemplate}
                    onChange={(e) => setSaveAsDefaultTemplate(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Save this message text as the default template for future invitations</span>
                </label>
              </div>
            ) : (
              /* Live Preview */
              <div className="space-y-3">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Exact rendering for <strong>{inviteModalLead.email}</strong></span>
                  <span className="text-cyan-400 font-semibold font-mono text-[11px]">
                    Subject: {customSubjectDraft}
                  </span>
                </div>
                <iframe
                  title="Alumnus Email Preview"
                  srcDoc={buildInvitationEmailHtml(
                    inviteModalLead,
                    `${typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live'}/alumni-invite?token=${inviteModalLead.invite_token}`,
                    inviteModalLead.status === 'invited',
                    customSubjectDraft,
                    customBodyDraft
                  )}
                  className="w-full h-[460px] rounded-xl border border-slate-700 bg-[#0b0e14]"
                  sandbox="allow-same-origin"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 mt-4 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => handleCopyLink(inviteModalLead.invite_token, inviteModalLead.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  copiedId === inviteModalLead.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copiedId === inviteModalLead.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Direct Claim Link
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalLead(null)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSendInvite}
                  disabled={sendingId === inviteModalLead.id}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {sendingId === inviteModalLead.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Invitation Email Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 7: Social Media Ready Outreach DM */}
      {socialModalLead && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSocialModalLead(null); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-2xl rounded-2xl p-5 sm:p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setSocialModalLead(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Social DM Outreach · {socialModalLead.full_name}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    VIP Auto-Bypass
                  </span>
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ready-to-paste invitation message formatted with pre-verified claim link for Messenger or WhatsApp.
                </p>
              </div>
            </div>

            {/* Recipient Card */}
            <div className={`p-3 rounded-xl border my-3.5 flex flex-wrap items-center justify-between gap-2.5 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="font-bold text-sm text-cyan-400">{socialModalLead.full_name}</span>
                <span className="text-xs text-slate-400 ml-2">
                  Dept: <strong>{socialModalLead.department}</strong>
                  {socialModalLead.passing_year ? ` · Class of ${socialModalLead.passing_year}` : ''}
                  {socialModalLead.intake ? ` (Intake ${socialModalLead.intake})` : ''}
                </span>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {socialModalLead.designation || 'Alumnus'} {socialModalLead.company ? `at ${socialModalLead.company}` : ''}
                  {socialModalLead.phone ? ` · 📞 ${socialModalLead.phone}` : ''}
                </p>
              </div>

              {(() => {
                const verifiedUrl = getVerifiedSocialLink(socialModalLead.linkedin_url, socialModalLead.notes);
                if (!verifiedUrl) return null;
                return (
                  <a
                    href={verifiedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 flex items-center gap-1.5"
                  >
                    {verifiedUrl.includes('facebook.com') ? (
                      <Facebook className="w-3.5 h-3.5" />
                    ) : verifiedUrl.includes('linkedin.com') ? (
                      <Linkedin className="w-3.5 h-3.5" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    <span>View Social Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })()}
            </div>

            {/* Message Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Direct Message Text (Editable)
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 mr-1">Insert:</span>
                  {[
                    { label: '{{name}}', val: socialModalLead.full_name },
                    { label: '{{dept}}', val: socialModalLead.department },
                    {
                      label: '{{link}}',
                      val: `${typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live'}/alumni-invite?token=${socialModalLead.invite_token}`,
                    },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setSocialDmDraft((prev) => prev + ' ' + chip.val)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isDarkMode ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700' : 'bg-slate-100 text-cyan-800'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={9}
                value={socialDmDraft}
                onChange={(e) => setSocialDmDraft(e.target.value)}
                className={`w-full p-3.5 rounded-xl border font-sans text-xs sm:text-sm leading-relaxed outline-none ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-400'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 mt-3 border-t border-slate-700/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchSocialWhatsApp}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  title="Copies message and opens WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleLaunchSocialMessenger}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  title="Copies message and opens Facebook Messenger"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  <span>Open Messenger</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSocialModalLead(null)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopySocialDm}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedSocialDm ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy DM Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 8: Generate Instant VIP Invite Link */}
      {isGenerateModalOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsGenerateModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className={`w-full max-w-2xl rounded-2xl p-5 sm:p-6 border shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!generatedInviteResult ? (
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Link className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      Generate Instant VIP Invite Link
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Admin Bypass
                      </span>
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Generate a personalized claim link for an alumnus found on Facebook, LinkedIn, Google, or direct connection.
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border my-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                  isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-start sm:items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5 sm:mt-0" />
                    <span>
                      <strong>VIP Bypass Active:</strong> Registration through this link auto-activates verified alumni status without manual admin review.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live';
                      window.open(`${origin}/alumni-invite?token=demo`, '_blank');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white shrink-0 flex items-center gap-1 shadow-sm transition-all"
                    title="Open live interactive claim page with pre-filled mock alumnus to test the full onboarding flow"
                  >
                    <span>Test Demo Flow</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <form onSubmit={handleGenerateInviteSubmit} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Alumnus Full Name *</label>
                      <input
                        type="text"
                        required
                        value={generateForm.full_name}
                        onChange={(e) => setGenerateForm({ ...generateForm, full_name: e.target.value })}
                        placeholder="e.g. Engr. Tanvir Ahmed"
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Department</label>
                      <select
                        value={generateForm.department}
                        onChange={(e) => setGenerateForm({ ...generateForm, department: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Passing / Graduation Year</label>
                      <input
                        type="number"
                        value={generateForm.passing_year || ''}
                        onChange={(e) => setGenerateForm({ ...generateForm, passing_year: Number(e.target.value) })}
                        placeholder="2022"
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">BUBT Intake (Optional)</label>
                      <input
                        type="number"
                        value={generateForm.intake || ''}
                        onChange={(e) => setGenerateForm({ ...generateForm, intake: e.target.value ? Number(e.target.value) : '' })}
                        placeholder="e.g. 42"
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Current Company</label>
                      <input
                        type="text"
                        value={generateForm.company}
                        onChange={(e) => setGenerateForm({ ...generateForm, company: e.target.value })}
                        placeholder="e.g. Brain Station 23 / Therap BD"
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Job Designation</label>
                      <input
                        type="text"
                        value={generateForm.designation}
                        onChange={(e) => setGenerateForm({ ...generateForm, designation: e.target.value })}
                        placeholder="e.g. Senior Software Engineer"
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Discovered From</label>
                      <select
                        value={generateForm.source_platform}
                        onChange={(e) => setGenerateForm({ ...generateForm, source_platform: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <option value="Facebook Group / Post">Facebook Group / Post</option>
                        <option value="Facebook Profile Search">Facebook Profile Search</option>
                        <option value="LinkedIn People Search">LinkedIn People Search</option>
                        <option value="Google X-Ray Search">Google X-Ray Search</option>
                        <option value="Batchmate Reference">Batchmate Reference</option>
                        <option value="WhatsApp / Telegram">WhatsApp / Telegram</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Social Profile Link (If any)</label>
                      <input
                        type="text"
                        value={generateForm.social_url}
                        onChange={(e) => setGenerateForm({ ...generateForm, social_url: e.target.value })}
                        placeholder="https://facebook.com/username or linkedin.com/in/..."
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        value={generateForm.email}
                        onChange={(e) => setGenerateForm({ ...generateForm, email: e.target.value })}
                        placeholder="Leave blank to auto-generate tracking email"
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Phone / WhatsApp (Optional)</label>
                      <input
                        type="tel"
                        value={generateForm.phone}
                        onChange={(e) => setGenerateForm({ ...generateForm, phone: e.target.value })}
                        placeholder="+8801..."
                        className={`w-full px-3 py-2 rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsGenerateModalOpen(false)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGeneratingInvite}
                      className="px-5 py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isGeneratingInvite ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate VIP Invite Link & DM
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Success & Generated DM Ready View */
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold">
                    VIP Invite Link Generated for {generatedInviteResult.lead.full_name}!
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    BUBT {generatedInviteResult.lead.department} · {generatedInviteResult.lead.designation || 'Alumnus'} {generatedInviteResult.lead.company ? `@ ${generatedInviteResult.lead.company}` : ''}
                  </p>
                </div>

                {/* VIP Bypass Banner */}
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  isDarkMode ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Verification Bypass Active:</strong> This alumnus is authorized. Upon registration through this link, their profile is immediately approved without any admin review required.
                  </span>
                </div>

                {/* Direct Link Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Magic VIP Claim Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteResult.inviteUrl}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-cyan-300' : 'bg-slate-50 border-slate-200 text-cyan-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteResult.inviteUrl);
                        setCopiedGeneratedUrl(true);
                        setTimeout(() => setCopiedGeneratedUrl(false), 2000);
                        showToast('Invite link copied!');
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                    >
                      {copiedGeneratedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGeneratedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Pre-Formatted Social DM */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      Ready-to-Paste Social DM Message
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteResult.dmMessage);
                        setCopiedGeneratedDm(true);
                        setTimeout(() => setCopiedGeneratedDm(false), 2000);
                        showToast('DM message copied to clipboard!');
                      }}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedGeneratedDm ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedGeneratedDm ? 'Copied Message!' : 'Copy Entire DM'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    readOnly
                    value={generatedInviteResult.dmMessage}
                    className={`w-full p-3 rounded-xl border font-sans text-xs sm:text-sm leading-relaxed outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Quick Launch & Footer Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteResult.dmMessage);
                        const cleanPhone = generatedInviteResult.lead.phone ? generatedInviteResult.lead.phone.replace(/[^0-9]/g, '') : '';
                        const waUrl = cleanPhone
                          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(generatedInviteResult.dmMessage)}`
                          : `https://wa.me/?text=${encodeURIComponent(generatedInviteResult.dmMessage)}`;
                        window.open(waUrl, '_blank');
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteResult.dmMessage);
                        window.open('https://www.facebook.com/messages/t/', '_blank');
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"
                    >
                      <Facebook className="w-3.5 h-3.5" />
                      <span>Messenger</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedInviteResult(null);
                        setGenerateForm({
                          full_name: '',
                          department: 'CSE',
                          passing_year: new Date().getFullYear() - 2,
                          intake: '',
                          company: '',
                          designation: '',
                          social_url: '',
                          email: '',
                          phone: '',
                          source_platform: 'Facebook Group / Post',
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                        isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Generate Another
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGenerateModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
                    >
                      Done & View Pipeline
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
