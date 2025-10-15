import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Calendar from 'react-calendar';
import { 
  CalendarDaysIcon, 
  ChartBarIcon, 
  PencilIcon,
  BookOpenIcon 
} from '@heroicons/react/24/outline';
import { diariesApi } from '../../api/diaries';
import { DiaryCard } from '../../components/Diary/DiaryCard';
import { DiaryModal } from '../../components/Diary/DiaryModal';
import { Card, Button } from '../../components/UI';
import { Diary, DiaryStatistics as DiaryStatsType, DIARY_MOODS } from '../../types';
import 'react-calendar/dist/Calendar.css';

interface DiaryModalProps {
  date: Date;
  diary?: Diary;
  onSave: (diary: Diary) => void;
  onClose: () => void;
}

export const CalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();

  // Fetch diary statistics for the current month
  const { data: stats } = useQuery({
    queryKey: ['diary-statistics', currentYear, currentMonth],
    queryFn: () => diariesApi.getDiaryStatistics({ 
      year: currentYear, 
      month: currentMonth 
    }),
  });

  // Fetch diaries for the current month
  const { data: diariesResponse, isLoading } = useQuery({
    queryKey: ['diaries', currentYear, currentMonth],
    queryFn: () => diariesApi.getDiaries({ 
      year: currentYear, 
      month: currentMonth,
      limit: 100 
    }),
  });

  const diaries = diariesResponse?.items || [];

  // Create a map of dates to diaries for easy lookup
  const diaryMap = useMemo(() => {
    const map = new Map<string, Diary>();
    diaries.forEach(diary => {
      const date = new Date(diary.created_at);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      map.set(dateKey, diary);
    });
    return map;
  }, [diaries]);

  const handleDateClick = (date: Date) => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const existingDiary = diaryMap.get(dateKey);
    
    setSelectedDateForModal(date);
    setShowDiaryModal(true);
  };

  const handleDiarySave = (diary: Diary) => {
    setShowDiaryModal(false);
    // Refetch data
    // This will be handled by react-query automatic refetch
  };

  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const diary = diaryMap.get(dateKey);
    
    if (!diary) return null;

    const getMoodEmoji = (mood?: string) => {
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
      return moodEmojis[mood || ''] || '✨';
    };

    return (
      <div className="flex items-center justify-center mt-1">
        <span className="text-lg">{getMoodEmoji(diary.mood)}</span>
      </div>
    );
  };

  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hasDiary = diaryMap.has(dateKey);
    
    return hasDiary ? 'has-diary' : '';
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const todayDiary = (() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return diaryMap.get(todayKey);
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              <CalendarDaysIcon className="w-8 h-8 mr-3 text-indigo-600" />
              콤마노트
            </h1>
            <p className="text-gray-600 mt-1">일기로 마음을 정리해보세요</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                달력
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                목록
              </button>
            </div>
            
            <Button
              onClick={() => {
                setSelectedDateForModal(new Date());
                setShowDiaryModal(true);
              }}
              className="flex items-center space-x-2"
            >
              <PencilIcon className="w-4 h-4" />
              <span className="hidden sm:inline">오늘 일기 쓰기</span>
              <span className="sm:hidden">쓰기</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Calendar/List Area */}
          <div className="lg:col-span-2">
            {viewMode === 'calendar' ? (
              <Card className="p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formatMonthYear(selectedDate)}
                  </h2>
                </div>
                
                <div className="diary-calendar">
                  <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    onClickDay={handleDateClick}
                    tileContent={getTileContent}
                    tileClassName={getTileClassName}
                    formatDay={(locale, date) => date.getDate().toString()}
                    showNeighboringMonth={false}
                    locale="ko-KR"
                  />
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  💡 날짜를 클릭하여 일기를 작성하거나 확인할 수 있습니다
                </div>
              </Card>
            ) : (
              <Card className="p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    일기 목록
                  </h2>
                  <span className="text-sm text-gray-500">
                    총 {diaries.length}개
                  </span>
                </div>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : diaries.length > 0 ? (
                  <div className="space-y-4">
                    {diaries.map((diary) => (
                      <DiaryCard
                        key={diary.id}
                        diary={diary}
                        onEdit={(diary) => {
                          setSelectedDateForModal(new Date(diary.created_at));
                          setShowDiaryModal(true);
                        }}
                        onView={(diary) => {
                          setSelectedDateForModal(new Date(diary.created_at));
                          setShowDiaryModal(true);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">아직 작성한 일기가 없습니다</p>
                    <Button
                      onClick={() => {
                        setSelectedDateForModal(new Date());
                        setShowDiaryModal(true);
                      }}
                    >
                      첫 번째 일기 쓰기
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Entry */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                오늘의 일기
              </h3>
              
              {todayDiary ? (
                <DiaryCard
                  diary={todayDiary}
                  compact
                  onEdit={() => {
                    setSelectedDateForModal(new Date());
                    setShowDiaryModal(true);
                  }}
                  onView={() => {
                    setSelectedDateForModal(new Date());
                    setShowDiaryModal(true);
                  }}
                />
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-3">오늘 일기를 아직 작성하지 않았어요</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDateForModal(new Date());
                      setShowDiaryModal(true);
                    }}
                  >
                    지금 쓰기
                  </Button>
                </div>
              )}
            </Card>

            {/* Monthly Statistics */}
            {stats && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ChartBarIcon className="w-5 h-5 mr-2" />
                  이달의 통계
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">작성한 일기</span>
                    <span className="font-semibold">{stats.total_entries}개</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">연속 작성</span>
                    <span className="font-semibold">{stats.writing_streak}일</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">평균 길이</span>
                    <span className="font-semibold">{Math.round(stats.average_length)}자</span>
                  </div>
                  
                  {stats.most_active_day && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">가장 활발한 날</span>
                      <span className="font-semibold">
                        {new Date(stats.most_active_day).getDate()}일
                      </span>
                    </div>
                  )}
                </div>

                {/* Mood Distribution */}
                {Object.keys(stats.mood_distribution).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      감정 분포
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(stats.mood_distribution)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([mood, count]) => {
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
                          
                          return (
                            <div key={mood} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">
                                  {moodEmojis[mood] || '😐'}
                                </span>
                                <span className="text-sm text-gray-600 capitalize">
                                  {mood}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Custom Calendar Styles */}
      <style jsx global>{`
        .diary-calendar .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        
        .diary-calendar .react-calendar__tile {
          height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          padding: 4px;
          border: 1px solid #f3f4f6;
          background: white;
          border-radius: 8px;
          margin: 2px;
        }
        
        .diary-calendar .react-calendar__tile:hover {
          background-color: #f8fafc;
        }
        
        .diary-calendar .react-calendar__tile.has-diary {
          background-color: #f0f9ff;
          border-color: #0ea5e9;
        }
        
        .diary-calendar .react-calendar__tile--active {
          background-color: #3b82f6 !important;
          color: white;
        }
        
        .diary-calendar .react-calendar__tile--now {
          background-color: #fef3c7;
          border-color: #f59e0b;
        }
        
        @media (max-width: 640px) {
          .diary-calendar .react-calendar__tile {
            height: 50px;
            margin: 1px;
          }
        }
      `}</style>
      
      {/* Diary Modal will be added in the next component */}
      {showDiaryModal && selectedDateForModal && (
        <DiaryModal
          date={selectedDateForModal}
          diary={diaryMap.get(
            `${selectedDateForModal.getFullYear()}-${String(selectedDateForModal.getMonth() + 1).padStart(2, '0')}-${String(selectedDateForModal.getDate()).padStart(2, '0')}`
          )}
          onSave={handleDiarySave}
          onClose={() => setShowDiaryModal(false)}
        />
      )}
    </div>
  );
};

