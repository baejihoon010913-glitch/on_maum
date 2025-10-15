import React from 'react';
import { TimeSlot } from '@/types';

interface TimeSlotPickerProps {
  timeSlots: TimeSlot[];
  selectedSlot?: TimeSlot;
  onSlotSelect: (slot: TimeSlot) => void;
  loading?: boolean;
  className?: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  timeSlots,
  selectedSlot,
  onSlotSelect,
  loading = false,
  className = '',
}) => {
  const formatTime = (timeString: string) => {
    const time = timeString.split(':');
    const hour = parseInt(time[0]);
    const minute = time[1];
    
    if (hour === 0) return `12:${minute} AM`;
    if (hour < 12) return `${hour}:${minute} AM`;
    if (hour === 12) return `12:${minute} PM`;
    return `${hour - 12}:${minute} PM`;
  };

  const getTimeSlotLabel = (slot: TimeSlot) => {
    return `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
  };

  const isSlotSelected = (slot: TimeSlot) => {
    return selectedSlot?.id === slot.id;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h4 className="text-lg font-semibold text-gray-900">시간 선택</h4>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-2 text-sm">시간 슬롯을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h4 className="text-lg font-semibold text-gray-900">시간 선택</h4>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">선택하신 날짜에 예약 가능한 시간이 없습니다.</p>
          <p className="text-xs mt-1">다른 날짜를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  // Group time slots by morning/afternoon/evening
  const groupedSlots = timeSlots.reduce((groups, slot) => {
    const hour = parseInt(slot.start_time.split(':')[0]);
    
    let period: string;
    if (hour < 12) {
      period = '오전';
    } else if (hour < 18) {
      period = '오후';
    } else {
      period = '저녁';
    }

    if (!groups[period]) {
      groups[period] = [];
    }
    groups[period].push(slot);
    return groups;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-lg font-semibold text-gray-900">시간 선택</h4>
      
      <div className="space-y-4">
        {Object.entries(groupedSlots).map(([period, slots]) => (
          <div key={period}>
            <h5 className="text-sm font-medium text-gray-700 mb-2">{period}</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => onSlotSelect(slot)}
                  disabled={!slot.is_available || slot.is_booked}
                  className={`
                    px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${
                      !slot.is_available || slot.is_booked
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isSlotSelected(slot)
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-primary-50 hover:border-primary-300'
                    }
                  `}
                >
                  <div className="text-center">
                    <div>{getTimeSlotLabel(slot)}</div>
                    {(!slot.is_available || slot.is_booked) && (
                      <div className="text-xs mt-1">
                        {slot.is_booked ? '예약됨' : '불가'}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && (
        <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-md">
          <p className="text-sm text-primary-800">
            <strong>선택된 시간:</strong> {getTimeSlotLabel(selectedSlot)}
          </p>
        </div>
      )}
    </div>
  );
};