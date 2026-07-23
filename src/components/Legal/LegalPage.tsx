import { ArrowLeft, FileText, Shield, Cookie, AlertCircle, Scale } from "lucide-react";

type LegalViewType = "privacy" | "terms" | "cookie-policy" | "disclaimer";

interface LegalPageProps {
  currentView: LegalViewType;
  isDarkMode: boolean;
  goToView: (view: any) => void;
}

export default function LegalPage({ currentView, isDarkMode, goToView }: LegalPageProps) {
  const tabs = [
    {
      id: "terms",
      label: "Terms & Conditions",
      icon: <Scale className="w-4 h-4" />,
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "cookie-policy",
      label: "Cookie Policy",
      icon: <Cookie className="w-4 h-4" />,
    },
    {
      id: "disclaimer",
      label: "Disclaimer",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  ] as const;

  const renderContent = () => {
    switch (currentView) {
      case "privacy":
        return (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Privacy Policy
              </h1>
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="space-y-8 leading-relaxed">
              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Introduction
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Welcome to Edu<span className="text-[#ef4444] font-bold">51</span>Portal. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our academic portal designed for students, faculty, and staff of BUBT (Bangladesh University of Business & Technology) across all departments.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Information We Collect
                </h2>
                <div className="space-y-2">
                  <h3 className={`text-md font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    Personal Information
                  </h3>
                  <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    <li>Student information (name, BUBT student ID, section)</li>
                    <li>Email addresses (BUBT email and notification email)</li>
                    <li>Google account information (when using Google Drive integration)</li>
                    <li>Profile information (major, phone number, profile picture)</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  How We Use Your Information
                </h2>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>To provide access to course materials and academic resources</li>
                  <li>To send academic notifications and important announcements</li>
                  <li>To track semester progress and exam schedules</li>
                  <li>To manage user authentication and access control</li>
                  <li>To improve our platform and user experience</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Google Drive Integration
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Our platform integrates with Google Drive to:
                </p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Allow administrators to upload study materials, lecture slides, and exam resources</li>
                  <li>Provide students with access to shared course materials</li>
                  <li>Display PDF previews and video content directly in the platform</li>
                </ul>
                <p className={`mt-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  We only request the minimum necessary permissions for Google Drive access. We do not access your personal Google Drive files outside of the shared course materials.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Third-Party Services
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  We use the following third-party services:
                </p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li><strong>Supabase:</strong> Database and authentication services</li>
                  <li><strong>Google Drive:</strong> File storage and delivery</li>
                  <li><strong>Brevo:</strong> Email notification delivery</li>
                  <li><strong>Google Gemini:</strong> Powers the in-app AI study assistant; messages you send to it are processed by Google's API to generate responses</li>
                  <li><strong>Vercel:</strong> Hosting and deployment</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Data Security
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure. We use industry-standard encryption and secure protocols for data transmission and storage.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Your Rights
                </h2>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Access and update your personal information</li>
                  <li>Opt-out of email notifications</li>
                  <li>Request deletion of your account and data</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Contact Us
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  If you have any questions about this Privacy Policy or your data, please contact us at:
                </p>
                <div className={`mt-2 p-4 rounded-xl ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-slate-50 border border-slate-100"}`}>
                  <p className={`font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    Email:{" "}
                    <a href="mailto:edu51portal.noreply@gmail.com" className="text-blue-500 hover:underline">
                      edu51portal.noreply@gmail.com
                    </a>
                  </p>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    Organization: BUBT · Intake 51, Section 2 (AI)
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Changes to This Privacy Policy
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>
            </div>
          </div>
        );

      case "terms":
        return (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Terms &amp; Conditions
              </h1>
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="space-y-8 leading-relaxed">
              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  1. Acceptance of Terms
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  By accessing and using Edu51Portal, you accept and agree to be bound by these Terms &amp; Conditions. This platform is intended for students, faculty, and staff of Bangladesh University of Business &amp; Technology (BUBT), across all departments. If you do not agree to these terms, please do not use this platform.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  2. Eligibility
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>To use Edu51Portal, you must:</p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Be enrolled as a student at BUBT, in any department, or be affiliated faculty/staff</li>
                  <li>Provide accurate registration information including your student ID, department, and section</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Be at least 17 years of age</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  3. Permitted Use
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>You may use Edu51Portal to:</p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Access course materials, lecture notes, and academic resources</li>
                  <li>View and track exam schedules, semester routines, and academic notices</li>
                  <li>Collaborate with classmates through team features and shared resources</li>
                  <li>Communicate via team chat and network features for academic purposes</li>
                  <li>Upload and share study materials relevant to your coursework</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  4. Prohibited Activities
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>You must not:</p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Share account credentials or allow unauthorized access to your account</li>
                  <li>Upload harmful, offensive, or copyrighted content without permission</li>
                  <li>Use the platform for commercial purposes or spam</li>
                  <li>Attempt to hack, disrupt, or reverse-engineer any part of the platform</li>
                  <li>Impersonate another student, faculty member, or staff</li>
                  <li>Share exam answers or engage in academic dishonesty through the platform</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  5. Content Ownership
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Course materials, notices, and resources uploaded by faculty remain the intellectual property of the respective creators and BUBT. Student-uploaded content remains owned by the student but grants Edu51Portal a non-exclusive license to host and display it to authorized users. The Edu51Portal platform, design, and codebase are the property of the developer.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  6. Account Termination
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  We reserve the right to suspend or terminate your account if you violate these terms, engage in misconduct, or if you are no longer affiliated with BUBT. You may request account deletion at any time by contacting support.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  7. Disclaimer of Warranties
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Edu51Portal is provided "as is" for academic use. While we strive for accuracy, we do not guarantee that all course materials, schedules, or notices are error-free. Always verify critical academic information (exam dates, results) through official BUBT channels.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  8. Changes to Terms
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  We may update these Terms &amp; Conditions from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. Significant changes will be announced via the platform's notice board.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  9. Contact
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  For questions about these Terms &amp; Conditions, contact us at:
                </p>
                <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-slate-50 border border-slate-100"}`}>
                  <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                    Email:{" "}
                    <a href="mailto:edu51portal.noreply@gmail.com" className="text-blue-500 hover:underline">
                      edu51portal.noreply@gmail.com
                    </a>
                  </p>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    Organization: BUBT · Intake 51, Section 2 (AI)
                  </p>
                </div>
              </section>
            </div>
          </div>
        );

      case "cookie-policy":
        return (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Cookie Policy
              </h1>
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="space-y-8 leading-relaxed">
              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  1. What This Policy Covers
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Edu51Portal does not use third-party advertising or tracking cookies. We use your browser's local storage and session storage to run the platform itself — this policy explains what's stored and why.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  2. Essential Storage
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Required for the platform to function — you cannot opt out without losing access to your account:
                </p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Your authentication session (managed by Supabase), so you stay signed in between visits</li>
                  <li>Security tokens used to protect your account and validate requests</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  3. Preference Storage
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Used to remember your settings across visits:
                </p>
                <ul className={`list-disc list-inside space-y-2 ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <li>Dark mode / light mode preference</li>
                  <li>Your department, section, and routine settings for the Custom Routine tool</li>
                  <li>Dismissed announcement banners, so you don't see the same notice repeatedly</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  4. Third-Party Cookies
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  If you sign in with Google or use the Google Drive integration, Google may set its own cookies as part of that sign-in flow, governed by Google's own privacy and cookie policies — Edu51Portal does not control these.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  5. Managing Storage
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  You can clear local storage/cookies for this site at any time through your browser settings. Doing so will sign you out and reset your saved preferences.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  6. Changes to This Policy
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  We may update this Cookie Policy as the platform evolves. Continued use after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  7. Contact
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Questions about this Cookie Policy:
                </p>
                <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-slate-50 border border-slate-100"}`}>
                  <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                    Email:{" "}
                    <a href="mailto:edu51portal.noreply@gmail.com" className="text-blue-500 hover:underline">
                      edu51portal.noreply@gmail.com
                    </a>
                  </p>
                </div>
              </section>
            </div>
          </div>
        );

      case "disclaimer":
        return (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Disclaimer
              </h1>
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="space-y-8 leading-relaxed">
              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  1. Independent Student Project
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Edu51Portal is an independent platform built and maintained by BUBT students. It is not an official system of Bangladesh University of Business &amp; Technology (BUBT) and is not operated, endorsed, or guaranteed by the university administration.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  2. Academic Information
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Exam routines, notices, course materials, and semester information on this platform are provided for convenience only. Always confirm critical academic information — exam dates, results, deadlines — through official BUBT channels before relying on it.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  3. AI Study Assistant
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  The AI Study Assistant is powered by Google Gemini and may occasionally produce inaccurate, incomplete, or outdated answers. It is a study aid, not an authoritative source — verify anything important yourself before relying on it academically.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  4. User-Uploaded Content
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Study materials, resources, and files shared by students, faculty, or alumni are not independently verified by Edu51Portal for accuracy or completeness. Use your own judgment before relying on user-uploaded content.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  5. Third-Party Links
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Edu51Portal may link to or integrate with third-party services (Google Drive, external resources shared by users). We are not responsible for the content, accuracy, or availability of external sites.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  6. No Liability
                </h2>
                <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  Edu51Portal and its developers are not liable for academic outcomes, data loss, missed deadlines, or any decisions made based on information found on this platform.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  7. Contact
                </h2>
                <p className={`mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Questions about this Disclaimer:
                </p>
                <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-slate-50 border border-slate-100"}`}>
                  <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                    Email:{" "}
                    <a href="mailto:edu51portal.noreply@gmail.com" className="text-blue-500 hover:underline">
                      edu51portal.noreply@gmail.com
                    </a>
                  </p>
                </div>
              </section>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 transition-colors duration-300">
      {/* Sleek Breadcrumb-style Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => goToView("home")}
          className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-800">
            <img src="/image.png" alt="BUBT Logo" className="h-6 w-6 object-contain" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Edu51Portal</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-1 sticky top-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-4 mb-3">
            Legal &amp; Policies
          </h2>
          {tabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goToView(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/30"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Navigation Tabs (Mobile/Tablet) */}
        <div className="lg:hidden w-full overflow-x-auto pb-3 mb-2 flex gap-2 border-b border-slate-100 dark:border-slate-800/50 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goToView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Document Content Container */}
        <main className={`flex-1 w-full rounded-2xl border shadow-sm p-6 sm:p-8 transition-colors duration-300 ${
          isDarkMode
            ? "bg-[#16181c] border-slate-800/50 text-slate-300"
            : "bg-white border-slate-200 text-slate-700"
        }`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
