import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  Lock,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Loader2,
  Check,
  Mail,
  User,
  Globe,
  Linkedin,
  Facebook,
  Phone,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  getAlumniInviteDetails,
  claimAlumniInvite,
  AlumniInvitation,
} from '../../lib/api/alumniOutreachApi';

interface AlumniClaimInvitePageProps {
  isDarkMode: boolean;
  onNavigate: (view: string) => void;
  onSuccessLogin?: (user: any) => void;
}

const DEPARTMENTS = ['CSE', 'EEE', 'Civil', 'Textile', 'BBA', 'Economics', 'English', 'Law', 'Mathematics'];

export const AlumniClaimInvitePage: React.FC<AlumniClaimInvitePageProps> = ({
  isDarkMode,
  onNavigate,
  onSuccessLogin,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<Partial<AlumniInvitation> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [passingYear, setPassingYear] = useState<number | ''>(2023);
  const [intake, setIntake] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
  const [city, setCity] = useState('Dhaka, Bangladesh');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [careerTips, setCareerTips] = useState('');
  const [availableForMentorship, setAvailableForMentorship] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);

    if (!tokenParam) {
      setLoading(false);
      setErrorMessage('No invitation token found in link.');
      return;
    }

    const validate = async () => {
      setLoading(true);
      const res = await getAlumniInviteDetails(tokenParam);
      if (res.valid && res.data) {
        setInviteData(res.data);
        setFullName(res.data.full_name || '');
        setEmail(res.data.email || '');
        setDepartment(res.data.department || 'CSE');
        setPassingYear(res.data.passing_year || new Date().getFullYear() - 2);
        setIntake(res.data.intake || '');
        setCompany(res.data.company || '');
        setDesignation(res.data.designation || '');
        setLinkedinUrl(res.data.linkedin_url || '');
        setPhone(res.data.phone || '');
      } else {
        setErrorMessage(res.reason || 'This invitation link is invalid or has already been claimed.');
      }
      setLoading(false);
    };

    validate();
  }, []);

  const completionStats = useMemo(() => {
    const checks = [
      { key: 'fullName', valid: !!fullName.trim(), label: 'Full Legal Name' },
      { key: 'department', valid: !!department, label: 'Department' },
      { key: 'passingYear', valid: !!passingYear, label: 'Passing Year' },
      { key: 'intake', valid: !!intake, label: 'Intake / Batch' },
      { key: 'email', valid: !!email.trim() && email.includes('@'), label: 'Account Email' },
      { key: 'password', valid: password.length >= 6 && password === confirmPassword, label: 'Password' },
      { key: 'designation', valid: !!designation.trim(), label: 'Current Job Title' },
      { key: 'company', valid: !!company.trim(), label: 'Company / Organization' },
      { key: 'city', valid: !!city.trim(), label: 'City Location' },
      { key: 'phone', valid: !!phone.trim(), label: 'Phone / WhatsApp' },
      { key: 'social', valid: !!linkedinUrl.trim() || !!facebookUrl.trim(), label: 'Verified Social Link (LinkedIn/Facebook)' },
      { key: 'bio', valid: bio.trim().length >= 15, label: 'Bio / Professional Journey' },
      { key: 'careerTips', valid: careerTips.trim().length >= 10, label: 'Career Advice for Juniors' },
    ];
    const completedCount = checks.filter((c) => c.valid).length;
    const totalCount = checks.length;
    const percent = Math.round((completedCount / totalCount) * 100);
    return { completedCount, totalCount, percent, checks };
  }, [
    fullName,
    department,
    passingYear,
    intake,
    email,
    password,
    confirmPassword,
    designation,
    company,
    city,
    phone,
    linkedinUrl,
    facebookUrl,
    bio,
    careerTips,
  ]);

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token || !email.trim()) {
      setFormError('Missing required invitation email data.');
      return;
    }

    if (!fullName.trim()) {
      setFormError('Please enter your full academic name.');
      return;
    }

    if (!passingYear) {
      setFormError('Please enter your graduation / passing year.');
      return;
    }

    if (!intake) {
      setFormError('Please enter your BUBT intake number (e.g. 42).');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!designation.trim()) {
      setFormError('Please enter your current job title / designation.');
      return;
    }

    if (!company.trim()) {
      setFormError('Please enter your company or organization name (or Self-Employed).');
      return;
    }

    if (!city.trim()) {
      setFormError('Please enter your city / location.');
      return;
    }

    if (!phone.trim()) {
      setFormError('Please enter your phone or WhatsApp number.');
      return;
    }

    if (!linkedinUrl.trim() && !facebookUrl.trim()) {
      setFormError('Please provide at least one valid social link (LinkedIn or Facebook profile URL).');
      return;
    }

    if (!bio.trim() || bio.trim().length < 15) {
      setFormError('Please share a brief summary of your journey (at least 15 characters).');
      return;
    }

    if (!careerTips.trim() || careerTips.trim().length < 10) {
      setFormError('Please share a piece of career advice for BUBT juniors (at least 10 characters).');
      return;
    }

    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();

      // 1. Sign up user via Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: cleanName,
            role: 'alumni',
            department: department,
          },
        },
      });

      if (authErr) {
        if (authErr.message.includes('already registered')) {
          setFormError('An account with this email already exists. Please sign in with your password to access your profile.');
          setSubmitting(false);
          return;
        }
        throw authErr;
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error('Account creation failed. Please try again.');
      }

      // 2. Claim invite & auto-verify profile via RPC (bypasses verification)
      const claimRes = await claimAlumniInvite(token, userId);
      if (!claimRes.success) {
        console.warn('claimAlumniInvite warning:', claimRes.error);
      }

      // 3. Update comprehensive alumni profile details with verified bypass
      await supabase
        .from('alumni_profiles')
        .update({
          full_name: cleanName,
          dept: department,
          graduation_year: Number(passingYear) || 2023,
          job_title: designation.trim() ? (company.trim() ? `${designation.trim()} at ${company.trim()}` : designation.trim()) : null,
          company_name: company.trim() || null,
          city: city.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          social_links: {
            ...(facebookUrl.trim() ? { facebook: facebookUrl.trim() } : {}),
            ...(linkedinUrl.trim() ? { linkedin: linkedinUrl.trim() } : {}),
          },
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          career_tips: careerTips.trim() || null,
          is_available_for_mentorship: availableForMentorship,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // 4. Update core user profile
      await supabase
        .from('profiles')
        .update({
          name: cleanName,
          department: department,
          phone: phone.trim() || null,
          is_alumni: true,
          is_verified: true,
          social_links: {
            ...(facebookUrl.trim() ? { facebook: facebookUrl.trim() } : {}),
            ...(linkedinUrl.trim() ? { linkedin: linkedinUrl.trim() } : {}),
          },
        })
        .eq('id', userId);

      setIsSuccess(true);
      if (onSuccessLogin && authData.user) {
        onSuccessLogin(authData.user);
      }

      // Automatically redirect to Alumni Hub after 2.8s
      setTimeout(() => {
        onNavigate('alumni');
      }, 2800);
    } catch (err: any) {
      console.error('Claim account error:', err);
      setFormError(err.message || 'Failed to activate verified profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[80vh] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0f141c] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <h2 className="text-lg font-bold">Verifying Official Invitation...</h2>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Connecting to BUBT Alumni Registry
        </p>
      </div>
    );
  }

  if (errorMessage || !inviteData) {
    return (
      <div className={`min-h-[80vh] flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#0f141c]' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-2xl ${
          isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Invitation Expired or Invalid</h2>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {errorMessage || 'This link has already been claimed or has expired. If you already have an account, please sign in.'}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => onNavigate('home')}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-lg"
            >
              Go to Home
            </button>
            <button
              onClick={() => onNavigate('alumni')}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs border transition-all ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Browse Alumni Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#0f141c]' : 'bg-slate-50'}`}>
        <div className={`max-w-lg w-full p-8 rounded-2xl border text-center shadow-2xl ${
          isDarkMode ? 'bg-[#161a23] border-emerald-500/30 text-white' : 'bg-white border-emerald-300 text-slate-900'
        }`}>
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-5 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verification Bypass Activated
          </span>
          <h2 className="text-2xl font-black mb-2">Welcome to BUBT Alumni Directory!</h2>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
            Your official profile has been <strong>instantly verified</strong> and published. Current students and fellow graduates can now find you in the directory.
          </p>
          <button
            onClick={() => onNavigate('alumni')}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            Enter Alumni Hub & Directory <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center ${isDarkMode ? 'bg-[#0b0e14]' : 'bg-slate-50'}`}>
      <div className={`max-w-3xl w-full rounded-2xl border overflow-hidden shadow-2xl ${
        isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Executive University Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 p-6 sm:p-8 text-white relative">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Official BUBT Administration Invitation
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Pre-Approved · Verification Bypassed
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Claim Your Official BUBT Alumni Profile
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-xl leading-relaxed">
            Welcome, <strong>{fullName || 'BUBT Alumnus'}</strong>! Because you were invited directly by the administration team, your profile is <strong>pre-approved</strong>. Complete your registration below to instantly publish your profile to the official directory.
          </p>
        </div>

        {/* Verification Guarantee Notice */}
        <div className={`p-4 border-b flex items-start gap-3 text-xs ${
          isDarkMode ? 'bg-slate-900/60 border-slate-700/80 text-slate-300' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
        }`}>
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Instant Verified Status:</strong> Standard registration requires manual admin document review. By claiming this VIP invitation, your alumni badge is <strong>immediately activated</strong> without any approval delay.
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleClaimAccount} className="space-y-6 text-xs">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Live Profile Completeness Meter */}
            <div className={`p-4 rounded-xl border transition-all ${
              completionStats.percent === 100
                ? isDarkMode ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                : isDarkMode ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Official Profile Completeness
                </span>
                <span className={completionStats.percent === 100 ? 'text-emerald-400 font-extrabold' : 'text-cyan-400'}>
                  {completionStats.percent}% ({completionStats.completedCount}/{completionStats.totalCount} fields completed)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    completionStats.percent === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{ width: `${completionStats.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {completionStats.percent === 100
                  ? '✓ All profile fields are complete! Your verified VIP profile is ready for instant publication.'
                  : 'Please complete all required fields below to publish a comprehensive, verified alumni profile.'}
              </p>
            </div>

            {/* SECTION 1: Academic Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-500 dark:text-cyan-400">
                <GraduationCap className="w-4 h-4" />
                <span>1. Academic Credentials (Pre-Verified)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal/academic name"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none font-semibold ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Department *</label>
                  <select
                    value={department}
                    required
                    onChange={(e) => setDepartment(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none font-semibold ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Passing Year *</label>
                  <input
                    type="number"
                    required
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 2022"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Intake / Batch *</label>
                  <input
                    type="number"
                    required
                    value={intake}
                    onChange={(e) => setIntake(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 42"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Security & Login */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-500 dark:text-cyan-400">
                <Lock className="w-4 h-4" />
                <span>2. Account Credentials</span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Account Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumnus@example.com"
                  className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  You will use this email address to log into Edu51Portal.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">Create Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Career & Social Media */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-500 dark:text-cyan-400">
                <Briefcase className="w-4 h-4" />
                <span>3. Professional Profile & Verified Social Links</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">Current Job Title / Designation *</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Software Engineer / Manager"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Brain Station 23 / Therap BD (or Self-Employed)"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">City / Location *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Phone / WhatsApp Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 17XXXXXXXX"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    LinkedIn Profile URL {(!facebookUrl.trim() ? '*' : '(Optional)')}
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Facebook Profile URL {(!linkedinUrl.trim() ? '*' : '(Optional)')}
                  </label>
                  <input
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourname"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                🔒 Note: At least one verified social profile link (LinkedIn or Facebook) is required to ensure directory authenticity.
              </p>
            </div>

            {/* SECTION 4: Bio & Mentorship */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-500 dark:text-cyan-400">
                <BookOpen className="w-4 h-4" />
                <span>4. Bio & Mentorship</span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Brief Bio / Professional Journey *</label>
                <textarea
                  rows={3}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short summary of your professional journey since graduating from BUBT (minimum 15 characters)..."
                  className={`w-full p-3 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Career Advice for Juniors *</label>
                <textarea
                  rows={3}
                  required
                  value={careerTips}
                  onChange={(e) => setCareerTips(e.target.value)}
                  placeholder="What is one key piece of advice you would give to current BUBT students (minimum 10 characters)?"
                  className={`w-full p-3 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Mentorship Checkbox */}
              <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                isDarkMode ? 'bg-slate-900/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={availableForMentorship}
                  onChange={(e) => setAvailableForMentorship(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                />
                <div>
                  <span className="font-bold block text-sm">Open to Mentoring BUBT Juniors</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                    Allow verified BUBT current students to view your tips and reach out for career guidance or resume advice.
                  </span>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-xl shadow-cyan-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating Pre-Verified Profile...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    Complete Registration & Publish Verified Profile <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-2">
                Pre-approved VIP bypass: Your account is verified instantly without administrative review.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
