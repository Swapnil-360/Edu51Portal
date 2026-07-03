import React, { useState, useMemo } from 'react';
import { Search, Filter, Clock, BookOpen, Target, Calendar } from 'lucide-react';
import { ExamMaterialCard, ExamPeriodBanner } from '../ExamMaterialCard';
import { 
  getCurrentExamMaterials, 
  getExamMaterialsByCourse,
  isMaterialRelevantNow,
  ExamMaterial,
  MaterialType,
  ExamType
} from '../../config/examMaterials';
import { getCurrentSemesterStatus } from '../../config/semester';

interface ExamMaterialsDashboardProps {
  isDarkMode?: boolean;
}

export const ExamMaterialsDashboard: React.FC<ExamMaterialsDashboardProps> = ({ isDarkMode = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<MaterialType | 'all'>('all');
  const [selectedExamType, setSelectedExamType] = useState<ExamType | 'all'>('all');
  const [showRelevantOnly, setShowRelevantOnly] = useState(true);

  const semesterStatus = getCurrentSemesterStatus();

  // Get all materials with smart filtering
  const allMaterials = useMemo(() => {
    if (selectedCourse === 'all') {
      return getCurrentExamMaterials();
    }
    return getExamMaterialsByCourse(selectedCourse);
  }, [selectedCourse]);

  // Apply additional filters
  const filteredMaterials = useMemo(() => {
    let filtered = allMaterials;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((material: ExamMaterial) =>
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.topics?.some((topic: string) => 
          topic.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by material type
    if (selectedType !== 'all') {
      filtered = filtered.filter((material: ExamMaterial) => material.type === selectedType);
    }

    // Filter by exam type
    if (selectedExamType !== 'all') {
      filtered = filtered.filter((material: ExamMaterial) => 
        material.examType === selectedExamType || material.examType === 'all'
      );
    }

    // Filter by current relevance
    if (showRelevantOnly) {
      filtered = filtered.filter((material: ExamMaterial) => isMaterialRelevantNow(material));
    }

    return filtered;
  }, [allMaterials, searchQuery, selectedType, selectedExamType, showRelevantOnly]);

  // Group materials by course
  const materialsByCourse = useMemo(() => {
    const grouped: { [course: string]: ExamMaterial[] } = {};
    filteredMaterials.forEach((material: ExamMaterial) => {
      if (!grouped[material.courseCode]) {
        grouped[material.courseCode] = [];
      }
      grouped[material.courseCode].push(material);
    });
    return grouped;
  }, [filteredMaterials]);

  const courses = ['CSE-319-20', 'CSE-327', 'CSE-351', 'CSE-407', 'CSE-417'];

  const handleMaterialClick = (material: ExamMaterial) => {
    if (material.driveUrl) {
      window.open(material.driveUrl, '_blank');
    }
  };

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-6 overflow-auto transition-colors duration-300 ${
      isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900'
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Mobile-Responsive Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 px-2">
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            📚 Smart Exam Materials
          </h1>
          <p className={`text-sm sm:text-base md:text-lg transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            AI-powered material recommendations for your current exam period
          </p>
        </div>

        {/* Development Notice Banner */}
        <div className={`p-4 sm:p-5 md:p-6 rounded-2xl mb-6 sm:mb-8 shadow-lg transition-colors duration-300 ${
          isDarkMode
            ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 border border-blue-700/50 text-white'
            : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white border border-blue-200/50'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`p-2 rounded-lg backdrop-blur-sm ${
              isDarkMode ? 'bg-white bg-opacity-10' : 'bg-white bg-opacity-20'
            }`}>
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-blue-800 text-sm font-bold">⚠️</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl">🚧 Feature Under Development</h3>
              <p className={`text-sm sm:text-base transition-colors duration-300 ${
                isDarkMode ? 'text-blue-200' : 'text-blue-100'
              }`}>
                Advanced AI features and enhanced functionality are being added
              </p>
            </div>
          </div>
          <div className={`rounded-xl p-3 backdrop-blur-sm border transition-colors duration-300 ${
            isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'
          }`}>
            <p className={`text-sm leading-relaxed transition-colors duration-300 ${
              isDarkMode ? 'text-white/80' : 'text-white/90'
            }`}>
              <strong>🔮 Coming Soon:</strong> Smart material categorization, personalized study recommendations, 
              progress tracking, and integrated AI study assistant. The current version provides basic material access 
              while we enhance the experience with advanced features.
            </p>
          </div>
        </div>

        {/* Exam Period Banner */}
        <ExamPeriodBanner />

        {/* Enhanced Mobile-Responsive Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl shadow-md border ${
            isDarkMode
              ? 'bg-gray-800 border-blue-800'
              : 'bg-white border-blue-100'
          }`}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'
              }`}>
                <BookOpen className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Materials</p>
                <p className={`font-bold text-lg sm:text-xl ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{filteredMaterials.length}</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl shadow-md border ${
            isDarkMode
              ? 'bg-gray-800 border-orange-800'
              : 'bg-white border-orange-100'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-orange-900/40' : 'bg-orange-100'
              }`}>
                <Target className={`h-5 w-5 ${
                  isDarkMode ? 'text-orange-400' : 'text-orange-600'
                }`} />
              </div>
              <div>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>High Priority</p>
                <p className={`font-bold text-xl ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {filteredMaterials.filter((m: ExamMaterial) => m.isHighPriority).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl shadow-md border ${
            isDarkMode
              ? 'bg-gray-800 border-green-800'
              : 'bg-white border-green-100'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
              }`}>
                <Clock className={`h-5 w-5 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Current Phase</p>
                <p className={`font-bold text-sm ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{semesterStatus.currentPhase}</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl shadow-md border ${
            isDarkMode
              ? 'bg-gray-800 border-purple-800'
              : 'bg-white border-purple-100'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-purple-900/40' : 'bg-purple-100'
              }`}>
                <Calendar className={`h-5 w-5 ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`} />
              </div>
              <div>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Days to Next</p>
                <p className={`font-bold text-xl ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{semesterStatus.daysToMilestone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl shadow-lg p-6 mb-8 border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-100'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as MaterialType | 'all')}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="ct">Class Tests</option>
              <option value="notes">Notes</option>
              <option value="slides">Slides</option>
              <option value="suggestions">Suggestions</option>
            </select>

            {/* Exam Type Filter */}
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value as ExamType | 'all')}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Exam Types</option>
              <option value="midterm">Mid-term Only</option>
            </select>

            {/* Relevance Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRelevantOnly}
                onChange={(e) => setShowRelevantOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Current exam only</span>
            </label>
          </div>
        </div>

        {/* Materials Grid */}
        {Object.keys(materialsByCourse).length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <Filter className={`h-12 w-12 mx-auto ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </div>
            <h3 className={`text-lg font-medium mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>No materials found</h3>
            <p className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(materialsByCourse).map(([courseCode, materials]) => (
              <div key={courseCode} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <h2 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>{courseCode}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isDarkMode
                      ? 'bg-blue-900/40 text-blue-300'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {materials.length} materials
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isDarkMode
                      ? 'bg-orange-900/40 text-orange-300'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {materials.filter(m => isMaterialRelevantNow(m)).length} relevant now
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materials.map((material, index) => (
                    <ExamMaterialCard
                      key={`${material.courseCode}-${material.name}-${index}`}
                      material={material}
                      isCurrentlyRelevant={isMaterialRelevantNow(material)}
                      onClick={() => handleMaterialClick(material)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};