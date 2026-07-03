import React from 'react';
import { Users, Calendar, BookOpen, Lock } from 'lucide-react';

interface IntakeViewProps {
  onSelectSection: (sectionId: string, sectionName: string) => void;
  isDarkMode?: boolean;
}

export function IntakeView({ onSelectSection, isDarkMode = false }: IntakeViewProps) {
  const sections = [
    { id: '1', name: 'Section 1', courseCount: 8, description: 'Computer Science & Engineering', accessible: false },
    { id: '2', name: 'Section 2', courseCount: 7, description: 'Business Administration', accessible: false },
    { id: '3', name: 'Section 3', courseCount: 9, description: 'Electrical & Electronics Engineering', accessible: false },
    { id: '4', name: 'Section 4', courseCount: 6, description: 'Economics', accessible: false },
    { id: '5', name: 'Section 2 (AI)', courseCount: 5, description: 'Dept. of CSE · AI Major', accessible: true },
  ];

  const bg = isDarkMode ? 'bg-[#000000]' : 'bg-slate-50';
  const headingColor = isDarkMode ? 'text-white' : 'text-slate-900';
  const subColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className={`text-3xl font-black mb-2 ${headingColor}`}>Intake 51</h2>
          <p className={`text-sm ${subColor}`}>Select your section to access course materials</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => section.accessible && onSelectSection(section.id, section.name)}
              className={`relative rounded-2xl border transition-all duration-200 group ${
                section.accessible
                  ? isDarkMode
                    ? 'bg-[#17181c] border-[#2f3336] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg cursor-pointer'
                  : isDarkMode
                    ? 'bg-[#17181c]/40 border-[#2f3336]/50 cursor-not-allowed opacity-50'
                    : 'bg-white/60 border-slate-200/60 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                    section.accessible
                      ? isDarkMode
                        ? 'bg-blue-900/40 group-hover:bg-blue-800/50'
                        : 'bg-blue-50 group-hover:bg-blue-100'
                      : isDarkMode ? 'bg-[#16181c]' : 'bg-slate-100'
                  }`}>
                    <Users className={`h-5 w-5 ${
                      section.accessible
                        ? 'text-blue-500'
                        : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                  </div>

                  {!section.accessible && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isDarkMode ? 'bg-[#16181c] text-slate-500' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Lock className="w-3 h-3" /> Coming Soon
                    </div>
                  )}

                  {section.accessible && (
                    <div className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <BookOpen className="h-3.5 w-3.5" />
                      {section.courseCount} courses
                    </div>
                  )}
                </div>

                <h3 className={`text-lg font-bold mb-1 transition-colors ${
                  section.accessible
                    ? isDarkMode
                      ? 'text-white group-hover:text-blue-400'
                      : 'text-slate-900 group-hover:text-blue-600'
                    : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {section.name}
                </h3>

                <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {section.description}
                </p>

                <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  Summer 2026
                </div>
              </div>

              {/* Active indicator strip */}
              {section.accessible && (
                <div className="absolute left-0 top-6 bottom-6 w-0.5 rounded-r-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
