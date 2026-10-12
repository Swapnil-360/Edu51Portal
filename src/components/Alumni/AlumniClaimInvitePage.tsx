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

      // Mock demo simulation mode: instant success & flow test
      if (token === 'demo' || token === 'test' || token.startsWith('mock-')) {
        setIsSuccess(true);
        if (onSuccessLogin) {
          onSuccessLogin({
            id: 'mock-alumnus-' + Date.now(),
            email: cleanEmail,
            user_metadata: {
              name: cleanName,
              role: 'alumni',
              department: department,
            },
          });
        }
        setTimeout(() => {
          onNavigate('alumni');
        }, 2800);
        return;
      }

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
      <div className={`min-h-[85vh] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#000000] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/Edu51Portal.png"
            alt="Edu51Portal Logo"
            className="w-12 h-12 object-contain rounded-xl border border-red-500/40 shadow-lg shadow-red-950/40"
          />
          <span className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
            Edu<span className="text-red-500">51</span>Portal
          </span>
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-3" />
        <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
          Verifying Official VIP Invitation...
        </h2>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Connecting to BUBT Alumni Registry
        </p>
      </div>
    );
  }

  if (errorMessage || !inviteData) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#000000]' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-2xl ${
          isDarkMode ? 'bg-[#0c1017] border-[#1d2638] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img
              src="/Edu51Portal.png"
              alt="Edu51Portal Logo"
              className="w-10 h-10 object-contain rounded-xl border border-red-500/30"
            />
            <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              Edu<span className="text-red-500">51</span>Portal
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
            Invitation Expired or Invalid
          </h2>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
            {errorMessage || 'This link has already been claimed or has expired. If you already have an account, please sign in to access your profile.'}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => onNavigate('home')}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all shadow-lg shadow-red-600/25"
            >
              Go to Home
            </button>
            <button
              onClick={() => onNavigate('alumni')}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs border transition-all ${
                isDarkMode ? 'border-[#1d2638] text-slate-300 hover:bg-[#121824]' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Browse Alumni Directory
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-6">
            Presented by Team <strong className="text-white">CoreWe5</strong> · BUBT Intake 51
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#000000]' : 'bg-slate-50'}`}>
        <div className={`max-w-lg w-full p-8 rounded-2xl border text-center shadow-2xl ${
          isDarkMode ? 'bg-[#0c1017] border-emerald-500/30 text-white shadow-emerald-950/20' : 'bg-white border-emerald-300 text-slate-900 shadow-xl'
        }`}>
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img
              src="/Edu51Portal.png"
              alt="Edu51Portal Logo"
              className="w-10 h-10 object-contain rounded-xl border border-red-500/30"
            />
            <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              Edu<span className="text-red-500">51</span>Portal
            </span>
          </div>
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-5 border border-emerald-500/30 shadow-lg shadow-emerald-900/30">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verification Bypass Activated
          </span>
          <h2 className="text-2xl font-black mb-2 text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
            Welcome to BUBT Alumni Directory!
          </h2>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
            Your official profile has been <strong className="text-emerald-400">instantly verified</strong> and published. Current students and fellow graduates can now discover and connect with you.
          </p>
          <button
            onClick={() => onNavigate('alumni')}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            Enter Alumni Hub & Directory <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-slate-500 mt-6">
            Presented by Team <strong className="text-white">CoreWe5</strong> · BUBT Intake 51
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center ${isDarkMode ? 'bg-[#000000]' : 'bg-slate-50'}`}>
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between py-3 px-2 max-w-3xl w-full mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 group focus:outline-none text-left"
          title="Edu51Portal Home"
        >
          <img
            src="/Edu51Portal.png"
            alt="Edu51Portal Logo"
            className="w-10 h-10 object-contain rounded-xl border border-red-500/40 shadow-md shadow-red-950/40 group-hover:scale-105 transition-transform"
          />
          <div>
            <span
              className="text-xl font-bold tracking-tight text-white block leading-none"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              Edu<span className="text-red-500">51</span>Portal
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Official BUBT Academic & Alumni Platform
            </span>
          </div>
        </button>
        <button
          onClick={() => onNavigate('alumni')}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#1d2638] hover:border-red-500/50 text-slate-300 hover:text-white transition-all bg-[#0c1017]"
        >
          Browse Directory →
        </button>
      </div>

      <div className={`max-w-3xl w-full rounded-2xl border overflow-hidden shadow-2xl ${
        isDarkMode ? 'bg-[#0c1017] border-[#1d2638] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Executive Header Banner */}
        <div className="bg-gradient-to-br from-[#080c14] via-[#121927] to-[#080c14] border-b-2 border-red-500 p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Subtle Ambient Red Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-red-600/15 rounded-full blur-3xl" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                Official BUBT Academic & Alumni Platform
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                VIP Pre-Approved · Direct Verification Bypass
              </div>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              Claim Your Official BUBT Alumni Profile
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Welcome to the <strong className="text-white">Edu<span className="text-red-500 font-bold">51</span>Portal</strong> Alumni Community! You have received an exclusive pre-approved invitation. Complete your verified profile below to build lasting bonds, inspire juniors, and stay connected with the BUBT community.
            </p>
          </div>
        </div>

        {/* Verification Guarantee Notice */}
        <div className={`p-4 border-b flex items-start gap-3 text-xs ${
          isDarkMode ? 'bg-[#080c14]/90 border-[#1d2638] text-slate-300' : 'bg-red-50/60 border-red-100 text-slate-800'
        }`}>
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="leading-relaxed">
            <strong className="text-emerald-400">Instant Verified Alumni Status:</strong> Standard registration requires manual administrative review. By claiming this official invitation, your alumni badge is <strong className="text-white">immediately activated</strong> and published to the directory without queue delays.
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleClaimAccount} className="space-y-6 text-xs">
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Live Profile Completeness Meter */}
            <div className={`p-4 rounded-xl border transition-all ${
              completionStats.percent === 100
                ? isDarkMode ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                : isDarkMode ? 'bg-[#070b12] border-[#1d2638]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  Official Profile Completeness
                </span>
                <span className={completionStats.percent === 100 ? 'text-emerald-400 font-extrabold' : 'text-red-500 font-bold'}>
                  {completionStats.percent}% ({completionStats.completedCount}/{completionStats.totalCount} fields completed)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    completionStats.percent === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-red-600 via-rose-500 to-red-500'
                  }`}
                  style={{ width: `${completionStats.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {completionStats.percent === 100
                  ? '✓ All fields completed! Your verified VIP profile is ready for instant publication.'
                  : 'Please complete all required fields below to publish an official, verified alumni profile.'}
              </p>
            </div>

            {/* SECTION 1: Academic Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-red-500" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                <GraduationCap className="w-4 h-4 text-red-500" />
                <span>1. Academic Credentials (Pre-Verified)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Full Academic Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal/academic name"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none font-semibold transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Department *</label>
                  <select
                    value={department}
                    required
                    onChange={(e) => setDepartment(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none font-semibold transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-[#0c1017] text-white">{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Passing Year *</label>
                  <input
                    type="number"
                    required
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 2022"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Intake / Batch *</label>
                  <input
                    type="number"
                    required
                    value={intake}
                    onChange={(e) => setIntake(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 42"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Security & Login */}
            <div className="space-y-3 pt-4 border-t border-[#1d2638]">
              <div className="flex items-center gap-2 font-bold text-sm text-red-500" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                <Lock className="w-4 h-4 text-red-500" />
                <span>2. Account Security & Login Credentials</span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">Account Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumnus@example.com"
                  className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  You will use this email address to log into Edu51Portal.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Create Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Career & Social Media */}
            <div className="space-y-3 pt-4 border-t border-[#1d2638]">
              <div className="flex items-center gap-2 font-bold text-sm text-red-500" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                <Briefcase className="w-4 h-4 text-red-500" />
                <span>3. Professional Profile & Verified Social Links</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Current Job Title / Designation *</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Software Engineer / Manager"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Brain Station 23 / Therap BD (or Self-Employed)"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">City / Location *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Phone / WhatsApp Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 17XXXXXXXX"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">
                    LinkedIn Profile URL {(!facebookUrl.trim() ? '*' : '(Optional)')}
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">
                    Facebook Profile URL {(!linkedinUrl.trim() ? '*' : '(Optional)')}
                  </label>
                  <input
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourname"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    }`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                🔒 Note: At least one verified social profile link (LinkedIn or Facebook) is required to ensure official directory authenticity.
              </p>
            </div>

            {/* SECTION 4: Bio & Mentorship */}
            <div className="space-y-3 pt-4 border-t border-[#1d2638]">
              <div className="flex items-center gap-2 font-bold text-sm text-red-500" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                <BookOpen className="w-4 h-4 text-red-500" />
                <span>4. Bio, Career Advice & Student Mentorship</span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">Brief Bio / Professional Journey *</label>
                <textarea
                  rows={3}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short summary of your professional journey since graduating from BUBT (minimum 15 characters)..."
                  className={`w-full p-3 rounded-xl border outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">Career Advice for Juniors *</label>
                <textarea
                  rows={3}
                  required
                  value={careerTips}
                  onChange={(e) => setCareerTips(e.target.value)}
                  placeholder="What is one key piece of advice you would give to current BUBT students (minimum 10 characters)?"
                  className={`w-full p-3 rounded-xl border outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#070b12] border-[#1d2638] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                  }`}
                />
              </div>

              {/* Mentorship Checkbox */}
              <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                isDarkMode
                  ? 'bg-[#070b12] border-[#1d2638] hover:border-red-500/40'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={availableForMentorship}
                  onChange={(e) => setAvailableForMentorship(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-red-600 focus:ring-red-500 w-4 h-4 accent-red-600"
                />
                <div>
                  <span className="font-bold block text-sm text-white">Open to Mentoring BUBT Juniors</span>
                  <span className={isDarkMode ? 'text-slate-400 text-xs' : 'text-slate-500 text-xs'}>
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
                className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 tracking-wide active:scale-[0.99]"
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
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

          {/* Footer Attribution */}
          <div className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isDarkMode ? 'border-[#1d2638] text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center gap-2">
              <span>Presented by Team <strong className="text-white font-bold">CoreWe5</strong> · BUBT Intake 51</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('meet-team')}
              className="inline-flex items-center gap-1.5 font-bold text-red-500 hover:text-red-400 transition-colors"
            >
              Meet Our Team <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
