import { supabase } from '../supabase';
import bubtAlumniDirectory from '../../data/bubtAlumniDirectory.json';

export interface DiscoveredAlumnus {
  id: string;
  full_name: string;
  department: string;
  intake?: number | null;
  passing_year?: number | null;
  designation?: string | null;
  company?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  source: string;
}

export interface AlumniInvitation {
  id: string;
  full_name: string;
  email: string;
  department: string;
  passing_year?: number | null;
  intake?: number | null;
  company?: string | null;
  designation?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  notes?: string | null;
  invite_token: string;
  status: 'new' | 'invited' | 'joined' | 'already_registered' | 'bounced';
  invite_count: number;
  first_invited_at?: string | null;
  last_invited_at?: string | null;
  joined_at?: string | null;
  claimed_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAlumniLeadInput {
  full_name: string;
  email: string;
  department: string;
  passing_year?: number | null;
  intake?: number | null;
  company?: string | null;
  designation?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  notes?: string | null;
}

const REINVITE_COOLDOWN_HOURS = 72;
const MAX_INVITE_COUNT = 3;

/**
 * Checks whether an invitation lead is eligible to receive a re-invite
 */
export function checkReinviteEligibility(invitation: AlumniInvitation): {
  eligible: boolean;
  remainingHours: number;
  reason: string;
} {
  if (invitation.status === 'joined') {
    return { eligible: false, remainingHours: 0, reason: 'Already joined the platform' };
  }
  if (invitation.status === 'already_registered') {
    return { eligible: false, remainingHours: 0, reason: 'Account already exists' };
  }
  if (invitation.status === 'new') {
    return { eligible: true, remainingHours: 0, reason: 'New lead ready for first invite' };
  }
  if (invitation.invite_count >= MAX_INVITE_COUNT) {
    return { eligible: false, remainingHours: 0, reason: `Reached maximum attempts (${MAX_INVITE_COUNT})` };
  }

  if (!invitation.last_invited_at) {
    return { eligible: true, remainingHours: 0, reason: 'Ready to send' };
  }

  const lastSentTime = new Date(invitation.last_invited_at).getTime();
  const now = Date.now();
  const elapsedHours = (now - lastSentTime) / (1000 * 60 * 60);

  if (elapsedHours < REINVITE_COOLDOWN_HOURS) {
    const remaining = Math.ceil(REINVITE_COOLDOWN_HOURS - elapsedHours);
    return {
      eligible: false,
      remainingHours: remaining,
      reason: `72h cooldown active (${remaining}h remaining)`,
    };
  }

  return { eligible: true, remainingHours: 0, reason: 'Eligible for follow-up reminder' };
}

/**
 * Fetch all alumni invitations
 */
export async function getAlumniInvitations(): Promise<{
  data: AlumniInvitation[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('alumni_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as AlumniInvitation[]) || [], error: null };
  } catch (err: any) {
    console.error('Error fetching alumni invitations:', err);
    return { data: [], error: err.message || 'Failed to fetch invitations' };
  }
}

/**
 * Add a single new alumni lead
 */
export async function createAlumniLead(
  input: CreateAlumniLeadInput
): Promise<{ data: AlumniInvitation | null; error: string | null }> {
  try {
    const cleanEmail = input.email.trim().toLowerCase();

    // Check if user is already registered on Edu51Portal
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, is_alumni')
      .ilike('email', cleanEmail)
      .maybeSingle();

    const initialStatus = existingUser ? 'already_registered' : 'new';

    const { data, error } = await supabase
      .from('alumni_invitations')
      .insert({
        full_name: input.full_name.trim(),
        email: cleanEmail,
        department: input.department.trim() || 'CSE',
        passing_year: input.passing_year ? Number(input.passing_year) : null,
        intake: input.intake ? Number(input.intake) : null,
        company: input.company?.trim() || null,
        designation: input.designation?.trim() || null,
        linkedin_url: input.linkedin_url?.trim() || null,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        status: initialStatus,
        claimed_user_id: existingUser ? existingUser.id : null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as AlumniInvitation, error: null };
  } catch (err: any) {
    console.error('Error creating alumni lead:', err);
    return { data: null, error: err.message || 'Failed to create lead' };
  }
}

/**
 * Bulk import multiple alumni leads (e.g. from CSV)
 */
export async function bulkImportAlumniLeads(
  records: CreateAlumniLeadInput[]
): Promise<{ count: number; error: string | null }> {
  try {
    if (!records.length) return { count: 0, error: 'No records provided' };

    const cleanRows = records.map((r) => ({
      full_name: r.full_name.trim(),
      email: r.email.trim().toLowerCase(),
      department: r.department.trim() || 'CSE',
      passing_year: r.passing_year ? Number(r.passing_year) : null,
      intake: r.intake ? Number(r.intake) : null,
      company: r.company?.trim() || null,
      designation: r.designation?.trim() || null,
      linkedin_url: r.linkedin_url?.trim() || null,
      phone: r.phone?.trim() || null,
      notes: r.notes?.trim() || null,
      status: 'new',
    }));

    const { data, error } = await supabase
      .from('alumni_invitations')
      .insert(cleanRows)
      .select('id');

    if (error) throw error;
    return { count: data?.length || 0, error: null };
  } catch (err: any) {
    console.error('Bulk import error:', err);
    return { count: 0, error: err.message || 'Failed to bulk import leads' };
  }
}

/**
 * Delete an alumni lead
 */
export async function deleteAlumniLead(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('alumni_invitations').delete().eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Delete lead error:', err);
    return { success: false, error: err.message || 'Failed to delete lead' };
  }
}

/**
 * Searches discovered alumni across all departments
 * Combines serverless endpoint with fallback to pre-indexed directory
 */
export async function searchDiscoveredAlumni(
  department: string = 'all',
  keyword: string = ''
): Promise<DiscoveredAlumnus[]> {
  try {
    const params = new URLSearchParams();
    if (department && department !== 'all') params.set('dept', department);
    if (keyword.trim()) params.set('q', keyword.trim());

    const res = await fetch(`/api/alumni-search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('API alumni search fetch failed, using local pre-indexed directory:', err);
  }

  // Fallback to local pre-indexed multi-department directory
  let results = bubtAlumniDirectory as DiscoveredAlumnus[];
  if (department && department !== 'all') {
    results = results.filter(
      (a) => a.department.toLowerCase() === department.toLowerCase()
    );
  }
  if (keyword.trim()) {
    const q = keyword.toLowerCase();
    results = results.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        (a.company && a.company.toLowerCase().includes(q)) ||
        (a.designation && a.designation.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }
  return results;
}

/**
 * Email template configuration for alumni outreach
 */
export interface EmailTemplateConfig {
  inviteSubject: string;
  inviteBody: string;
  reminderSubject: string;
  reminderBody: string;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateConfig = {
  inviteSubject: 'Exclusive Invitation: Claim your official BUBT Alumni Profile on Edu51Portal',
  inviteBody: `We are delighted to invite you to join the official Edu51Portal Alumni Community! As an esteemed graduate of BUBT, we would be honored to have you connected with fellow alumni to strengthen our community, build lasting bonds, and guide the next generation of students.`,
  reminderSubject: 'Friendly Reminder: Your official BUBT Alumni Profile is ready on Edu51Portal',
  reminderBody: `We know how demanding your schedule is! Your official BUBT alumni profile has already been pre-verified on Edu51Portal. Claiming your account takes less than 30 seconds so you can connect with graduates across top firms and inspire aspiring juniors.`,
};

const TEMPLATE_STORAGE_KEY = 'bubt_alumni_email_templates';

/**
 * Retrieves the active email template configuration
 */
export function getEmailTemplates(): EmailTemplateConfig {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If stored template still has legacy subject containing trailing {{name}}, upgrade to clean standard subject
        if (parsed.inviteSubject && parsed.inviteSubject.includes('Profile, {{name}}')) {
          parsed.inviteSubject = DEFAULT_EMAIL_TEMPLATES.inviteSubject;
        }
        if (parsed.reminderSubject && parsed.reminderSubject.includes('waiting, {{name}}')) {
          parsed.reminderSubject = DEFAULT_EMAIL_TEMPLATES.reminderSubject;
        }
        return {
          ...DEFAULT_EMAIL_TEMPLATES,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load email templates from localStorage:', e);
  }
  return { ...DEFAULT_EMAIL_TEMPLATES };
}

/**
 * Saves customized email template configuration
 */
export function saveEmailTemplates(templates: EmailTemplateConfig): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    }
  } catch (e) {
    console.warn('Failed to save email templates to localStorage:', e);
  }
}

/**
 * Resets email templates back to original university defaults
 */
export function resetEmailTemplates(): EmailTemplateConfig {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    }
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_EMAIL_TEMPLATES };
}

/**
 * Replaces dynamic variables in subject or body text
 */
export function interpolateTemplate(
  template: string,
  invitation: Partial<AlumniInvitation>,
  inviteUrl: string = ''
): string {
  const fullName = invitation.full_name || 'Alumnus';
  const firstName = fullName.split(' ')[0] || fullName;
  return template
    .replace(/\{\{name\}\}/gi, fullName)
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{department\}\}/gi, invitation.department || 'BUBT')
    .replace(/\{\{company\}\}/gi, invitation.company || 'your firm')
    .replace(/\{\{designation\}\}/gi, invitation.designation || 'Alumnus')
    .replace(/\{\{passing_year\}\}/gi, invitation.passing_year ? String(invitation.passing_year) : '')
    .replace(/\{\{year\}\}/gi, invitation.passing_year ? String(invitation.passing_year) : '')
    .replace(/\{\{intake\}\}/gi, invitation.intake ? `Intake ${invitation.intake}` : '')
    .replace(/\{\{link\}\}/gi, inviteUrl);
}

/**
 * Generate invitation email HTML with website branding, logo, platform intro, visit link, and Why We Are Inviting You
 */
export function buildInvitationEmailHtml(
  invitation: AlumniInvitation | Partial<AlumniInvitation>,
  inviteUrl: string,
  isReminder: boolean,
  customSubject?: string,
  customBodyText?: string
): string {
  const isSecondReminder = (invitation.invite_count || 0) >= 1 || isReminder;
  const emailTitle = customSubject || (isSecondReminder
    ? 'Friendly Reminder: Your BUBT Alumni Profile on Edu51Portal'
    : 'Exclusive Invitation: Claim your official BUBT Alumni Profile on Edu51Portal');

  const companyPart = invitation.company ? `at ${invitation.company}` : '';
  const roleText = invitation.designation || 'Alumnus';
  const gradYearText = invitation.passing_year ? `Class of ${invitation.passing_year}` : 'BUBT Alumni';
  const intakePart = invitation.intake ? ` · Intake ${invitation.intake}` : '';

  let bodyContentHtml = '';
  if (customBodyText && customBodyText.trim()) {
    const paragraphs = customBodyText.trim().split(/\n\s*\n/);
    bodyContentHtml = paragraphs
      .map(
        (p) =>
          `<p style="font-size:14px;color:#cbd5e1;margin-bottom:16px;line-height:1.65;">${p
            .replace(/\n/g, '<br/>')
            .replace(/<strong>(.*?)<\/strong>/gi, '<strong>$1</strong>')}</p>`
      )
      .join('');
  } else {
    bodyContentHtml = `
      <p style="font-size:14px;color:#cbd5e1;margin-bottom:16px;line-height:1.65;">
        ${
          isReminder
            ? `We know how demanding your schedule is. As an esteemed graduate of BUBT, the university administration has already set up and verified your official profile on <strong>Edu<span style="color:#ef4444;">51</span>Portal</strong>.`
            : `On behalf of the faculty and students at Bangladesh University of Business and Technology (BUBT), we are honored to invite you to join the official <strong>Edu<span style="color:#ef4444;">51</span>Portal Alumni Community</strong>.`
        }
      </p>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${emailTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <div style="width:100%;background-color:#0b0e14;padding:32px 12px;box-sizing:border-box;">
    <div style="max-width:600px;margin:0 auto;background:#161a23;border:1px solid #283040;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.4);">
      
      <!-- Website Branding & Logo Header (51 in Red) -->
      <div style="background:#090d16;border-bottom:1px solid #1e2638;padding:18px 24px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">
              <img src="https://bubt.edu51portal.live/Edu51Portal.png" alt="Edu51Portal Logo" width="42" height="42" style="display:block;border-radius:10px;object-fit:contain;border:1px solid #ef4444;background:#0f172a;" />
            </td>
            <td style="vertical-align:middle;text-align:left;">
              <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
                Edu<span style="color:#ef4444;font-weight:900;">51</span>Portal
              </div>
              <div style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                Official BUBT Academic & Alumni Platform
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Hero Banner (Motivational tagline, no recipient name in heading) -->
      <div style="background:linear-gradient(135deg,#0b1120 0%,#1e293b 50%,#0b1120 100%);padding:30px 24px;text-align:center;color:#ffffff;border-bottom:3px solid #ef4444;">
        <p style="margin:0 0 6px 0;font-size:11px;color:#f87171;text-transform:uppercase;letter-spacing:1.8px;font-weight:800;">
          EDU<span style="color:#ef4444;">51</span>PORTAL · ALUMNI COMMUNITY
        </p>
        <h1 style="margin:0 0 8px 0;font-size:23px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
          ${isSecondReminder ? 'Your Official Alumni Profile is Ready' : 'Exclusive Alumni Invitation'}
        </h1>
        <p style="margin:0;font-size:13px;color:#cbd5e1;font-weight:500;letter-spacing:0.2px;">
          Make new bonds · Strengthen our community · Empower tomorrow
        </p>
      </div>

      <div style="padding:28px 24px;">
        <!-- Personalized Greeting -->
        <div style="font-size:18px;font-weight:700;color:#ffffff;margin-bottom:14px;">Dear ${invitation.full_name || 'Alumnus'},</div>

        <!-- 1. What is Edu51Portal Platform & Visit Link -->
        <div style="background:#131a29;border:1px solid #1e293b;border-left:4px solid #ef4444;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:800;color:#f87171;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">
            🎓 What is Edu51Portal?
          </div>
          <p style="font-size:13.5px;color:#cbd5e1;margin:0 0 10px 0;line-height:1.65;">
            <strong>Edu<span style="color:#ef4444;">51</span>Portal</strong> is the central digital academic and alumni ecosystem for <strong>Bangladesh University of Business and Technology (BUBT)</strong>. It bridges current students, respected faculty members, and graduates across all 9 university departments (CSE, EEE, Civil, Textile, BBA, Economics, English, Law, and Mathematics) for academic collaboration, university resources, and professional networking.
          </p>
          <div style="font-size:12.5px;color:#94a3b8;padding-top:4px;">
            🌐 <strong>Explore our platform:</strong> <a href="https://bubt.edu51portal.live" target="_blank" style="color:#ef4444;font-weight:700;text-decoration:underline;">https://bubt.edu51portal.live</a>
          </div>
        </div>

        <!-- 2. Why We Are Inviting Our Alumni (Universal rationale for all alumni) -->
        <div style="background:#182032;border:1px solid #28354d;border-left:4px solid #f59e0b;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">
            ★ Why We Are Inviting Our Alumni
          </div>
          <p style="font-size:13.5px;color:#e2e8f0;margin:0 0 10px 0;line-height:1.65;">
            Alumni are the cornerstone of BUBT's legacy. By uniting our graduates on <strong>Edu<span style="color:#ef4444;">51</span>Portal</strong>, we build a thriving community that connects past, present, and future:
          </p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#cbd5e1;line-height:1.7;">
            <li><strong>Strengthen The Alumni Network:</strong> Connect with fellow BUBT graduates across leading IT firms, multinationals, academia, and global enterprises.</li>
            <li><strong>Inspire & Guide Juniors:</strong> Help ambitious students navigate career choices, internships, and industry transitions through mentorship and advice.</li>
            <li><strong>Build Lasting Bonds:</strong> Reconnect with old classmates, collaborate on professional initiatives, and celebrate community achievements.</li>
            <li><strong>Pre-Verified & Ready:</strong> University administration has already pre-verified your alumni credentials. No document submission or waiting period required!</li>
          </ul>
        </div>

        <!-- 3. Message Body Content -->
        <div style="margin-bottom:20px;">
          ${bodyContentHtml}
        </div>

        <!-- 4. Pre-Filled Alumni File Card -->
        <div style="background:#1e2638;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
          <h3 style="margin:0 0 10px 0;font-size:12px;color:#f87171;text-transform:uppercase;letter-spacing:1px;">Your Pre-Filled Alumni File</h3>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#64748b;">Name:</td><td style="padding:4px 0;color:#f1f5f9;font-weight:600;text-align:right;">${invitation.full_name || 'Alumnus'}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Department:</td><td style="padding:4px 0;color:#f1f5f9;font-weight:600;text-align:right;">${invitation.department || 'BUBT'}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Graduation & Intake:</td><td style="padding:4px 0;color:#f1f5f9;font-weight:600;text-align:right;">${gradYearText}${intakePart}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Current Role:</td><td style="padding:4px 0;color:#f1f5f9;font-weight:600;text-align:right;">${roleText} ${companyPart}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Status:</td><td style="padding:4px 0;color:#34d399;font-weight:700;text-align:right;">✓ Pre-Verified by Administration</td></tr>
          </table>
        </div>

        <!-- 5. Key Alumni Perks -->
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:14px 16px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Why Join The Community?</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#cbd5e1;line-height:1.7;">
            <li><strong>Connect with Alumni:</strong> Network with fellow BUBT graduates across industry-leading firms.</li>
            <li><strong>Support Juniors:</strong> (Optional) Guide current students with career tips and resume feedback.</li>
            <li><strong>Zero Waitlist:</strong> Pre-approved by administration—no ID card upload or approval waiting required.</li>
          </ul>
        </div>

        <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;line-height:1.6;">
          Claiming your account takes less than <strong>30 seconds</strong>. Simply review your pre-filled details, set your password, and start connecting.
        </p>

        <!-- CTA Button (Red platform brand) -->
        <div style="text-align:center;margin:28px 0 16px 0;">
          <a href="${inviteUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);color:#ffffff!important;text-decoration:none;font-weight:700;font-size:15px;padding:14px 34px;border-radius:10px;box-shadow:0 8px 22px rgba(239,68,68,0.4);">
            Claim Your Verified Profile →
          </a>
          <div style="font-size:11px;color:#64748b;margin-top:8px;">
            Direct instant access · Pre-verified status active
          </div>
        </div>

        <!-- Fallback plain text link -->
        <div style="margin-top:24px;padding-top:14px;border-top:1px solid #283040;font-size:11px;color:#64748b;line-height:1.5;">
          Button not working? Copy and paste this URL into your browser:<br/>
          <a href="${inviteUrl}" style="color:#ef4444;word-break:break-all;">${inviteUrl}</a>
        </div>
      </div>

      <!-- Footer: Presented by CoreWe5 Intake 51 with Meet Team link -->
      <div style="background:#090d16;padding:26px 20px;text-align:center;border-top:1px solid #1e2638;font-size:12px;color:#64748b;line-height:1.6;">
        <div style="margin-bottom:10px;font-size:13px;color:#e2e8f0;">
          Presented with ❤️ by team <strong style="color:#ffffff;">"CoreWe5"</strong> · <span style="color:#ef4444;font-weight:700;">Intake 51</span>
        </div>
        <div style="margin-bottom:14px;">
          <a href="https://bubt.edu51portal.live/meet-team" target="_blank" style="display:inline-block;color:#ef4444;font-weight:700;text-decoration:none;font-size:12px;padding:6px 18px;border:1px solid rgba(239,68,68,0.4);border-radius:20px;background:rgba(239,68,68,0.1);">
            👥 Meet Our Team →
          </a>
        </div>
        <div style="font-size:11px;color:#475569;margin-top:8px;">
          Sent on behalf of the <strong>BUBT Academic & Alumni Community</strong><br/>
          © 2026 Edu<span style="color:#ef4444;">51</span>Portal · Bangladesh University of Business and Technology · Mirpur-2, Dhaka
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatches an invitation email for a specific lead, with optional custom subject and message body
 */
export async function sendAlumniInvitation(
  invitationId: string,
  appOrigin?: string,
  customEmail?: {
    subject?: string;
    bodyText?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: invite, error: fetchErr } = await supabase
      .from('alumni_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchErr || !invite) {
      throw new Error('Invitation lead not found');
    }

    const invitation = invite as AlumniInvitation;
    const eligibility = checkReinviteEligibility(invitation);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    const origin = appOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://bubt.edu51portal.live');
    const inviteUrl = `${origin}/alumni-invite?token=${invitation.invite_token}`;
    const isReminder = invitation.status === 'invited';

    const templates = getEmailTemplates();
    const defaultSubjectTemplate = isReminder ? templates.reminderSubject : templates.inviteSubject;
    const defaultBodyTemplate = isReminder ? templates.reminderBody : templates.inviteBody;

    const rawSubject = customEmail?.subject?.trim() || defaultSubjectTemplate;
    const rawBody = customEmail?.bodyText?.trim() || defaultBodyTemplate;

    const finalSubject = interpolateTemplate(rawSubject, invitation, inviteUrl);
    const finalBodyText = interpolateTemplate(rawBody, invitation, inviteUrl);

    const htmlBody = buildInvitationEmailHtml(invitation, inviteUrl, isReminder, finalSubject, finalBodyText);

    // Send email via Supabase Edge Function
    const { error: sendErr } = await supabase.functions.invoke('send-email-notification', {
      body: {
        to: invitation.email,
        subject: finalSubject,
        htmlBody,
      },
    });

    if (sendErr) {
      console.warn('Edge function email send warning:', sendErr);
      // Fallback: Continue tracking so admin can still copy the magic link
    }

    const nowIso = new Date().toISOString();
    const newCount = (invitation.invite_count || 0) + 1;

    const { error: updateErr } = await supabase
      .from('alumni_invitations')
      .update({
        status: 'invited',
        invite_count: newCount,
        first_invited_at: invitation.first_invited_at || nowIso,
        last_invited_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', invitation.id);

    if (updateErr) throw updateErr;

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error sending alumni invitation:', err);
    return { success: false, error: err.message || 'Failed to dispatch invitation' };
  }
}

/**
 * Dispatches invites to all leads with status === 'new'
 */
export async function sendAllNewInvitations(
  appOrigin?: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { data: leads, error } = await supabase
    .from('alumni_invitations')
    .select('id')
    .eq('status', 'new');

  if (error || !leads) {
    return { sent: 0, failed: 0, errors: [error?.message || 'Failed to query new leads'] };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const res = await sendAlumniInvitation(lead.id, appOrigin);
    if (res.success) {
      sent++;
    } else {
      failed++;
      if (res.error) errors.push(res.error);
    }
  }

  return { sent, failed, errors };
}

/**
 * Dispatches reminders to all leads eligible under 72h cooldown
 */
export async function sendAllEligibleReminders(
  appOrigin?: string
): Promise<{ sent: number; failed: number }> {
  const { data: leads, error } = await supabase
    .from('alumni_invitations')
    .select('*')
    .eq('status', 'invited');

  if (error || !leads) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const raw of leads) {
    const lead = raw as AlumniInvitation;
    const eligibility = checkReinviteEligibility(lead);
    if (eligibility.eligible) {
      const res = await sendAlumniInvitation(lead.id, appOrigin);
      if (res.success) sent++;
      else failed++;
    }
  }

  return { sent, failed };
}

/**
 * Validates token and loads pre-filled data for the claiming page
 */
export async function getAlumniInviteDetails(token: string): Promise<{
  valid: boolean;
  data: Partial<AlumniInvitation> | null;
  reason?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_alumni_invite_details', { p_token: token });
    if (error) throw error;
    if (!data || !data.valid) {
      return { valid: false, data: null, reason: data?.reason || 'Invalid invitation token' };
    }
    return { valid: true, data: data as Partial<AlumniInvitation> };
  } catch (err: any) {
    console.error('Token validation error:', err);
    return { valid: false, data: null, reason: err.message || 'Validation failed' };
  }
}

/**
 * Claims the invitation and auto-verifies the user account
 */
export async function claimAlumniInvite(
  token: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc('claim_alumni_invite', {
      p_token: token,
      p_user_id: userId,
    });
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Claim invite error:', err);
    return { success: false, error: err.message || 'Failed to claim invitation' };
  }
}
