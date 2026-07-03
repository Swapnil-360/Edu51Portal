import React from 'react';
import { Book, FileText, Clock } from 'lucide-react';

interface SectionViewProps {
  sectionId: string;
  sectionName: string;
  onSelectCourse: (courseId: string, courseName: string, courseCode: string) => void;
}

export function SectionView({ sectionId, sectionName, onSelectCourse }: SectionViewProps) {
  // Mock data for courses
  const courses = sectionId === '5' ? [
    { 
      id: '1', 
      name: 'Networking', 
      code: 'CSE-319-20', 
      instructor: 'Dr. Ahmed',
      materialCount: 12,
      lastUpdated: '2024-01-15'
    },
    { 
      id: '2', 
      name: 'Software Engineering', 
      code: 'CSE-327', 
      instructor: 'Prof. Rahman',
      materialCount: 18,
      lastUpdated: '2024-01-12'
    },
    { 
      id: '3', 
      name: 'Project Management and Professional Ethics', 
      code: 'CSE-407', 
      instructor: 'Dr. Khan',
      materialCount: 14,
      lastUpdated: '2024-01-10'
    },
    { 
      id: '4', 
      name: 'Distributed Database', 
      code: 'CSE-417', 
      instructor: 'Prof. Hassan',
      materialCount: 16,
      lastUpdated: '2024-01-08'
    },
    { 
      id: '5', 
      name: 'Artificial Intelligence', 
      code: 'CSE-351', 
      instructor: 'Dr. Islam',
      materialCount: 20,
      lastUpdated: '2024-01-06'
    },
  ] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{sectionName}</h2>
        <p className="text-gray-600">Choose a course to access materials and resources</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => onSelectCourse(course.id, course.name, course.code)}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border hover:border-[#1e9df1]/40 group"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-[#1e9df1]/10 p-3 rounded-full group-hover:bg-[#1e9df1]/20 transition-colors">
                  <Book className="h-6 w-6 text-[#1e9df1]" />
                </div>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                  {course.code}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#1e9df1] transition-colors">
                {course.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">Instructor: {course.instructor}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  {course.materialCount} materials
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.lastUpdated}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}