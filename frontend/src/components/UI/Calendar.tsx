import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface CalendarProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  disabledDates = [],
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth()) : new Date()
  );

  const today = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startOfWeek = new Date(startOfMonth);
  startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay());
  const endOfWeek = new Date(endOfMonth);
  endOfWeek.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay()));

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some(
      (disabledDate) =>
        date.getFullYear() === disabledDate.getFullYear() &&
        date.getMonth() === disabledDate.getMonth() &&
        date.getDate() === disabledDate.getDate()
    );
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const isToday = (date: Date) => {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const generateCalendarDays = () => {
    const days = [];
    const currentDate = new Date(startOfWeek);

    while (currentDate <= endOfWeek) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          className="p-2"
        >
          ←
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="p-2"
        >
          →
        </Button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const todayDate = isToday(date);

          return (
            <button
              key={index}
              onClick={() => !disabled && isCurrentMonth && onDateSelect(date)}
              disabled={disabled || !isCurrentMonth}
              className={`
                h-10 text-sm rounded-md transition-colors duration-200
                ${
                  !isCurrentMonth
                    ? 'text-gray-300 cursor-not-allowed'
                    : disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : selected
                    ? 'bg-primary-600 text-white font-semibold'
                    : todayDate
                    ? 'bg-primary-100 text-primary-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};