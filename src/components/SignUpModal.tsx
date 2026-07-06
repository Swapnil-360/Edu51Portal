import { useState, useEffect, useRef } from "react";
import { X, UserPlus, Image as ImageIcon, Mail, Eye, EyeOff, CheckCircle, Circle } from "lucide-react";
import { supabase, supabaseConfigured } from "../lib/supabase";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  initialProfile?: {
    name: string;
    section: string;
    major: string;
    bubtEmail: string;
    notificationEmail: string;
    phone: string;
    password: string;
    profilePic: string;
  };
  onSave: (profile: {
    name: string;
    section: string;
    major: string;
    bubtEmail: string;
    notificationEmail: string;
    phone: string;
    password: string;
    profilePic: string;
  }) => void;
  onResetPassword?: () => void;
  onChangeEmail?: () => void;
}

export function SignUpModal({
  isOpen,
  onClose,
  isDarkMode,
  initialProfile,
  onSave,
  onResetPassword,
  onChangeEmail,
}: SignUpModalProps) {
  // Only initialize with initialProfile data if editing (privacy: don't auto-populate on signup)
  const [name, setName] = useState(initialProfile ? initialProfile.name : "");
  const [section, setSection] = useState(
    initialProfile ? initialProfile.section : "",
  );
  const [major, setMajor] = useState(
    initialProfile ? initialProfile.major : "",
  );
  const [bubtEmail, setBubtEmail] = useState(
    initialProfile ? initialProfile.bubtEmail : "",
  );
  const [notificationEmail, setNotificationEmail] = useState(
    initialProfile ? initialProfile.notificationEmail : "",
  );
  const [phone, setPhone] = useState(
    initialProfile ? initialProfile.phone : "",
  );
  const [password, setPassword] = useState(
    initialProfile ? initialProfile.password : "",
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePic, setProfilePic] = useState(
    initialProfile ? initialProfile.profilePic : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);

  // Alumni sign up states
  const [role, setRole] = useState<"student" | "alumni">("student");
  const [studentId, setStudentId] = useState("");
  const [gradYear, setGradYear] = useState<number | "">(2024);
  const [dept, setDept] = useState("");
  const [address, setAddress] = useState("");
  const [profession, setProfession] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardFileName, setIdCardFileName] = useState("");

  // Real-time password requirement evaluations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;
  const isFormValid = initialProfile
    ? (name.trim() !== "")
    : (name.trim() !== "" && isPasswordValid && passwordsMatch);

  // Update form fields when initialProfile changes (only in edit mode)
  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || "");
      setSection(initialProfile.section || "");
      setMajor(initialProfile.major || "");
      setBubtEmail(initialProfile.bubtEmail || "");
      setNotificationEmail(initialProfile.notificationEmail || "");
      setPhone(initialProfile.phone || "");
      setPassword(initialProfile.password || "");
      setProfilePic(initialProfile.profilePic || "");
      setRole("student");
    } else {
      // Clear all fields when opening signup (not edit mode)
      setName("");
      setSection("");
      setMajor("");
      setBubtEmail("");
      setNotificationEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setProfilePic("");
      setError("");
      setSuccess(false);
      setRole("student");
      setStudentId("");
      setGradYear(2024);
      setDept("");
      setAddress("");
      setProfession("");
      setMaritalStatus("");
      setIdCardFile(null);
      setIdCardFileName("");
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialProfile, isOpen]);

  // Resend verification email
  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      if (supabaseConfigured) {
        const { error } = await (supabase as any).auth?.resend({
          type: "signup",
          email: bubtEmail,
        });
        if (error) {
          setError(error.message || "Failed to resend verification email");
        } else {
          setError("");
        }
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (role === "student" || initialProfile) {
      if (!section.trim()) {
        setError("Please enter your section");
        return;
      }
      if (!major) {
        setError("Please select your major");
        return;
      }
      if (!bubtEmail.trim()) {
        setError("Please enter your BUBT email");
        return;
      }
      if (!bubtEmail.endsWith("@cse.bubt.edu.bd")) {
        setError("BUBT email must end with @cse.bubt.edu.bd");
        return;
      }
    } else {
      // Alumni validation
      if (!studentId.trim()) {
        setError("Please enter your student ID");
        return;
      }
      if (!gradYear) {
        setError("Please enter your graduation year");
        return;
      }
      if (!bubtEmail.trim()) {
        setError("Please enter your personal email");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bubtEmail)) {
        setError("Please enter a valid personal email address");
        return;
      }
      if (!dept) {
        setError("Please select your department");
        return;
      }
      if (!major) {
        setError("Please select your major");
        return;
      }
      if (!idCardFile) {
        setError("Please upload a verification document (ID card, payslip, or certificate)");
        return;
      }
    }

    if (
      notificationEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)
    ) {
      setError("Please enter a valid notification email");
      return;
    }

    if (!initialProfile) {
      if (!password) {
        setError("Please enter a password");
        return;
      }
      if (!isPasswordValid) {
        setError("Please satisfy all password requirements first.");
        return;
      }
      if (!passwordsMatch) {
        setError("Passwords do not match");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // If Supabase is configured, register or update in Supabase
      if (supabaseConfigured) {
        if (!initialProfile) {
          // Create auth user
          const { data, error } = await (supabase as any).auth?.signUp({
            email: bubtEmail,
            password,
            options: {
              data: {
                name,
                section: role === "student" ? section : "Alumni",
                major,
                phone,
                notificationEmail,
                profilePic,
                is_alumni: role === "alumni"
              },
            },
          });

          // "Error sending confirmation email" means Supabase couldn't deliver to
          // @cse.bubt.edu.bd, but our DB trigger already confirmed the user.
          // Recover by signing in immediately.
          let userId: string | null = data?.user?.id ?? null;
          let hasSession = Boolean(data?.session?.user);
          let alreadyInAuth = false;

          if (error) {
            const isEmailDeliveryError =
              error.message?.toLowerCase().includes("sending confirmation") ||
              error.message?.toLowerCase().includes("error sending");
            const isAlreadyRegistered =
              error.message?.toLowerCase().includes("already registered") ||
              error.message?.toLowerCase().includes("already exists");
            // Network dropped after Supabase created the account — the DB trigger
            // already created the profile, so attempt sign-in recovery silently.
            const isNetworkError =
              error.message?.toLowerCase().includes("failed to fetch") ||
              error.message?.toLowerCase().includes("network") ||
              error.message?.toLowerCase().includes("timeout");

            if (!isEmailDeliveryError && !isAlreadyRegistered && !isNetworkError) {
              setError(error.message || "Unable to create account");
              return;
            }
            if (isAlreadyRegistered) alreadyInAuth = true;

            // Sign in to recover userId — handles both email delivery failure
            // and the case where auth user exists but profile was deleted.
            const { data: siData, error: siError } = await supabase.auth.signInWithPassword({
              email: bubtEmail,
              password,
            });
            if (siError || !siData?.user) {
              setError(
                isAlreadyRegistered
                  ? "This email is already registered. Please sign in instead."
                  : "Account created but could not sign in automatically. Please use the Sign In button."
              );
              return;
            }
            userId = siData.user.id;
            hasSession = true;
          }

          if (!userId) {
            setError("Failed to create user account. Please try again.");
            return;
          }

          // If signUp succeeded but returned no session (e.g. network blip on response),
          // sign in now so we have a session to upsert the profile.
          if (!hasSession && password) {
            const { data: siData } = await supabase.auth.signInWithPassword({
              email: bubtEmail,
              password,
            });
            if (siData?.user) {
              userId = siData.user.id;
              hasSession = true;
            }
          }

          if (hasSession) {
            // If auth user already existed, check whether the profile row also exists.
            // If it does → genuine duplicate signup, block it.
            // If it doesn't → profile was deleted by admin, allow re-creation.
            if (alreadyInAuth) {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", userId!)
                .maybeSingle();
              if (existingProfile) {
                await supabase.auth.signOut();
                setError("This email is already registered. Please sign in instead.");
                return;
              }
            }

            // Upload ID Card if registering as alumni
            let idCardUrl = "";
            if (role === "alumni" && idCardFile) {
              const fileExt = idCardFile.name.split('.').pop();
              const fileName = `${userId}/id_card_${Date.now()}.${fileExt}`;
              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('alumni-ids')
                .upload(fileName, idCardFile, {
                  cacheControl: '3600',
                  upsert: true
                });

              if (uploadErr) {
                console.error("Verification document upload error:", uploadErr);
                setError("Failed to upload verification document. Please try again.");
                setIsSubmitting(false);
                return;
              }

              const { data: urlData } = supabase.storage
                .from('alumni-ids')
                .getPublicUrl(fileName);

              idCardUrl = urlData.publicUrl;
            }

            const { error: profileError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: userId,
                  name,
                  section: role === "student" ? section : "Alumni",
                  major,
                  bubt_email: bubtEmail,
                  notification_email: notificationEmail,
                  phone,
                  profile_pic: profilePic,
                  is_alumni: role === "alumni",
                  is_verified: role !== "alumni",
                  created_at: new Date().toISOString(),
                  last_login_at: new Date().toISOString(),
                },
                { onConflict: "id" },
              );
            if (profileError) {
              if (
                profileError.message.includes("duplicate key value") ||
                profileError.message.includes("profiles_bubt_email_key") ||
                profileError.code === "23505"
              ) {
                setError("This email is already registered. Please sign in instead.");
              } else {
                setError(profileError.message || "Could not save profile");
              }
              console.error("Profile creation error:", profileError);
              return;
            }

            // Insert alumni profile
            if (role === "alumni") {
              const { error: alumniError } = await supabase
                .from("alumni_profiles")
                .upsert(
                  {
                    id: userId,
                    full_name: name,
                    email: bubtEmail,
                    avatar_url: profilePic || null,
                    graduation_year: Number(gradYear),
                    major,
                    phone,
                    dept,
                    address: address || null,
                    job_title: profession || null,
                    marital_status: maritalStatus || null,
                    id_card_url: idCardUrl || null,
                    is_verified: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "id" }
                );

              if (alumniError) {
                console.error("Alumni profile creation error:", alumniError);
                setError(alumniError.message || "Could not save alumni profile");
                setIsSubmitting(false);
                return;
              }
            }
          }
        } else {
          // Update profile details only - use update instead of upsert to avoid duplicate key error
          try {
            // Prefer updating by auth user ID (satisfies RLS auth.uid() = id policy)
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;

            // Only include profile_pic if it actually changed — it's a 400KB+ base64
            // blob and sending it every time causes request timeouts on free-tier Supabase.
            const picChanged = profilePic !== (initialProfile?.profilePic ?? "");
            const updatePayload: Record<string, any> = {
              name,
              section,
              major,
              notification_email: notificationEmail,
              phone,
            };
            if (picChanged) updatePayload.profile_pic = profilePic;

            const { error: profileError } = await (
              userId
                ? supabase.from("profiles").update(updatePayload).eq("id", userId)
                : supabase.from("profiles").update(updatePayload).eq("bubt_email", bubtEmail)
            );

            if (profileError) {
              console.error("Profile update error:", profileError);
              setError("Could not update profile. Please try again.");
              return;
            }
          } catch (updateError: any) {
            console.error("Profile update exception:", updateError);
            const msg: string = updateError?.message ?? "";
            if (msg.includes("timed out") || msg.includes("paused")) {
              setError(
                "Connection timed out. Your Supabase project may be paused — visit supabase.com/dashboard to resume it, then try again.",
              );
            } else {
              setError("An error occurred while updating profile. Please try again.");
            }
            return;
          }
        }
      }

      // Always keep local fallback for offline mode
      localStorage.setItem("userProfileName", name);
      localStorage.setItem("userProfileSection", role === "student" ? section : "Alumni");
      localStorage.setItem("userProfileMajor", major);
      localStorage.setItem("userProfileBubtEmail", bubtEmail);
      localStorage.setItem("userProfileNotificationEmail", notificationEmail);
      localStorage.setItem("userProfilePhone", phone);
      localStorage.setItem("userProfileIsAlumni", role === "alumni" ? "true" : "false");
      if (password) {
        localStorage.setItem("userProfilePassword", password); // In production, this should be hashed!
      }
      if (profilePic) {
        localStorage.setItem("userProfilePic", profilePic);
      }

      setSuccess(true);
      onSave({
        name,
        section: role === "student" ? section : "Alumni",
        major,
        bubtEmail,
        notificationEmail,
        phone,
        password,
        profilePic,
      });

      setTimeout(() => {
        onClose();
        setSuccess(false);
        // Reset form if it's a new registration
        if (!initialProfile) {
          setName("");
          setSection("");
          setMajor("");
          setBubtEmail("");
          setNotificationEmail("");
          setPhone("");
          setPassword("");
          setConfirmPassword("");
          setProfilePic("");
          setRole("student");
          setStudentId("");
          setGradYear(2024);
          setDept("");
          setAddress("");
          setProfession("");
          setMaritalStatus("");
          setIdCardFile(null);
          setIdCardFileName("");
        }
      }, 1500);
    } catch (err) {
      console.error("Supabase sign-up error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            isDarkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          {/* Header */}
          <div
            className={`px-6 py-5 border-b ${
              isDarkMode ? "border-gray-700/50" : "border-gray-200/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {initialProfile?.name ? "Account Settings" : "Sign Up"}
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode
                    ? "hover:bg-gray-700 text-gray-300"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {success ? (
              <div className="text-center py-8">
                <div
                  className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    isDarkMode ? "bg-green-900/30" : "bg-green-100"
                  }`}
                >
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p
                  className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                >
                  {initialProfile?.name ? "Profile Updated" : "Account Created"}
                </p>
                {initialProfile?.name ? (
                  <p
                    className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Your profile has been updated successfully.
                  </p>
                ) : (
                  <div className="space-y-3 mt-2">
                    <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Your account is ready. You can now sign in using{" "}
                      <span className="font-semibold">{bubtEmail}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className={`px-4 py-2 rounded-lg text-sm font-medium shadow ${
                        isDarkMode
                          ? "bg-white text-gray-900 hover:bg-gray-100"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      Sign In Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Student vs. Alumni Tabs */}
                {!initialProfile && (
                  <div className="flex justify-center mb-6">
                    <div className={`relative inline-flex items-center w-52 rounded-full p-1 border ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
                    }`}>
                      {/* Sliding Pill Background */}
                      <div 
                        className="absolute top-1 bottom-1 left-1 rounded-full bg-blue-600 shadow-md transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                        style={{
                          width: 'calc(50% - 4px)',
                          transform: role === 'student' ? 'translateX(0)' : 'translateX(100%)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => { setRole('student'); setError(''); }}
                        className={`relative z-10 flex-1 py-2 text-center text-xs font-semibold transition-colors duration-200 focus:outline-none ${
                          role === 'student'
                            ? 'text-white'
                            : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRole('alumni'); setError(''); }}
                        className={`relative z-10 flex-1 py-2 text-center text-xs font-semibold transition-colors duration-200 focus:outline-none ${
                          role === 'alumni'
                            ? 'text-white'
                            : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                        }`}
                      >
                        Alumni
                      </button>
                    </div>
                  </div>
                )}

                {/* Profile Picture */}
                <div>
                  <label
                    className={`block text-sm font-semibold mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    {/* Avatar Preview */}
                    <div
                      className={`w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 flex items-center justify-center flex-shrink-0 ${
                        isDarkMode
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500/50"
                          : "bg-gradient-to-br from-blue-400 to-purple-500 border-blue-400/50"
                      }`}
                    >
                      {profilePic ? (
                        <img
                          src={profilePic}
                          alt="Profile"
                          className="w-full h-full object-cover block"
                          width="64"
                          height="64"
                          decoding="async"
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      )}
                    </div>

                    {/* Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                        isDarkMode
                          ? "bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300"
                          : "bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                      }`}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                        : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    }`}
                  />
                </div>

                {(role === "student" || initialProfile) ? (
                  <>
                    {/* Section */}
                    <div>
                      <label
                        htmlFor="section"
                        className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Section *
                      </label>
                      <input
                        id="section"
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g., Intake 51, Section 2 (AI)"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                    </div>

                    {/* Major */}
                    <div>
                      <label
                        htmlFor="major"
                        className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Major *
                      </label>
                      <select
                        id="major"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      >
                        <option value="">Select your major</option>
                        <option value="AI">Artificial Intelligence</option>
                        <option value="Software Engineering">Software Engineering</option>
                        <option value="Networking">Computer Networking</option>
                      </select>
                    </div>

                    {/* BUBT Email (Account) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="bubtEmail"
                          className={`block text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                        >
                          BUBT Email (Account) *
                        </label>
                        {/* Security Buttons - Only for Edit Profile */}
                        {initialProfile?.name && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={onResetPassword}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                isDarkMode
                                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                                  : "bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                              }`}
                            >
                              Reset Password
                            </button>
                            <button
                              type="button"
                              onClick={onChangeEmail}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                isDarkMode
                                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                                  : "bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                              }`}
                            >
                              Change Email
                            </button>
                          </div>
                        )}
                      </div>
                      <input
                        id="bubtEmail"
                        type="email"
                        value={bubtEmail}
                        onChange={(e) => setBubtEmail(e.target.value)}
                        placeholder="yourname@cse.bubt.edu.bd"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                      <p
                        className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                      >
                        Used for account login
                      </p>
                    </div>

                    {/* Notification Email */}
                    <div>
                      <label
                        htmlFor="notificationEmail"
                        className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Notification Email <span className={`font-normal text-xs ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>(required for password reset)</span>
                      </label>
                      <input
                        id="notificationEmail"
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="your.name@gmail.com"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                      {notificationEmail.trim() === "" ? (
                        <p
                          className={`text-xs mt-1 ${isDarkMode ? "text-amber-300" : "text-amber-600"}`}
                        >
                          ⚠ Required for password reset and admin notifications. Add your Gmail or personal email.
                        </p>
                      ) : (
                        <p
                          className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                        >
                          Reset password emails and admin notifications will be sent here.
                        </p>
                      )}
                    </div>

                    {/* Phone Number (Optional, can be used for login) */}
                    <div>
                      <label
                        htmlFor="phone"
                        className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX (optional)"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                      <p
                        className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                      >
                        Can also be used for login
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Alumni-specific form fields */}
                    {/* Student ID */}
                    <div>
                      <label htmlFor="studentId" className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Student ID *
                      </label>
                      <input
                        id="studentId"
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. 2020-1-2-001"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                    </div>

                    {/* Graduation Year */}
                    <div>
                      <label htmlFor="gradYear" className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Graduation Year *
                      </label>
                      <input
                        id="gradYear"
                        type="number"
                        value={gradYear}
                        onChange={(e) => setGradYear(e.target.value ? Number(e.target.value) : "")}
                        placeholder="e.g. 2024"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                    </div>

                    {/* Personal Email */}
                    <div>
                      <label htmlFor="alumniEmail" className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Personal Email (Account Login) *
                      </label>
                      <input
                        id="alumniEmail"
                        type="email"
                        value={bubtEmail}
                        onChange={(e) => setBubtEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                    </div>

                    {/* Phone Number (Optional for Alumni) */}
                    <div>
                      <label htmlFor="alumniPhone" className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Phone Number (Optional)
                      </label>
                      <input
                        id="alumniPhone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                        }`}
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label htmlFor="dept" className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Department *
                      </label>
                      <select
                        id="dept"
                        value={dept}
                        onChange={(e) => setDept(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      >
                        <option value="">Select department</option>
                        <option value="CSE">Computer Science & Engineering</option>
                        <option value="EEE">Electrical & Electronic Engineering</option>
                        <option value="BBA">Business Administration</option>
                        <option value="Textile">Textile Engineering</option>
                        <option value="Civil">Civil Engineering</option>
                        <option value="English">English</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Major */}
                    <div>
                      <label htmlFor="alumniMajor" className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Major *
                      </label>
                      <select
                        id="alumniMajor"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                            : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      >
                        <option value="">Select major</option>
                        <option value="CSE">CSE</option>
                        <option value="EEE">EEE</option>
                        <option value="BBA">BBA</option>
                        <option value="Textile">Textile Engineering</option>
                        <option value="Civil">Civil Engineering</option>
                        <option value="English">English</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* ID Card Upload */}
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Verification Document *
                      </label>
                      <p className={`text-xs mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Upload your BUBT ID card, semester payslip, honors certificate, or graduation document (Image or PDF, max 10MB).
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => idCardInputRef.current?.click()}
                          className={`flex-1 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                            isDarkMode
                              ? "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
                              : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
                          }`}
                        >
                          <ImageIcon className="h-4 w-4" />
                          {idCardFileName ? "Change File" : "Choose File"}
                        </button>
                        <input
                          ref={idCardInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                setError("Verification document file size must be less than 10MB");
                                return;
                              }
                              setIdCardFile(file);
                              setIdCardFileName(file.name);
                              setError("");
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                      {idCardFileName && (
                        <p className={`text-xs mt-1.5 font-medium ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                          Selected: {idCardFileName}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Password (only for new registration) */}
                {!initialProfile && (
                  <>
                    <div>
                      <label
                        htmlFor="password"
                        className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className={`w-full pl-4 pr-12 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                              : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors focus:outline-none ${
                            isDarkMode
                              ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className={`w-full pl-4 pr-12 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                              : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors focus:outline-none ${
                            isDarkMode
                              ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Password checklist */}
                    <div className={`p-3.5 rounded-lg border space-y-2 text-xs ${
                      isDarkMode ? 'bg-gray-800/40 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <p className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Password Requirements:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {hasMinLength ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          )}
                          <span className={hasMinLength ? 'text-emerald-500 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                            Minimum of 8 characters
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasLowercase ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          )}
                          <span className={hasLowercase ? 'text-emerald-500 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                            One lowercase letter
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasUppercase ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          )}
                          <span className={hasUppercase ? 'text-emerald-500 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                            One uppercase letter
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasSpecial ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          )}
                          <span className={hasSpecial ? 'text-emerald-500 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                            One special character
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasDigit ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          )}
                          <span className={hasDigit ? 'text-emerald-500 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                            One number
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-100/20 border border-red-400/50">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isSubmitting || !isFormValid
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  } ${
                    isDarkMode
                      ? "bg-white text-gray-900 hover:bg-gray-100"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>loading</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      <span>
                        {initialProfile?.name
                          ? "Update Profile"
                          : "Create Profile"}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
