import { useState, useEffect, useRef } from 'react';
import { X, LogIn, Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onSignIn: (identifier: string, password: string, profile?: any) => void;
  onOpenSignUp: () => void;
}

export function SignInModal({
  isOpen,
  onClose,
  isDarkMode,
  onSignIn,
  onOpenSignUp
}: SignInModalProps) {
  // Temporary feature flag: hide "Login with Google" in Sign In modal until configured
  const SHOW_GOOGLE_SIGNIN = false;
  const [role, setRole] = useState<'student' | 'alumni'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Tracks the current submission attempt; incremented on every new submit and on
  // every isOpen change so that stale async callbacks from a previous attempt are
  // silently ignored instead of updating state or calling onSignIn.
  const submissionIdRef = useRef(0);
  const isSupabaseAuthAvailable = supabaseConfigured && Boolean((supabase as any).auth?.signInWithOAuth);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  useEffect(() => {
    submissionIdRef.current += 1;
    setRole('student');
    setIdentifier('');
    setPassword('');
    setError('');
    setIsSubmitting(false);
    setIsGoogleLoading(false);
    setForgotMode(false);
    setForgotEmail('');
    setForgotSent(false);
    setForgotSending(false);
    setShowPassword(false);
  }, [isOpen]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Please enter your BUBT email.'); return; }
    if (!forgotEmail.endsWith('@cse.bubt.edu.bd')) {
      setError('Enter the @cse.bubt.edu.bd email you registered with.');
      return;
    }
    setError('');
    setForgotSending(true);

    const { data, error: fnErr } = await supabase.functions.invoke('send-password-reset', {
      body: {
        bubtEmail: forgotEmail.trim().toLowerCase(),
        redirectTo: `${window.location.origin}${window.location.pathname}?reset=1`,
      },
    });

    setForgotSending(false);
    if (fnErr || data?.error) {
      setError(data?.error ?? fnErr?.message ?? 'Could not send reset email. Please contact admin via WhatsApp.');
    } else {
      setForgotSent(true);
      if (data?.maskedEmail) setForgotEmail(data.maskedEmail);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (role === 'student' && identifier.includes('@') && !identifier.toLowerCase().endsWith('@cse.bubt.edu.bd')) {
      setError('Student email must end with @cse.bubt.edu.bd.');
      return;
    }

    setIsSubmitting(true);
    // Snapshot the submission ID so we can detect if the modal was closed/reopened
    // while this async call was in flight and silently discard the stale result.
    submissionIdRef.current += 1;
    const thisSubmissionId = submissionIdRef.current;
    const isStale = () => submissionIdRef.current !== thisSubmissionId;

    try {
      const trimmedIdentifier = identifier.trim();
      const normalizedIdentifier = trimmedIdentifier.toLowerCase();
      // Try Supabase auth first if configured and email provided
      if (supabaseConfigured && trimmedIdentifier.includes('@') && (supabase as any).auth?.signInWithPassword) {
        try {
          const { data, error } = await (supabase as any).auth.signInWithPassword({
            email: normalizedIdentifier,
            password,
          });

          if (isStale()) return;

          if (error) {
            console.error('Supabase auth error:', error);
            if (error.message.includes('Invalid login credentials')) {
              setError('Invalid email or password. Please check and try again.');
            } else if (error.message.includes('Email not confirmed')) {
              setError('Please verify your email before signing in.');
            } else {
              setError(error.message || 'Invalid credentials. Please try again.');
            }
            return;
          }

          // Validate role against profile
          const { data: pData, error: pErr } = await supabase
            .from('profiles')
            .select('is_alumni')
            .eq('id', data.user.id)
            .single();

          if (!pErr && pData) {
            const isAlumniUser = pData.is_alumni;
            if (role === 'student' && isAlumniUser) {
              await supabase.auth.signOut();
              setError('This account is registered as an Alumni. Please select the Alumni tab to sign in.');
              setIsSubmitting(false);
              return;
            }
            if (role === 'alumni' && !isAlumniUser) {
              await supabase.auth.signOut();
              setError('This account is registered as a Student. Please select the Student tab to sign in.');
              setIsSubmitting(false);
              return;
            }
          }

          // ── Close modal immediately using user_metadata + localStorage cache ──
          // App.tsx's onAuthStateChange SIGNED_IN handler will load the full DB
          // profile in the background — no need to block the modal on DB queries.
          const meta = data.user.user_metadata || {};
          const cachedPic = localStorage.getItem('userProfilePic') || '';
          const profile: any = {
            id: data.user.id || '',
            name: meta.name || localStorage.getItem('userProfileName') || normalizedIdentifier.split('@')[0] || 'Student',
            section: meta.section || localStorage.getItem('userProfileSection') || '',
            major: meta.major || localStorage.getItem('userProfileMajor') || '',
            bubt_email: normalizedIdentifier,
            notification_email: meta.notificationEmail || localStorage.getItem('userProfileNotificationEmail') || '',
            phone: meta.phone || localStorage.getItem('userProfilePhone') || '',
            profile_pic: cachedPic,
          };

          localStorage.setItem('userProfileName', profile.name);
          localStorage.setItem('userProfileSection', profile.section);
          localStorage.setItem('userProfileMajor', profile.major);
          localStorage.setItem('userProfileBubtEmail', profile.bubt_email);
          localStorage.setItem('userProfileNotificationEmail', profile.notification_email);
          localStorage.setItem('userProfilePhone', profile.phone);
          if (cachedPic) {
            localStorage.setItem('userProfilePic', cachedPic);
            localStorage.setItem('userProfileAvatarUrl', cachedPic);
          }

          setIsSubmitting(false);
          onClose();
          onSignIn(identifier, password, profile);

          // Background: fetch full profile from DB and update localStorage so
          // the next page load / App.tsx retry gets fresh data.
          const META_COLS = 'id,name,section,major,bubt_email,notification_email,phone,created_at,last_login_at';
          supabase
            .from('profiles')
            .select(META_COLS)
            .eq('id', data.user.id)
            .single()
            .then(({ data: p }: { data: any }) => {
              if (p) {
                localStorage.setItem('userProfileName', p.name || profile.name);
                localStorage.setItem('userProfileSection', p.section || '');
                localStorage.setItem('userProfileMajor', p.major || '');
                localStorage.setItem('userProfileBubtEmail', p.bubt_email || normalizedIdentifier);
                localStorage.setItem('userProfileNotificationEmail', p.notification_email || '');
                localStorage.setItem('userProfilePhone', p.phone || '');
              }
            })
            .catch(() => {/* silent — user is already logged in */});

          // Also refresh profile_pic separately (it's large, keep it non-blocking)
          if (data.user.id) {
            supabase
              .from('profiles')
              .select('profile_pic')
              .eq('id', data.user.id)
              .single()
              .then(({ data: picRow }: { data: any }) => {
                if (picRow?.profile_pic) {
                  localStorage.setItem('userProfilePic', picRow.profile_pic);
                  localStorage.setItem('userProfileAvatarUrl', picRow.profile_pic);
                }
              })
              .catch(() => {});
          }
          return;
        } catch (authError: any) {
          if (isStale()) return;
          console.error('Supabase authentication exception:', authError);
          const msg: string = authError?.message || '';
          if (msg.includes('timed out') || msg.includes('paused')) {
            setError('Connection timed out. Your Supabase project may be paused — visit supabase.com/dashboard to resume it, then try again.');
          } else {
            setError('Unable to sign in. Please check your connection and try again.');
          }
          return;
        }
      }

      // Fallback: local-only profile check
      const storedProfile = localStorage.getItem('userProfile');
      if (!storedProfile) {
        setError('No account found. Please sign up first.');
        return;
      }

      const profile = JSON.parse(storedProfile);
      const emailMatch = (profile.bubtEmail || '').toLowerCase() === normalizedIdentifier;
      const phoneMatch = profile.phone === trimmedIdentifier;
      const identifierMatch = emailMatch || phoneMatch;
      const passwordMatch = profile.password === password;

      if (identifierMatch && passwordMatch) {
        if (isStale()) return;
        const isAlumniUser = profile.isAlumni || false;
        if (role === 'student' && isAlumniUser) {
          setError('This account is registered as an Alumni. Please select the Alumni tab to sign in.');
          return;
        }
        if (role === 'alumni' && !isAlumniUser) {
          setError('This account is registered as a Student. Please select the Student tab to sign in.');
          return;
        }
        setIsSubmitting(false);
        console.log('✅ Sign in successful (local fallback)');
        onClose();
        onSignIn(identifier, password, profile);
      } else {
        setError('Invalid credentials. Please check your email/phone and password.');
      }
    } catch (err) {
      if (isStale()) return;
      console.error('Sign in error:', err);
      setError('Failed to sign in. Please try again.');
    } finally {
      if (!isStale()) setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    if (!isSupabaseAuthAvailable) {
      setError('Google sign up requires Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });

      if (googleError) {
        setError('Google sign up failed. Please try again.');
      }
    } catch (err) {
      console.error('Google sign up error:', err);
      setError('Could not start Google sign up. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className={`relative w-full max-w-md rounded-2xl shadow-2xl transition-colors duration-300 my-8 ${
            isDarkMode
              ? 'bg-gray-900'
              : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-5 border-b ${
            isDarkMode
              ? 'border-gray-700/50'
              : 'border-gray-200/50'
          }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Sign In</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">

          {/* ── Forgot password panel ── */}
          {forgotMode ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(''); setForgotSent(false); }}
                className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>

              {forgotSent ? (
                <div className="text-center py-4 space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Reset link sent!</p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Reset link sent to <span className="font-medium">{forgotEmail}</span>.
                    Click it to set a new password — you'll be brought back here automatically.
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    Not in your inbox? Check your <strong>Spam / Junk</strong> folder.
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Still nothing? Go to Profile → Edit and make sure your personal email is saved, then try again.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Enter your BUBT email. We'll send a reset link to your registered email or notification email.
                    </p>
                    {error && (
                      <div className={`p-3 rounded-xl border text-sm mb-3 ${isDarkMode ? 'bg-red-900/30 border-red-700/50 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {error}
                      </div>
                    )}
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>BUBT Email</label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your.id@cse.bubt.edu.bd"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isDarkMode ? 'bg-gray-700/50 border-gray-600/50 text-gray-100 placeholder-gray-400 focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotSending}
                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60`}
                  >
                    {forgotSending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Send Reset Link
                  </button>
                </form>
              )}
            </div>
          ) : (

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
          {/* Student vs. Alumni Tabs */}
          <div className="flex justify-center mb-6">
            <div className={`inline-flex rounded-full p-1 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
              <button
                type="button"
                onClick={() => { setRole('student'); setError(''); }}
                className={`px-6 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  role === 'student'
                    ? 'bg-blue-600 text-white shadow-md'
                    : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => { setRole('alumni'); setError(''); }}
                className={`px-6 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  role === 'alumni'
                    ? 'bg-blue-600 text-white shadow-md'
                    : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Alumni
              </button>
            </div>
          </div>

          {error && (
            <div className={`p-4 rounded-xl border text-sm ${
              isDarkMode
                ? 'bg-red-900/30 border-red-700/50 text-red-300'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className={`text-sm font-medium transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email or Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-gray-100 placeholder-gray-400 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                placeholder={role === 'student' ? "your.email@cse.bubt.edu.bd or 01XXXXXXXXX" : "your.email@example.com or 01XXXXXXXXX"}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-medium transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-11 pr-12 py-3 rounded-xl border transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-gray-100 placeholder-gray-400 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                placeholder="Enter your password"
                disabled={isSubmitting}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors focus:outline-none ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-[#2f3336]/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-slate-100'
                }`}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(''); }}
                className={`text-xs hover:underline ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                isDarkMode
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-200'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>loading</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Login</span>
                </>
              )}
            </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide">
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>or</span>
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>

            {SHOW_GOOGLE_SIGNIN && (
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading}
                className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-200'
                } ${isGoogleLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGoogleLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>loading</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Login with Google</span>
                  </>
                )}
              </button>
            )}

            <p className={`text-center text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSignUp();
                }}
                className={`font-semibold hover:underline ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Sign Up
              </button>
            </p>
          </form>
          )} {/* end forgotMode conditional */}
        </div>
        </div>
      </div>
    </div>
  );
}
