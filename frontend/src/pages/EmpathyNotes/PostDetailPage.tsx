import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeftIcon, 
  HeartIcon, 
  EyeIcon, 
  FlagIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { postsApi } from '../../api/posts';
import { Button, Card } from '../../components/UI';
import { useAuthStore } from '../../store/authStore';
import { CounselorReply } from '../../types';

const EMOJI_OPTIONS = ['😊', '😢', '😮', '😍', '👍', '👎', '❤️', '🔥', '💯', '🎉'];

export const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [showActions, setShowActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [empathyLoading, setEmpathyLoading] = useState(false);
  const [reportForm, setReportForm] = useState({
    reason: '',
    description: '',
    details: ''
  });

  // Fetch post details
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.getPost(postId!),
    enabled: !!postId,
  });

  // Fetch counselor replies
  const { data: counselorReplies } = useQuery({
    queryKey: ['counselor-replies', postId],
    queryFn: async (): Promise<CounselorReply[]> => {
      const response = await fetch(`/api/posts/${postId}/counselor-replies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.json();
    },
    enabled: !!postId,
  });

  // Mutations
  const empathyMutation = useMutation({
    mutationFn: () => postsApi.toggleEmpathy(postId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const emojiMutation = useMutation({
    mutationFn: (emoji: string) => postsApi.addEmojiReaction(postId!, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      setShowEmojiPicker(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deletePost(postId!),
    onSuccess: () => {
      navigate('/empathy-notes');
    },
  });

  const reportMutation = useMutation({
    mutationFn: (data: typeof reportForm) => postsApi.reportPost(postId!, data),
    onSuccess: () => {
      setShowReportModal(false);
      setReportForm({ reason: '', description: '', details: '' });
    },
  });

  const handleEmpathyToggle = async () => {
    if (!user) return;
    setEmpathyLoading(true);
    try {
      await empathyMutation.mutateAsync();
    } finally {
      setEmpathyLoading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!user) return;
    emojiMutation.mutate(emoji);
  };

  const handleDelete = () => {
    if (window.confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    reportMutation.mutate(reportForm);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Loading skeleton */}
          <Card className="p-6 animate-pulse mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-20 h-8 bg-gray-300 rounded"></div>
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-300 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">게시물을 불러올 수 없습니다.</p>
            <Button onClick={() => navigate('/empathy-notes')}>
              목록으로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === post.user_id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>돌아가기</span>
          </button>

          {isAuthor && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <Link
                    to={`/empathy-notes/edit/${postId}`}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span>수정하기</span>
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isLoading}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>삭제하기</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <Card className="p-6 md:p-8 mb-6">
          <div className="mb-6">
            {/* Author Info */}
            <div className="flex items-center space-x-3 mb-4">
              {post.author.profile_image ? (
                <img
                  src={post.author.profile_image}
                  alt={post.author.nickname}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {post.author.nickname.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{post.author.nickname}</p>
                <p className="text-sm text-gray-500">
                  {formatDate(post.created_at)}
                  {post.category && (
                    <>
                      <span className="mx-2">·</span>
                      <span className="capitalize">{post.category}</span>
                    </>
                  )}
                  {post.is_private && (
                    <>
                      <span className="mx-2">·</span>
                      <span className="text-red-500">🔒 비공개</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Title and Content */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 break-words">
              {post.title}
            </h1>
            
            <div className="prose prose-sm md:prose-base max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {post.content}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6 py-4 border-t border-gray-100">
            <div className="flex items-center">
              <EyeIcon className="w-4 h-4 mr-1" />
              <span>{post.view_count} 조회</span>
            </div>
            <div className="flex items-center">
              <HeartIcon className="w-4 h-4 mr-1" />
              <span>{post.empathy_count} 공감</span>
            </div>
          </div>

          {/* Emoji Reactions */}
          {post.emoji_reactions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">반응</h3>
              <div className="flex flex-wrap gap-2">
                {post.emoji_reactions.map((reaction, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 rounded-full text-sm"
                  >
                    <span className="mr-2 text-lg">{reaction.emoji}</span>
                    <span className="text-gray-600 font-medium">{reaction.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {user && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-3">
                {/* Empathy Button */}
                <button
                  onClick={handleEmpathyToggle}
                  disabled={empathyLoading || empathyMutation.isLoading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    post.is_empathized
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                  }`}
                >
                  {post.is_empathized ? (
                    <HeartSolidIcon className="w-4 h-4" />
                  ) : (
                    <HeartIcon className="w-4 h-4" />
                  )}
                  <span>공감 {post.empathy_count}</span>
                </button>

                {/* Emoji Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200 transition-all duration-200"
                  >
                    <span>😊</span>
                    <span>반응</span>
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <div className="grid grid-cols-5 gap-2">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="p-2 text-lg hover:bg-gray-100 rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Button */}
              {!isAuthor && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <FlagIcon className="w-4 h-4" />
                  <span className="text-sm">신고</span>
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Counselor Replies */}
        {counselorReplies && counselorReplies.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              💙 상담사 답변
            </h2>
            <div className="space-y-4">
              {counselorReplies.filter(reply => reply.is_approved).map((reply) => (
                <div key={reply.id} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-blue-900">{reply.counselor_name}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        상담사
                      </span>
                    </div>
                    <span className="text-sm text-blue-600">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-blue-900 leading-relaxed whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              게시물 신고하기
            </h2>
            
            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유
                </label>
                <select
                  value={reportForm.reason}
                  onChange={(e) => setReportForm({...reportForm, reason: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">선택해주세요</option>
                  <option value="inappropriate_content">부적절한 내용</option>
                  <option value="spam">스팸</option>
                  <option value="harassment">괴롭힘</option>
                  <option value="false_information">허위 정보</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상세 설명
                </label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="신고 사유를 자세히 설명해주세요"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={reportMutation.isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  신고하기
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};