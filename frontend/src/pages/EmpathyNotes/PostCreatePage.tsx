import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { postsApi } from '../../api/posts';
import { Button, Card, Input } from '../../components/UI';
import { POST_CATEGORIES, PostCreate, PostUpdate } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface PostFormData {
  title: string;
  content: string;
  category: string;
  is_private: boolean;
}

export const PostCreatePage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const isEditing = !!postId;
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    category: 'general',
    is_private: false
  });

  const [errors, setErrors] = useState<Partial<PostFormData>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing post for editing
  const { data: existingPost, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.getPost(postId!),
    enabled: isEditing,
    onSuccess: (data) => {
      setFormData({
        title: data.title,
        content: data.content,
        category: data.category || 'general',
        is_private: data.is_private
      });
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: PostCreate) => postsApi.createPost(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/empathy-notes/post/${data.id}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: PostUpdate }) => 
      postsApi.updatePost(postId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      navigate(`/empathy-notes/post/${postId}`);
    },
  });

  const handleInputChange = (
    field: keyof PostFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PostFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요';
    } else if (formData.title.length > 100) {
      newErrors.title = '제목은 100자 이하로 입력해주세요';
    }

    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요';
    } else if (formData.content.length < 10) {
      newErrors.content = '내용은 10자 이상 입력해주세요';
    } else if (formData.content.length > 5000) {
      newErrors.content = '내용은 5000자 이하로 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          postId: postId!,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Failed to save post:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('작성 중인 내용이 사라집니다. 정말로 나가시겠습니까?')) {
      navigate(-1);
    }
  };

  const wordCount = formData.content.length;
  const isFormValid = formData.title.trim() && formData.content.trim();

  if (isEditing && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6 w-1/4"></div>
            <Card className="p-6">
              <div className="space-y-4">
                <div className="h-10 bg-gray-300 rounded"></div>
                <div className="h-32 bg-gray-300 rounded"></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check authorization for editing
  if (isEditing && existingPost && user?.id !== existingPost.user_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">수정 권한이 없습니다.</p>
            <Button onClick={() => navigate('/empathy-notes')}>
              목록으로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {showPreview ? (
                <>
                  <EyeSlashIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">편집</span>
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">미리보기</span>
                </>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!showPreview ? (
            // Edit Mode
            <Card className="p-6">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목 *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="제목을 입력하세요"
                    className={errors.title ? 'border-red-300 focus:ring-red-500' : ''}
                    maxLength={100}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.title ? (
                      <span className="text-sm text-red-600">{errors.title}</span>
                    ) : (
                      <span></span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formData.title.length}/100
                    </span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {POST_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용 *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="여러분의 이야기를 자유롭게 나누어보세요.&#13;&#10;&#13;&#10;이곳은 안전한 공간입니다. 마음 편히 작성해주세요."
                    rows={15}
                    maxLength={5000}
                    className={`w-full px-3 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.content ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.content ? (
                      <span className="text-sm text-red-600">{errors.content}</span>
                    ) : (
                      <span></span>
                    )}
                    <span className="text-xs text-gray-500">
                      {wordCount}/5000자
                    </span>
                  </div>
                </div>

                {/* Privacy Setting */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_private"
                    checked={formData.is_private}
                    onChange={(e) => handleInputChange('is_private', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_private" className="text-sm text-gray-700 flex-1">
                    <span className="font-medium">비공개로 설정</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      비공개 게시물은 나만 볼 수 있습니다
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          ) : (
            // Preview Mode
            <Card className="p-6">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📝 미리보기 모드입니다. 실제 게시물과 동일하게 표시됩니다.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.nickname?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.nickname || '익명'}
                    </p>
                    <p className="text-sm text-gray-500">
                      방금 전
                      {formData.category && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="capitalize">{formData.category}</span>
                        </>
                      )}
                      {formData.is_private && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="text-red-500">🔒 비공개</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 break-words">
                  {formData.title || '제목을 입력하세요'}
                </h1>

                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                    {formData.content || '내용을 입력하세요'}
                  </p>
                </div>

                {wordCount > 0 && (
                  <div className="text-sm text-gray-500 pt-4 border-t border-gray-100">
                    {wordCount}자
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              취소
            </Button>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {isFormValid ? '저장할 수 있습니다' : '제목과 내용을 입력해주세요'}
              </span>
              <Button
                type="submit"
                disabled={!isFormValid || isSaving}
                className="px-8"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {isEditing ? '수정 중...' : '발행 중...'}
                  </>
                ) : (
                  isEditing ? '수정하기' : '발행하기'
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Writing Tips */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💡 글쓰기 팁
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 진솔한 마음으로 작성하면 더 많은 공감을 받을 수 있어요</li>
            <li>• 개인정보(실명, 연락처 등)는 포함하지 말아주세요</li>
            <li>• 존중하는 마음으로 작성해주세요</li>
            <li>• 비공개로 설정하면 나만 볼 수 있어요</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};