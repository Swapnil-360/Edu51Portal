import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GraduationCap, BookOpen, User, Briefcase, Mail, Phone, Calendar, Check } from "lucide-react";
import { getProfileById, listEducations } from "../../lib/api/profileApi";
import { SocialProfile, Education } from "../../types/social";
import ChipLoader from "../ui/ChipLoader";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  isDarkMode: boolean;
  onAcceptRequest?: () => void; // Optional callback to accept mentorship request
}

export default function StudentProfileView({
  isOpen,
  onClose,
  studentId,
  isDarkMode,
  onAcceptRequest,
}: Props) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [educations, setEducations] = useState<Education[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    let active = true;
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const prof = await getProfileById(studentId);
        if (!active) return;
        if (!prof) {
          setError("Student profile not found.");
          return;
        }
        setProfile(prof);

        const edus = await listEducations(studentId);
        if (!active) return;
        setEducations(edus);
      } catch (err: any) {
        console.error("Error fetching student profile details:", err);
        if (active) {
          setError("Failed to load profile details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchStudentData();

    return () => {
      active = false;
    };
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const borderBg = isDarkMode ? "border-[#2f3336]" : "border-slate-200";
  const sectionBg = isDarkMode ? "bg-slate-900/30" : "bg-slate-50";

  // Derive Student ID from BUBT email prefix (students sign up with student_id@...)
  const studentIdNumber = profile?.bubt_email
    ? profile.bubt_email.split("@")[0].toUpperCase()
    : "N/A";

  const renderInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        {/* Backdrop overlay clickable to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />

        {/* Modal Content Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl ${cardBg} ${textColor}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="relative h-32 bg-gradient-to-r from-violet-600/80 to-indigo-600/80 flex-shrink-0">
            {profile?.cover_photo_url && (
              <img
                src={profile.cover_photo_url}
                alt="Banner"
                className="w-full h-full object-cover opacity-90"
              />
            )}
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md bg-black/30 hover:bg-black/50 text-white transition-all`}
              aria-label="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Avatar Circle Overlapping */}
            <div className={`absolute left-6 -bottom-10 w-24 h-24 rounded-full overflow-hidden border-4 ${isDarkMode ? "border-[#17181c]" : "border-white"} shadow-lg bg-slate-800 flex-shrink-0`}>
              {profile?.avatar_url || profile?.profile_pic ? (
                <img
                  src={profile.avatar_url || profile.profile_pic!}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-white bg-gradient-to-br from-purple-600 to-indigo-600">
                  {profile ? renderInitials(profile.name) : "?"}
                </div>
              )}
            </div>
          </div>

          {/* Main Card Body */}
          <div className="px-6 pt-12 pb-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                <ChipLoader size="md" />
                <span>Loading student profile...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-red-400 font-semibold">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            ) : profile ? (
              <>
                {/* Header Information */}
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
                  {profile.headline && (
                    <p className={`text-sm font-medium mt-0.5 ${subColor}`}>
                      {profile.headline}
                    </p>
                  )}
                  
                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="px-2.5 py-1 rounded-md font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      ID: {studentIdNumber}
                    </span>
                    {profile.major && (
                      <span className="px-2.5 py-1 rounded-md font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                        {profile.major}
                      </span>
                    )}
                    {profile.department && (
                      <span className="px-2.5 py-1 rounded-md font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                        Dept: {profile.department}
                      </span>
                    )}
                    {profile.section && (
                      <span className="px-2.5 py-1 rounded-md font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {profile.section}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid Content Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column (Main Profile Content) */}
                  <div className="md:col-span-2 space-y-6">
                    {/* About Section */}
                    {profile.about && (
                      <section className={`p-4 rounded-xl border ${borderBg} ${sectionBg} space-y-2`}>
                        <h3 className="text-sm font-bold tracking-wider uppercase opacity-75">About</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-300">
                          {profile.about}
                        </p>
                      </section>
                    )}

                    {/* Education Section */}
                    <section className={`p-4 rounded-xl border ${borderBg} ${sectionBg} space-y-3`}>
                      <h3 className="text-sm font-bold tracking-wider uppercase opacity-75 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                        Education
                      </h3>
                      {educations.length === 0 ? (
                        <p className={`text-xs ${subColor} italic`}>No education history listed.</p>
                      ) : (
                        <div className="space-y-4">
                          {educations.map((edu) => (
                            <div key={edu.id} className="border-l-2 border-purple-500/30 pl-3 py-1 space-y-1">
                              <h4 className="text-sm font-bold">{edu.institution}</h4>
                              <p className={`text-xs ${subColor}`}>
                                {edu.degree} {edu.department ? `· ${edu.department}` : ""}
                              </p>
                              <div className="flex gap-4 text-[10px] text-slate-400">
                                {edu.session && <span>Session: {edu.session}</span>}
                                {edu.graduation_year && <span>Graduation Year: {edu.graduation_year}</span>}
                                {edu.cgpa && <span className="font-semibold text-purple-400">CGPA: {edu.cgpa}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Right Column (Skills, Interests, Contact) */}
                  <div className="space-y-6">
                    {/* Contact details */}
                    <section className={`p-4 rounded-xl border ${borderBg} ${sectionBg} space-y-3`}>
                      <h3 className="text-sm font-bold tracking-wider uppercase opacity-75">Contact</h3>
                      <div className="space-y-2 text-xs">
                        {profile.bubt_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span className="truncate" title={profile.bubt_email}>{profile.bubt_email}</span>
                          </div>
                        )}
                        {profile.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                        {!profile.bubt_email && !profile.phone && (
                          <p className={`italic ${subColor}`}>No contact details available.</p>
                        )}
                      </div>
                    </section>

                    {/* Skills */}
                    <section className={`p-4 rounded-xl border ${borderBg} ${sectionBg} space-y-3`}>
                      <h3 className="text-sm font-bold tracking-wider uppercase opacity-75">Skills</h3>
                      {profile.skills && profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-xs ${subColor} italic`}>No skills specified.</p>
                      )}
                    </section>

                    {/* Interests */}
                    <section className={`p-4 rounded-xl border ${borderBg} ${sectionBg} space-y-3`}>
                      <h3 className="text-sm font-bold tracking-wider uppercase opacity-75">Interests</h3>
                      {profile.interests && profile.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {profile.interests.map((interest) => (
                            <span
                              key={interest}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-xs ${subColor} italic`}>No interests specified.</p>
                      )}
                    </section>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className={`flex gap-3 pt-4 border-t ${borderBg} mt-6 justify-end`}>
                  <button
                    onClick={onClose}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                      isDarkMode
                        ? "border-[#2f3336] hover:bg-[#2f3336] text-slate-300"
                        : "border-slate-300 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    Close
                  </button>
                  {onAcceptRequest && (
                    <button
                      onClick={() => {
                        onAcceptRequest();
                        onClose();
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/20 flex items-center gap-1 shadow-sm shadow-emerald-500/5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept Request
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
