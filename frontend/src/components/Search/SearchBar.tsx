import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  showClearButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = '검색어를 입력하세요...',
  debounceMs = 300,
  className = '',
  autoFocus = false,
  showClearButton = true
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query.trim(), debounceMs);

  // Call onSearch when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2 || debouncedQuery.length === 0) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  const hasQuery = query.length > 0;
  const isSearching = debouncedQuery !== query;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`relative flex items-center transition-all duration-200 ${
          isFocused 
            ? 'ring-2 ring-indigo-500 ring-opacity-50' 
            : 'ring-1 ring-gray-300'
        } bg-white rounded-lg shadow-sm`}
      >
        {/* Search Icon */}
        <div className="absolute left-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon 
            className={`w-5 h-5 transition-colors duration-200 ${
              isFocused || hasQuery ? 'text-indigo-500' : 'text-gray-400'
            }`} 
          />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-12 py-3 md:py-4 text-sm md:text-base bg-transparent border-0 rounded-lg focus:outline-none focus:ring-0 placeholder-gray-500"
          aria-label="검색"
        />

        {/* Loading or Clear Button */}
        <div className="absolute right-3 flex items-center">
          {isSearching && hasQuery ? (
            // Loading Spinner
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
          ) : hasQuery && showClearButton ? (
            // Clear Button
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all duration-200"
              aria-label="검색어 지우기"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search Status */}
      {query.length > 0 && query.length < 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md shadow-sm z-10">
          <p className="text-sm text-yellow-700">
            최소 2글자 이상 입력해주세요.
          </p>
        </div>
      )}

      {/* Mobile Optimizations */}
      <style jsx>{`
        @media (max-width: 640px) {
          input {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
};