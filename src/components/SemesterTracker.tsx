import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, Target, Users, TrendingUp, CreditCard, Sparkles, UserCheck, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentSemesterStatus } from '../config/semester';
import { MID_TERM_SCHEDULE } from '../config/examSchedule';
import { 
  getCurrentSchedule, 
  getRoutineTitle, 
  getRoutineDescription, 
  getTodaysSchedule, 
  getNextClass, 
  getWeeklyClassSummary,
  getCurrentClassStatus,
  formatTimeRemaining,
  areTodaysClassesFinished,
  getNextDaySchedule
} from '../config/classRoutine';

interface SemesterTrackerProps {
  onClose?: () => void;
  isDarkMode?: boolean;
}

const SemesterTracker: React.FC<SemesterTrackerProps> = ({ onClose, isDarkMode = false }) => {
  function makeDayKey(schedule: { day: string; date?: string }) {
    return schedule.date ? `${schedule.day}-${schedule.date}` : schedule.day;
  }

  const [currentTime, setCurrentTime] = useState(new Date());
  const [semesterStatus, setSemesterStatus] = useState(getCurrentSemesterStatus());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const schedule = getCurrentSchedule();
    const todayName = dayNames[new Date().getDay()];
    const todayEntry = schedule.find(day => day.day === todayName);
    const defaultKey = todayEntry ? makeDayKey(todayEntry) : todayName;
    return new Set([defaultKey]);
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentSchedule = getCurrentSchedule();
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setSemesterStatus(getCurrentSemesterStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Helper functions for collapsible schedule
  const toggleDay = (dayKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey);
    } else {
      newExpanded.add(dayKey);
    }
    setExpandedDays(newExpanded);
  };

  const expandAllDays = () => {
    const allKeys = getCurrentSchedule().map(makeDayKey);
    setExpandedDays(new Set(allKeys));
  };

  const collapseAllDays = () => {
    const schedule = getCurrentSchedule();
    const todayName = dayNames[new Date().getDay()];
    const todayEntry = schedule.find(day => day.day === todayName);
    const todayKey = todayEntry ? makeDayKey(todayEntry) : todayName;
    setExpandedDays(new Set([todayKey]));
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-BD', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const dm = isDarkMode;
  const card = dm ? 'bg-[#17181c] border border-[#2f3336]' : 'bg-white border border-slate-200 shadow-sm';
  const innerCard = dm ? 'bg-[#16181c] border border-[#2f3336]/60' : 'bg-slate-50 border border-slate-200';
  const head = dm ? 'text-[#e7e9ea]' : 'text-slate-900';
  const sub = dm ? 'text-[#71767b]' : 'text-slate-500';
  const label = dm ? 'text-[#8b98a5]' : 'text-slate-700';

  return (
    <div className={`h-full transition-colors duration-300 ${
      dm ? 'bg-[#000000]' : 'bg-slate-50'
    }`}>
      <div className="h-full overflow-y-auto p-2 sm:p-4 pb-8">
        <div className="max-w-7xl mx-auto">

        {/* Live Clock */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`rounded-2xl p-5 mb-6 ${card}`}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${dm ? 'bg-[#061622]' : 'bg-[#1e9df1]/5'}`}>
                <Clock className="h-5 w-5 text-[#1e9df1]" />
              </div>
              <div>
                <div className={`text-2xl font-black tracking-tight ${head}`}>{formatTime(currentTime)} <span className={`text-sm font-semibold ${sub}`}>BST</span></div>
                <div className={`text-xs ${sub}`}>{formatDate(currentTime)}</div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-right ${dm ? 'bg-[#16181c]' : 'bg-slate-100'}`}>
              <div className={`text-base font-bold ${head}`}>Week {semesterStatus.semesterWeek}</div>
              <div className={`text-xs ${sub}`}>{semesterStatus.semesterName}</div>
            </div>
          </div>
        </motion.div>

        {/* Semester Deadlines & Key Events */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className={`rounded-2xl p-5 mb-6 ${card}`}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dm ? 'bg-[#061622]' : 'bg-[#1e9df1]/5'}`}>
              <Calendar className="h-4 w-4 text-[#1e9df1]" />
            </div>
            <h2 className={`text-base font-bold ${head}`}>Semester Deadlines & Key Events</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Payment Deadlines */}
            <div className={`p-4 rounded-xl ${innerCard}`}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg ${dm ? 'bg-[#061622] text-[#1e9df1]' : 'bg-blue-50 text-[#1e9df1]'}`}>
                  <CreditCard className="h-4 w-4" />
                </div>
                <h3 className={`font-semibold text-sm ${head}`}>Payment Installments</h3>
              </div>
              <ul className={`text-xs space-y-2.5 ${label}`}>
                <li className={`flex justify-between items-center pb-2 border-b ${dm ? 'border-[#2f3336]/60' : 'border-slate-200'}`}>
                  <span>1st Installment</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${dm ? 'bg-[#2f3336] text-[#e7e9ea]' : 'bg-slate-200 text-slate-700'}`}>May 6–22</span>
                </li>
                <li className={`flex justify-between items-center pb-2 border-b ${dm ? 'border-[#2f3336]/60' : 'border-slate-200'}`}>
                  <span>2nd Installment</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${dm ? 'bg-[#2f3336] text-[#e7e9ea]' : 'bg-slate-200 text-slate-700'}`}>Jun 10–24</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Final Installment</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${dm ? 'bg-[#061622] text-[#1e9df1]' : 'bg-blue-100 text-[#1677cc]'}`}>Aug 6–19</span>
                </li>
              </ul>
            </div>

            {/* Special Events */}
            <div className={`p-4 rounded-xl ${innerCard}`}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg ${dm ? 'bg-[#061622] text-[#1e9df1]' : 'bg-blue-50 text-[#1e9df1]'}`}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className={`font-semibold text-sm ${head}`}>Special Events</h3>
              </div>
              <ul className={`text-xs space-y-2.5 ${label}`}>
                <li className={`pb-2 border-b ${dm ? 'border-[#2f3336]/60' : 'border-slate-200'}`}>
                  <span className="block mb-1">Club Member Collection</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${dm ? 'bg-[#2f3336] text-[#e7e9ea]' : 'bg-slate-200 text-slate-700'}`}>June 7–10</span>
                </li>
                <li>
                  <span className="block mb-1">Research Showcase</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${dm ? 'bg-[#2f3336] text-[#e7e9ea]' : 'bg-slate-200 text-slate-700'}`}>Aug 16–20</span>
                </li>
              </ul>
            </div>

            {/* Teacher Evaluation */}
            <div className={`p-4 rounded-xl ${innerCard}`}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg ${dm ? 'bg-[#061622] text-[#1e9df1]' : 'bg-blue-50 text-[#1e9df1]'}`}>
                  <UserCheck className="h-4 w-4" />
                </div>
                <h3 className={`font-semibold text-sm ${head}`}>Teacher Evaluation</h3>
              </div>
              <p className={`text-xs leading-relaxed mb-3 ${label}`}>
                Student feedback portal for BUBT faculty will be open.
              </p>
              <div className={`flex justify-between items-center pt-2 border-t ${dm ? 'border-[#2f3336]/60' : 'border-slate-200'}`}>
                <span className={`text-xs ${sub}`}>Period</span>
                <span className={`font-semibold text-xs px-2 py-0.5 rounded-md ${dm ? 'bg-[#2f3336] text-[#e7e9ea]' : 'bg-slate-200 text-slate-700'}`}>Aug 17–22</span>
              </div>
            </div>

            {/* Important Remarks */}
            <div className={`p-4 rounded-xl ${innerCard}`}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg ${dm ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <AlertCircle className="h-4 w-4" />
                </div>
                <h3 className={`font-semibold text-sm ${head}`}>Important Notes</h3>
              </div>
              <div className={`text-xs space-y-2.5 ${label}`}>
                <div className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e9df1] mt-1.5 flex-shrink-0" />
                  <p className="leading-relaxed">Dates marked <span className="font-bold text-[#1e9df1]">*</span> are subject to moon appearance.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e9df1] mt-1.5 flex-shrink-0" />
                  <p className="leading-relaxed">All schedules subject to official BUBT administrative decisions.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Semester Progress */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`lg:col-span-2 rounded-2xl p-5 ${card}`}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dm ? 'bg-[#061622]' : 'bg-[#1e9df1]/5'}`}>
                <TrendingUp className="h-4 w-4 text-[#1e9df1]" />
              </div>
              <h2 className={`text-base font-bold ${head}`}>Semester Progress</h2>
            </div>

            {/* Progress Bar */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-medium ${sub}`}>Overall Progress</span>
                <span className={`text-sm font-black ${head}`}>{semesterStatus.progressPercentage}%</span>
              </div>
              <div className={`w-full rounded-full h-3 overflow-hidden ${dm ? 'bg-[#16181c]' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1e9df1] to-[#1da1f2] transition-all duration-1000 ease-out"
                  style={{ width: `${semesterStatus.progressPercentage}%` }}
                />
              </div>
              <div className={`flex justify-between text-[10px] mt-1 ${sub}`}>
                <span>May 6</span><span>Sep 4</span>
              </div>
            </div>

            {/* Current Phase + Next Milestone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-xl p-4 ${dm ? 'bg-[#061622] border border-[#1e9df1]/20' : 'bg-[#1e9df1]/5 border border-[#1e9df1]/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-[#1e9df1]" />
                  <span className={`text-xs font-semibold ${dm ? 'text-[#1e9df1]' : 'text-[#1677cc]'}`}>Current Phase</span>
                </div>
                <div className={`text-base font-bold ${head}`}>{semesterStatus.currentPhase}</div>
              </div>
              <div className={`rounded-xl p-4 ${dm ? 'bg-indigo-900/20 border border-indigo-800/40' : 'bg-indigo-50 border border-indigo-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-indigo-500" />
                  <span className={`text-xs font-semibold ${dm ? 'text-indigo-400' : 'text-indigo-700'}`}>Next Milestone</span>
                </div>
                <div className={`text-base font-bold ${head}`}>{semesterStatus.nextMilestone}</div>
                <div className={`text-xs mt-0.5 ${dm ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {semesterStatus.daysToMilestone > 0 ? `${semesterStatus.daysToMilestone} days remaining` : 'Active now'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Academic Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={`rounded-2xl p-5 ${card}`}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dm ? 'bg-[#061622]' : 'bg-[#1e9df1]/5'}`}>
                <Calendar className="h-4 w-4 text-[#1e9df1]" />
              </div>
              <h2 className={`text-base font-bold ${head}`}>Timeline</h2>
            </div>

            <div className="space-y-3">
              {/* Semester Start */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${dm ? 'bg-emerald-900/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'}`}>
                <div>
                  <div className={`text-sm font-bold ${dm ? 'text-emerald-400' : 'text-emerald-700'}`}>Semester Started</div>
                  <div className={`text-xs ${dm ? 'text-emerald-500' : 'text-emerald-600'}`}>May 6, 2026</div>
                </div>
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              </div>

              {/* Mid-terms */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                semesterStatus.currentPhase === 'Mid-term Examinations'
                  ? dm ? 'bg-red-900/20 border-red-700/40' : 'bg-red-50 border-red-100'
                  : dm ? 'bg-[#061622] border-[#1e9df1]/20' : 'bg-[#1e9df1]/5 border-[#1e9df1]/20'
              }`}>
                <div>
                  <div className={`text-sm font-bold ${
                    semesterStatus.currentPhase === 'Mid-term Examinations'
                      ? dm ? 'text-red-400' : 'text-red-700'
                      : dm ? 'text-[#1e9df1]' : 'text-[#1677cc]'
                  }`}>Mid-term Exams</div>
                  <div className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Jun 25–Jul 3</div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  semesterStatus.currentPhase === 'Mid-term Examinations'
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-[#1e9df1]'
                }`} />
              </div>

              {/* Final Exams */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                dm ? 'bg-purple-900/20 border-purple-800/40' : 'bg-purple-50 border-purple-100'
              }`}>
                <div>
                  <div className={`text-sm font-bold ${dm ? 'text-purple-400' : 'text-purple-700'}`}>Final Exams</div>
                  <div className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Aug 22–30, 2026</div>
                </div>
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Academic Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`rounded-2xl p-5 mb-6 ${card}`}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${head}`}>Academic Calendar</h2>
              <p className={`text-xs ${sub}`}>{semesterStatus.semesterName} — Key Dates & Events</p>
            </div>
          </div>

          {/* Current Phase Banner */}
          <div className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-3 ${dm ? 'bg-emerald-900/20 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-100'}`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
            <div>
              <div className={`text-xs font-bold ${dm ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Current: {semesterStatus.currentPhase}
              </div>
              <div className={`text-xs ${dm ? 'text-emerald-500' : 'text-emerald-600'}`}>
                {semesterStatus.daysToMilestone} days until {semesterStatus.nextMilestone}
              </div>
            </div>
          </div>

          {/* Calendar Events Grid */}
          <div className="space-y-2">
            {/* Helper to build event row */}
            {[
              {
                emoji: '🚀', title: 'Classes Commence', date: 'May 6, 2026 (Wednesday)',
                note: 'Orientation and start of Summer Semester',
                active: new Date() < new Date('2026-05-06'), past: new Date() >= new Date('2026-05-06'),
                accentDark: 'border-l-blue-500', accentLight: 'border-l-blue-400',
              },
              {
                emoji: '📝', title: 'Add/Drop & Withdrawal Deadline', date: 'May 21, 2026 (Thursday)',
                note: 'Last day for course add/drop and withdrawal changes',
                active: new Date() < new Date('2026-05-21'), past: new Date() >= new Date('2026-05-21'),
                accentDark: 'border-l-orange-500', accentLight: 'border-l-orange-400',
              },
              {
                emoji: '📝', title: 'Mid-term Examinations', date: 'Jun 25–Jul 3, 2026 (9 days)',
                note: 'Preparatory leave: June 24',
                badge: semesterStatus.isMidtermPeriod ? 'ONGOING' : null, badgeColor: 'bg-red-500',
                active: !semesterStatus.isMidtermPeriod && new Date() < new Date('2026-06-25'),
                past: !semesterStatus.isMidtermPeriod && new Date() >= new Date('2026-07-04'),
                accentDark: 'border-l-red-500', accentLight: 'border-l-red-400',
              },
              {
                emoji: '📊', title: 'Mid-term Results Submission', date: 'July 26, 2026 (Sunday)',
                note: 'Deadline for submission of Midterm Examination Results',
                active: new Date() < new Date('2026-07-26'), past: new Date() >= new Date('2026-07-26'),
                accentDark: 'border-l-indigo-500', accentLight: 'border-l-indigo-400',
              },
              {
                emoji: '🎯', title: 'Final Examinations', date: 'Aug 22–30, 2026 (9 days)',
                note: 'Preparatory leave: Aug 21',
                badge: semesterStatus.isFinalPeriod ? 'ONGOING' : null, badgeColor: 'bg-purple-500',
                active: !semesterStatus.isFinalPeriod && new Date() < new Date('2026-08-22'),
                past: !semesterStatus.isFinalPeriod && new Date() >= new Date('2026-08-31'),
                accentDark: 'border-l-purple-500', accentLight: 'border-l-purple-400',
              },
              {
                emoji: '📢', title: 'Final Results Publication', date: 'September 3, 2026 (Thursday)',
                note: 'Summer 2026 semester results',
                active: new Date() < new Date('2026-09-03'), past: new Date() >= new Date('2026-09-03'),
                accentDark: 'border-l-emerald-500', accentLight: 'border-l-emerald-400',
              },
              {
                emoji: '🏖️', title: 'Semester Break', date: 'September 4, 2026',
                note: 'Fall 2026 starts: September 5',
                badge: semesterStatus.isBreak ? 'ACTIVE' : null, badgeColor: 'bg-[#1e9df1]',
                active: !semesterStatus.isBreak && new Date() < new Date('2026-09-04'), past: false,
                accentDark: 'border-l-teal-500', accentLight: 'border-l-teal-400',
              },
            ].map((ev, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 ${
                dm
                  ? `${ev.accentDark} ${ev.past ? 'bg-[#17181c]/30 opacity-60' : 'bg-[#16181c]'}`
                  : `${ev.accentLight} ${ev.past ? 'bg-slate-50 opacity-60' : 'bg-white border border-slate-100'}`
              }`}>
                <span className={`text-base leading-none pt-0.5 flex-shrink-0 ${ev.past ? 'grayscale opacity-50' : ''}`}>{ev.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold flex items-center gap-2 flex-wrap ${head}`}>
                    {ev.title}
                    {ev.badge && <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold ${ev.badgeColor}`}>{ev.badge}</span>}
                    {ev.past && <span className={`text-[10px] px-2 py-0.5 rounded-full ${dm ? 'bg-[#2f3336] text-[#71767b]' : 'bg-slate-100 text-slate-400'}`}>Done</span>}
                  </div>
                  <div className={`text-xs mt-0.5 ${sub}`}>{ev.date}</div>
                  {ev.note && <div className={`text-xs mt-0.5 ${sub} opacity-70`}>{ev.note}</div>}
                </div>
              </div>
            ))}
          </div>

        </motion.div>


        {/* Final Exam Schedule - show during final exam period */}
        {semesterStatus.isFinalPeriod && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className={`rounded-2xl p-5 ${card}`}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dm ? 'bg-purple-900/40' : 'bg-purple-50'}`}>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <h2 className={`text-base font-bold ${head}`}>Final Examination Schedule</h2>
          </div>

          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wide ${dm ? 'bg-[#16181c] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                  <th className="text-left py-2.5 px-4 rounded-l-lg">Course</th>
                  <th className="text-left py-2.5 px-4">Date & Day</th>
                  <th className="text-left py-2.5 px-4">Teacher</th>
                  <th className="text-left py-2.5 px-4">Time</th>
                  <th className="text-left py-2.5 px-4 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2f3336]/30">
                {Object.entries(MID_TERM_SCHEDULE).map(([courseCode, exam]) => {
                  const examDate = new Date(exam.date);
                  const today = new Date();
                  const nowTime = new Date();
                  today.setHours(0, 0, 0, 0);
                  examDate.setHours(0, 0, 0, 0);

                  let status = 'Upcoming';
                  let statusCls = dm ? 'text-[#1e9df1]' : 'text-[#1e9df1]';

                  if (examDate < today) {
                    status = 'Done';
                    statusCls = dm ? 'text-emerald-400' : 'text-emerald-600';
                  } else if (examDate.getTime() === today.getTime()) {
                    const examEnd = new Date(); examEnd.setHours(11, 30, 0, 0);
                    if (nowTime >= examEnd) { status = 'Done'; statusCls = dm ? 'text-emerald-400' : 'text-emerald-600'; }
                    else { status = 'Today'; statusCls = dm ? 'text-red-400' : 'text-red-600'; }
                  }

                  const isToday = status === 'Today';
                  return (
                    <tr key={courseCode} className={`${isToday ? (dm ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                      <td className={`py-3 px-4 font-bold text-sm ${head}`}>{courseCode}</td>
                      <td className="py-3 px-4">
                        <div className={`text-xs font-semibold ${head}`}>{exam.date.split('-').reverse().join('/')}</div>
                        <div className={`text-xs ${sub}`}>{exam.day}</div>
                      </td>
                      <td className={`py-3 px-4 text-xs ${label}`}>{exam.teacher}</td>
                      <td className="py-3 px-4">
                        <div className={`text-xs font-semibold ${head}`}>{exam.time}</div>
                        <div className={`text-xs ${sub}`}>Room {exam.room}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold ${statusCls}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
        )}

        </div>
      </div>
    </div>
  );
};

export default SemesterTracker;