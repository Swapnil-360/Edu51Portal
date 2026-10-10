import React, { useState, useEffect } from 'react';
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [availableForMentorship, setAvailableForMentorship] = useState(true);
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
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
        setCompany(res.data.company || '');
        setDesignation(res.data.designation || '');
      } else {
        setErrorMessage(res.reason || 'This invitation link is invalid or has already been claimed.');
      }
      setLoading(false);
    };

    validate();
  }, []);

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token || !inviteData?.email) {
      setFormError('Missing required invitation data');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const cleanEmail = inviteData.email.trim().toLowerCase();
      const cleanName = inviteData.full_name?.trim() || 'BUBT Alumnus';

      // 1. Sign up user via Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: cleanName,
            role: 'alumni',
            department: inviteData.department || 'CSE',
          },
        },
      });

      if (authErr) {
        // If user already registered, prompt them to sign in
        if (authErr.message.includes('already registered')) {
          setFormError('An account with this email already exists. Please sign in with your password.');
          setSubmitting(false);
          return;
        }
        throw authErr;
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error('Account creation failed. Please try again.');
      }

      // 2. Claim invite & auto-verify profile via RPC
      const claimRes = await claimAlumniInvite(token, userId);
      if (!claimRes.success) {
        console.warn('claimAlumniInvite warning:', claimRes.error);
      }

      // 3. Update extra mentorship preference if requested
      if (availableForMentorship) {
        await supabase
          .from('alumni_profiles')
          .update({
            contact_mode: 'website',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }

      setIsSuccess(true);
      if (onSuccessLogin && authData.user) {
        onSuccessLogin(authData.user);
      }

      // Automatically redirect to Alumni Hub after 2.5s
      setTimeout(() => {
        onNavigate('alumni');
      }, 2500);
    } catch (err: any) {
      console.error('Claim account error:', err);
      setFormError(err.message || 'Failed to activate account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[80vh] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0f141c] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <h2 className="text-lg font-bold">Verifying VIP Invitation...</h2>
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
      <div className={`min-h-[80vh] flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#0f141c]' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-2xl ${
          isDarkMode ? 'bg-[#161a23] border-emerald-500/30 text-white' : 'bg-white border-emerald-300 text-slate-900'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 animate-bounce">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black mb-2">Welcome to BUBT Alumni!</h2>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Your profile has been verified and your account is active. Redirecting you to the Alumni Directory...
          </p>
          <button
            onClick={() => onNavigate('alumni')}
            className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
          >
            Enter Alumni Hub Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center ${isDarkMode ? 'bg-[#0b0e14]' : 'bg-slate-50'}`}>
      <div className={`max-w-2xl w-full rounded-2xl border overflow-hidden shadow-2xl ${
        isDarkMode ? 'bg-[#161a23] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* VIP Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 p-6 sm:p-8 text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Official Administration Invitation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome Back to BUBT, {inviteData.full_name}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1.5 max-w-lg">
            Your alumni profile has already been verified by the university. Set your password to claim your verified status in under 30 seconds.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Pre-Filled Profile Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Your Pre-Verified Information
              </span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Pre-Approved by Admin
              </span>
            </div>

            <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs ${
              isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-slate-500 block text-[10px]">Department</span>
                <span className="font-bold text-cyan-400">{inviteData.department || 'CSE'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Graduation Year</span>
                <span className="font-bold">{inviteData.passing_year ? `Class of ${inviteData.passing_year}` : 'Alumni'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Email Address</span>
                <span className="font-semibold truncate block" title={inviteData.email}>{inviteData.email}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">Current Role</span>
                <span className="font-semibold">
                  {designation || inviteData.designation || 'Alumnus'} {company || inviteData.company ? `at ${company || inviteData.company}` : ''}
                </span>
              </div>
              {inviteData.linkedin_url && (
                <div>
                  <span className="text-slate-500 block text-[10px]">LinkedIn</span>
                  <a
                    href={inviteData.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-1"
                  >
                    View Profile <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Setup Form */}
          <form onSubmit={handleClaimAccount} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Set Account Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Quick update current company/designation if desired */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Current Company (Optional)</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google / Brain Station / Grameenphone"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Designation (Optional)</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Lead Engineer / Lecturer"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Mentorship Checkbox */}
            <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
              isDarkMode ? 'bg-slate-900/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={availableForMentorship}
                onChange={(e) => setAvailableForMentorship(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
              />
              <div className="text-xs">
                <span className="font-bold block">Open to Mentoring BUBT Juniors</span>
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                  Allow current students to reach out for career advice, resume reviews, or internship questions.
                </span>
              </div>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-xl shadow-cyan-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating Verified Profile...
                </>
              ) : (
                <>
                  Claim My Verified Alumni Profile <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500">
              By activating, you join the official BUBT Alumni Directory with pre-verified status.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
