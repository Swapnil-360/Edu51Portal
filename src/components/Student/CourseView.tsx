import React, { useState } from 'react';
import { FileText, Play, Download, Eye, Calendar, Lightbulb, Zap, Presentation, HelpCircle, ExternalLink, FolderOpen } from 'lucide-react';
import { useMaterials } from '../../hooks/useMaterials';
import { getGoogleDriveLink } from '../../config/googleDrive';

interface CourseViewProps {
  courseId: string;
  courseName: string;
  courseCode: string;
}

export function CourseView({ courseId, courseName, courseCode }: CourseViewProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { materials } = useMaterials(courseId);

  const tabs = [
    { id: 'all', label: 'All Materials', count: materials.length },
    { id: 'notes', label: '📝 Notes', count: materials.filter(m => m.category === 'notes').length },
    { id: 'suggestions', label: '💡 Suggestions', count: materials.filter(m => m.category === 'suggestions').length },
    { id: 'super-tips', label: '⚡ Super Tips', count: materials.filter(m => m.category === 'super-tips').length },
    { id: 'slides', label: '📊 Slides', count: materials.filter(m => m.category === 'slides').length },
    { id: 'ct-questions', label: '❓ CT Questions', count: materials.filter(m => m.category === 'ct-questions').length },
    { id: 'videos', label: '🎥 Videos', count: materials.filter(m => m.category === 'videos').length },
  ];

  const filteredMaterials = activeTab === 'all' 
    ? materials 
    : materials.filter(material => material.category === activeTab);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'notes': return <FileText className="h-5 w-5" />;
      case 'suggestions': return <Lightbulb className="h-5 w-5" />;
      case 'super-tips': return <Zap className="h-5 w-5" />;
      case 'slides': return <Presentation className="h-5 w-5" />;
      case 'ct-questions': return <HelpCircle className="h-5 w-5" />;
      case 'videos': return <Play className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'notes': return 'text-blue-600 bg-blue-100';
      case 'suggestions': return 'text-green-600 bg-green-100';
      case 'super-tips': return 'text-yellow-600 bg-yellow-100';
      case 'slides': return 'text-purple-600 bg-purple-100';
      case 'ct-questions': return 'text-red-600 bg-red-100';
      case 'videos': return 'text-pink-600 bg-pink-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'notes': return '📝 Notes';
      case 'suggestions': return '💡 Suggestions';
      case 'super-tips': return '⚡ Super Tips';
      case 'slides': return '📊 Slides';
      case 'ct-questions': return '❓ CT Questions';
      case 'videos': return '🎥 Videos';
      default: return '📎 Other';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <h2 className="text-3xl font-bold text-gray-900">{courseName}</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {courseCode}
          </span>
        </div>
        <p className="text-gray-600">Access all course materials and resources</p>
      </div>

      {/* Google Drive Materials Browser */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Course Materials on Google Drive</h3>
          </div>
          <a
            href={getGoogleDriveLink(courseCode, 'all') || "https://drive.google.com/drive/folders/bc1q63k6h64n7n56p23cjzu5yl6yfu55yxk6swy66k-iugq"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Browse All Materials
          </a>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'notes', label: '📝 Notes', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
            { key: 'suggestions', label: '💡 Tips', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
            { key: 'super-tips', label: '⚡ Super Tips', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
            { key: 'slides', label: '📊 Slides', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
            { key: 'ct-questions', label: '❓ CT Questions', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
            { key: 'videos', label: '🎥 Videos', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200' }
          ].map((category) => (
            <a
              key={category.key}
              href={getGoogleDriveLink(courseCode, category.key) || "https://drive.google.com/drive/folders/bc1q63k6h64n7n56p23cjzu5yl6yfu55yxk6swy66k-iugq"}
              target="_blank"
              rel="noopener noreferrer"
              className={`${category.color} px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors hover:shadow-sm`}
            >
              {category.label}
            </a>
          ))}
        </div>
        
        <p className="text-xs text-gray-600 mt-3">
          📂 Access organized course materials directly from Google Drive. Materials are categorized for easy navigation.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1e9df1] text-[#1e9df1] bg-[#1e9df1]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Materials Grid */}
      <div className="space-y-4">
        {filteredMaterials.map((material) => (
          <div
            key={material.id}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-3 rounded-full ${getCategoryColor(material.category || 'other')}`}>
                  {getCategoryIcon(material.category || 'other')}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {material.title}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {getCategoryName(material.category || 'other')}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{material.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {material.created_at}
                    </div>
                    {material.size && (
                      <div>Size: {material.size}</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Preview Button */}
                {material.type === 'video' && material.video_url ? (
                  <a
                    href={material.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Watch Video"
                  >
                    <Eye className="h-5 w-5" />
                  </a>
                ) : material.file_url ? (
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Preview File"
                  >
                    <Eye className="h-5 w-5" />
                  </a>
                ) : (
                  <button
                    className="p-2 text-gray-300 cursor-not-allowed rounded-lg"
                    title="No preview available"
                    disabled
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                )}

                {/* Download Button */}
                {material.file_url ? (
                  <a
                    href={material.file_url}
                    download
                    className="p-2 text-gray-500 hover:text-[#1e9df1] hover:bg-[#1e9df1]/5 rounded-lg transition-colors"
                    title="Download File"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                ) : (
                  <button
                    className="p-2 text-gray-300 cursor-not-allowed rounded-lg"
                    title="No file to download"
                    disabled
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-600">No materials have been uploaded for this category yet.</p>
        </div>
      )}
    </div>
  );
}