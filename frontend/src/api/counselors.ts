import apiClient from './client';
import { Counselor } from '@/types';

export interface CounselorsQuery {
  skip?: number;
  limit?: number;
  specialty?: string;
  is_available?: boolean;
}

export interface TimeSlot {
  id: string;
  counselor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
}

export interface CounselorScheduleQuery {
  counselor_id: string;
  start_date?: string;
  end_date?: string;
}

// Counselors API calls
export const counselorsApi = {
  // Get all counselors
  getCounselors: async (params: CounselorsQuery = {}): Promise<Counselor[]> => {
    const response = await apiClient.get('/counselors/', { params });
    return response.data;
  },

  // Get counselor by ID
  getCounselor: async (counselorId: string): Promise<Counselor> => {
    const response = await apiClient.get(`/counselors/${counselorId}`);
    return response.data;
  },

  // Get counselor's available time slots
  getCounselorTimeSlots: async (params: CounselorScheduleQuery): Promise<TimeSlot[]> => {
    const { counselor_id, ...queryParams } = params;
    const response = await apiClient.get(`/counselors/${counselor_id}/time-slots`, {
      params: queryParams,
    });
    return response.data;
  },

  // Search counselors by specialty or name
  searchCounselors: async (query: string): Promise<Counselor[]> => {
    const response = await apiClient.get('/counselors/search', {
      params: { q: query }
    });
    return response.data;
  },
};