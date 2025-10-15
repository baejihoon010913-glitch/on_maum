import React from 'react';
import { Diary, DiaryMood } from '../../types';
import { Card } from '../UI';
import { CalendarDaysIcon, PencilIcon } from '@heroicons/react/24/outline';

interface DiaryCardProps {
  diary: Diary;
  onEdit?: (diary: Diary) => void;
  onView?: (diary: Diary) => void;
  className?: string;
  compact?: boolean;
}

export const DiaryCard: React.FC<DiaryCardProps> = ({ 
  diary, 
  onEdit, 
  onView,
  className = '',
  compact = false
}) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(diary);
  };

  const handleViewClick = () => {
    onView?.(diary);
  };

  const truncateContent = (content: string, maxLength: number = compact ? 80 : 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMoodEmoji = (mood?: string): string => {
    const moodEmojis: Record<string, string> = {
      happy: '😊',
      calm: '😌',
      excited: '😄',
      sad: '😢',
      anxious: '😰',
      angry: '😠',
      frustrated: '😤',
      peaceful: '🕊️',
      grateful: '🙏',
      lonely: '😔'
    };
    return moodEmojis[mood as DiaryMood] || '😐';
  };

  const getMoodColor = (mood?: string): string => {
    const moodColors: Record<string, string> = {
      happy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      calm: 'bg-blue-100 text-blue-800 border-blue-200',
      excited: 'bg-orange-100 text-orange-800 border-orange-200',
      sad: 'bg-gray-100 text-gray-800 border-gray-200',
      anxious: 'bg-red-100 text-red-800 border-red-200',
      angry: 'bg-red-100 text-red-800 border-red-200',
      frustrated: 'bg-purple-100 text-purple-800 border-purple-200',
      peaceful: 'bg-green-100 text-green-800 border-green-200',
      grateful: 'bg-pink-100 text-pink-800 border-pink-200',
      lonely: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return moodColors[mood as DiaryMood] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const wordCount = diary.content.length;

  if (compact) {
    return (
      <Card 
        className={`hover:shadow-sm transition-all duration-200 cursor-pointer ${className}`}
        onClick={handleViewClick}
      >
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {diary.title}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatTime(diary.created_at)}
              </p>
            </div>
            {diary.mood && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getMoodColor(diary.mood)}`}>
                {getMoodEmoji(diary.mood)}
              </span>
            )}
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {truncateContent(diary.content)}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {wordCount}자
            </span>
            <button
              onClick={handleEditClick}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
      onClick={handleViewClick}
    >
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {diary.title}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(diary.created_at)} · {formatTime(diary.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {diary.mood && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getMoodColor(diary.mood)}`}>
                {getMoodEmoji(diary.mood)}
                <span className="ml-1 capitalize">{diary.mood}</span>
              </span>
            )}
            <button
              onClick={handleEditClick}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
            {truncateContent(diary.content)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <span className="mr-1">📝</span>
              {wordCount}자
            </span>
            {diary.updated_at && diary.updated_at !== diary.created_at && (
              <span className="text-xs">
                수정됨 · {formatTime(diary.updated_at)}
              </span>
            )}
          </div>
          
          <button
            onClick={handleViewClick}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
          >
            전체보기
          </button>
        </div>
      </div>
    </Card>
  );
};