import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../../types';
import { Card } from '../UI';
import { HeartIcon, EyeIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface PostCardProps {
  post: Post;
  onEmpathyToggle?: (postId: string) => void;
  isLoading?: boolean;
  showAuthor?: boolean;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onEmpathyToggle, 
  isLoading = false,
  showAuthor = true,
  className = '' 
}) => {
  const handleEmpathyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEmpathyToggle?.(post.id);
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMoodEmoji = (category?: string) => {
    const categoryEmojis: Record<string, string> = {
      relationships: '💕',
      academic: '📚',
      family: '👨‍👩‍👧‍👦',
      friendship: '👫',
      career: '💼',
      health: '🏥',
      emotions: '😊',
      daily: '📝',
      general: '💭'
    };
    return categoryEmojis[category || 'general'] || '💭';
  };

  return (
    <Card className={`hover:shadow-md transition-all duration-200 ${className}`}>
      <Link to={`/empathy-notes/post/${post.id}`} className="block">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              {showAuthor && post.author.profile_image ? (
                <img
                  src={post.author.profile_image}
                  alt={post.author.nickname}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {showAuthor ? post.author.nickname.charAt(0) : '익'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                {showAuthor && (
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {post.author.nickname}
                  </p>
                )}
                <p className="text-xs text-gray-500 flex items-center">
                  {formatTimeAgo(post.created_at)}
                  {post.category && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="flex items-center">
                        {getMoodEmoji(post.category)}
                        <span className="ml-1 capitalize">{post.category}</span>
                      </span>
                    </>
                  )}
                  {post.is_private && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="text-red-500">🔒 비공개</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {post.title}
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
              {truncateContent(post.content)}
            </p>
          </div>

          {/* Emoji Reactions */}
          {post.emoji_reactions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.emoji_reactions.slice(0, 5).map((reaction, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-sm"
                >
                  <span className="mr-1">{reaction.emoji}</span>
                  <span className="text-gray-600">{reaction.count}</span>
                </span>
              ))}
              {post.emoji_reactions.length > 5 && (
                <span className="text-gray-500 text-sm">+{post.emoji_reactions.length - 5}개</span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <EyeIcon className="w-4 h-4 mr-1" />
                <span>{post.view_count}</span>
              </div>
              <div className="flex items-center">
                <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                <span>댓글</span>
              </div>
            </div>
            
            {/* Empathy Button */}
            <button
              onClick={handleEmpathyClick}
              disabled={isLoading}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                post.is_empathized
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
            >
              {post.is_empathized ? (
                <HeartSolidIcon className="w-4 h-4" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
              <span>{post.empathy_count}</span>
            </button>
          </div>
        </div>
      </Link>
    </Card>
  );
};