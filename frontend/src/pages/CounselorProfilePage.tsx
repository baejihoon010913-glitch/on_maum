import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Calendar, TimeSlotPicker } from '@/components/UI';
import { counselorsApi, chatApi } from '@/api';
import { Counselor, TimeSlot } from '@/types';

const CounselorProfilePage: React.FC = () => {
  const { counselorId } = useParams<{ counselorId: string }>();
  const navigate = useNavigate();
  
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();
  const [bookingData, setBookingData] = useState({
    concern_category: '',
    description: '',
  });
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Load counselor data on component mount
  useEffect(() => {
    if (counselorId) {
      loadCounselor();
    }
  }, [counselorId]);

  // Load time slots when date is selected
  useEffect(() => {
    if (selectedDate && counselorId) {
      loadTimeSlots();
    }
  }, [selectedDate, counselorId]);

  const loadCounselor = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await counselorsApi.getCounselor(counselorId!);
      setCounselor(data);
    } catch (err) {
      console.error('Error loading counselor:', err);
      setError('상담사 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    try {
      setSlotsLoading(true);
      const formattedDate = selectedDate!.toISOString().split('T')[0];
      const data = await counselorsApi.getCounselorTimeSlots({
        counselor_id: counselorId!,
        start_date: formattedDate,
        end_date: formattedDate,
      });
      setTimeSlots(data);
      setSelectedSlot(undefined); // Reset selected slot when date changes
    } catch (err) {
      console.error('Error loading time slots:', err);
      setTimeSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleBookingSubmit = async () => {
    if (!selectedSlot || !selectedDate) {
      alert('날짜와 시간을 선택해주세요.');
      return;
    }

    try {
      setBookingLoading(true);
      
      const bookingRequest = {
        counselor_id: counselorId!,
        scheduled_date: selectedDate.toISOString().split('T')[0],
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        concern_category: bookingData.concern_category || undefined,
        description: bookingData.description || undefined,
        time_slot_id: selectedSlot.id,
      };

      const result = await chatApi.bookChatSession(bookingRequest);
      
      // Show success message and navigate to chat sessions
      alert(`상담 예약이 완료되었습니다!\n세션 ID: ${result.session_id}`);
      navigate('/chat');
      
    } catch (err) {
      console.error('Error booking session:', err);
      alert('상담 예약에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">
          ★
        </span>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">
          ☆
        </span>
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">
          ☆
        </span>
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">상담사 정보를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !counselor) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-red-600">{error || '상담사 정보를 찾을 수 없습니다.'}</p>
              <Button onClick={() => navigate('/counselors')} className="mt-4">
                목록으로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2); // Allow booking up to 2 months ahead

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/counselors')}>
        ← 상담사 목록
      </Button>

      {/* Counselor Profile */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {counselor.counselor_profile.profile_image ? (
                <img
                  src={counselor.counselor_profile.profile_image}
                  alt={counselor.staff.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto md:mx-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-gray-500 text-4xl">👨‍⚕️</span>
                </div>
              )}
            </div>

            {/* Profile Details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 text-center md:text-left">
                {counselor.staff.name}
              </h1>
              
              {/* Rating */}
              <div className="flex items-center justify-center md:justify-start space-x-2 mt-2">
                <div className="flex">
                  {renderStars(counselor.counselor_profile.rating)}
                </div>
                <span className="text-gray-600">
                  {formatRating(counselor.counselor_profile.rating)} 
                  ({counselor.counselor_profile.total_sessions}회 상담)
                </span>
              </div>

              {/* Basic Info */}
              <div className="mt-4 space-y-2 text-center md:text-left">
                <p className="text-gray-600">
                  <strong>경력:</strong> {counselor.counselor_profile.experience_years}년
                </p>
                <p className="text-gray-600">
                  <strong>자격:</strong> {counselor.counselor_profile.license_number}
                </p>
                <p className="text-gray-600">
                  <strong>학력:</strong> {counselor.counselor_profile.education}
                </p>
              </div>

              {/* Specialties */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2 text-center md:text-left">전문 분야</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {counselor.counselor_profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* Availability Status */}
              <div className="mt-4 flex justify-center md:justify-start">
                {counselor.counselor_profile.is_available ? (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    상담 가능
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 rounded-full">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    상담 불가
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Introduction */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">소개</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {counselor.counselor_profile.introduction}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Booking Section */}
      {counselor.counselor_profile.is_available && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900">상담 예약</h2>
            <p className="text-gray-600 text-sm">날짜와 시간을 선택하여 상담을 예약하세요</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">날짜 선택</h3>
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                minDate={minDate}
                maxDate={maxDate}
                className="max-w-md"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <TimeSlotPicker
                timeSlots={timeSlots}
                selectedSlot={selectedSlot}
                onSlotSelect={handleSlotSelect}
                loading={slotsLoading}
              />
            )}

            {/* Booking Details */}
            {selectedSlot && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">상담 정보 (선택사항)</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    고민 분야
                  </label>
                  <select
                    value={bookingData.concern_category}
                    onChange={(e) => setBookingData({ ...bookingData, concern_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">선택하지 않음</option>
                    <option value="relationship">인간관계</option>
                    <option value="family">가족</option>
                    <option value="work">직장/학업</option>
                    <option value="depression">우울/불안</option>
                    <option value="stress">스트레스</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상담 받고 싶은 내용
                  </label>
                  <textarea
                    value={bookingData.description}
                    onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                    placeholder="상담사에게 미리 알려주고 싶은 내용이 있다면 적어주세요 (선택사항)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <Button
                  onClick={handleBookingSubmit}
                  disabled={bookingLoading}
                  className="w-full"
                  size="lg"
                >
                  {bookingLoading ? '예약 중...' : '상담 예약하기'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!counselor.counselor_profile.is_available && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-400 mb-2">😔</div>
            <p className="text-gray-600">현재 상담 예약이 불가능한 상담사입니다.</p>
            <p className="text-sm text-gray-500 mt-1">다른 상담사를 찾아보세요.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CounselorProfilePage;