import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  XMarkIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CalendarDaysIcon 
} from '@heroicons/react/24/outline';
import { diariesApi } from '../../api/diaries';
import { Button, Input } from '../UI';
import { Diary, DiaryCreate, DiaryUpdate, DIARY_MOODS, DiaryMood } from '../../types';

interface DiaryModalProps {
  date: Date;
  diary?: Diary;
  onSave: (diary: Diary) => void;
  onClose: () => void;
}

interface DiaryFormData {
  title: string;
  content: string;
  mood: DiaryMood | '';
}

export const DiaryModal: React.FC<DiaryModalProps> = ({ 
  date, 
  diary, 
  onSave, 
  onClose 
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!diary;
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<DiaryFormData>({
    title: diary?.title || '',
    content: diary?.content || '',
    mood: diary?.mood as DiaryMood || ''
  });
  
  const [errors, setErrors] = useState<Partial<DiaryFormData>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Set default title based on date
  useEffect(() => {
    if (!isEditing && !formData.title) {
      const defaultTitle = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      }) + '의 일기';
      
      setFormData(prev => ({
        ...prev,
        title: defaultTitle
      }));
    }
  }, [date, isEditing, formData.title]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: DiaryCreate) => diariesApi.createDiary(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      queryClient.invalidateQueries({ queryKey: ['diary-statistics'] });
      onSave(data);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ diaryId, data }: { diaryId: string; data: DiaryUpdate }) => 
      diariesApi.updateDiary(diaryId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      queryClient.invalidateQueries({ queryKey: ['diary-statistics'] });
      onSave(data);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (diaryId: string) => diariesApi.deleteDiary(diaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      queryClient.invalidateQueries({ queryKey: ['diary-statistics'] });
      onClose();
    },
  });

  const handleInputChange = (
    field: keyof DiaryFormData,
    value: string
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
    const newErrors: Partial<DiaryFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요';
    } else if (formData.title.length > 100) {
      newErrors.title = '제목은 100자 이하로 입력해주세요';
    }

    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요';
    } else if (formData.content.length < 5) {
      newErrors.content = '내용은 5자 이상 입력해주세요';
    } else if (formData.content.length > 3000) {
      newErrors.content = '내용은 3000자 이하로 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const diaryData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        mood: formData.mood || undefined
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          diaryId: diary!.id,
          data: diaryData
        });
      } else {
        await createMutation.mutateAsync(diaryData);
      }
    } catch (error) {
      console.error('Failed to save diary:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('정말로 이 일기를 삭제하시겠습니까?')) {
      deleteMutation.mutate(diary!.id);
    }
  };

  const getMoodEmoji = (mood: string) => {
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
    return moodEmojis[mood] || '😐';
  };

  const wordCount = formData.content.length;
  const isFormValid = formData.title.trim() && formData.content.trim();
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? '일기 수정' : '일기 쓰기'}
              </h2>
              <p className="text-sm text-gray-500">
                {formatDate(date)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title={showPreview ? '편집 모드' : '미리보기'}
            >
              {showPreview ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
            
            {/* Delete Button (for editing) */}
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isLoading}
                className="p-2 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                title="삭제"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!showPreview ? (
            // Edit Mode
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="일기 제목을 입력하세요"
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

              {/* Mood Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  오늘의 기분
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {DIARY_MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => handleInputChange('mood', 
                        formData.mood === mood ? '' : mood
                      )}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                        formData.mood === mood
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{getMoodEmoji(mood)}</span>
                      <span className="text-xs text-gray-600 capitalize">
                        {mood}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  오늘 있었던 일과 느낀 점을 적어보세요 *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="오늘 하루는 어떠셨나요?&#13;&#10;&#13;&#10;• 있었던 일들&#13;&#10;• 느낀 감정&#13;&#10;• 생각해본 것들&#13;&#10;&#13;&#10;자유롭게 작성해보세요 😊"
                  rows={12}
                  maxLength={3000}
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
                    {wordCount}/3000자
                  </span>
                </div>
              </div>
            </form>
          ) : (
            // Preview Mode
            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📝 미리보기 모드입니다. 실제 저장될 내용과 동일합니다.
                </p>
              </div>

              <div className="space-y-6">
                {/* Date and Mood */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-gray-500">
                    {formatDate(date)}
                  </h3>
                  {formData.mood && (
                    <span className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                      <span>{getMoodEmoji(formData.mood)}</span>
                      <span className="capitalize">{formData.mood}</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 break-words">
                  {formData.title || '제목을 입력하세요'}
                </h1>

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                    {formData.content || '내용을 입력하세요'}
                  </p>
                </div>

                {wordCount > 0 && (
                  <div className="text-sm text-gray-500 pt-4 border-t border-gray-100">
                    {wordCount}자 · {Math.ceil(wordCount / 200)}분 소요
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showPreview && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                취소
              </Button>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {isFormValid ? '저장할 수 있습니다' : '제목과 내용을 입력해주세요'}
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSaving}
                  className="px-6"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      {isEditing ? '수정 중...' : '저장 중...'}
                    </>
                  ) : (
                    isEditing ? '수정하기' : '저장하기'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};