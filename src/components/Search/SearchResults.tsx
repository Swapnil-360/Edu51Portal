import React from 'react';
import { Book, FileText, Search as SearchIcon } from 'lucide-react';
import type { SearchResult } from '../../types';

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
}

export function SearchResults({ query, results, onSelectResult }: SearchResultsProps) {
  if (!query) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-3 mb-6">
        <SearchIcon className="h-6 w-6 text-gray-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Search Results for "{query}"
          </h2>
          <p className="text-gray-600">{results.length} results found</p>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => onSelectResult(result)}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer p-6"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-full ${
                  result.type === 'course' 
                    ? 'bg-[#1e9df1]/10 text-[#1e9df1]' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {result.type === 'course' ? (
                    <Book className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-[#1e9df1] transition-colors">
                      {result.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.type === 'course' 
                        ? 'bg-[#1e9df1]/10 text-[#1e9df1]' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {result.type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{result.subtitle}</p>
                  <p className="text-gray-500 text-xs mt-2">{result.path}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or browse through the sections instead.
          </p>
        </div>
      )}
    </div>
  );
}