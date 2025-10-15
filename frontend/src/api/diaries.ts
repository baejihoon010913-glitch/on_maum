import apiClient from './client';
import { Diary, DiaryCreate, PaginatedResponse } from '@/types';

export interface DiariesQuery {
  skip?: number;
  limit?: number;
  mood?: string;
}

export interface DiaryStatistics {
  year: number;
  month: number;
  total_entries: number;
  mood_distribution: Record<string, number>;
  most_active_day: string | null;
  writing_streak: number;
  average_length: number;
}

// Diaries API calls
export const diariesApi = {
  // Get diary entries
  getDiaries: async (params: DiariesQuery & { year?: number; month?: number } = {}): Promise<PaginatedResponse<Diary>> => {
    const response = await apiClient.get('/diaries', { params });
    return response.data;
  },

  // Create new diary entry
  createDiary: async (data: DiaryCreate): Promise<Diary> => {
    const response = await apiClient.post('/diaries', data);
    return response.data;
  },

  // Get diary statistics
  getDiaryStatistics: async (params: {
    year?: number;
    month?: number;
  } = {}): Promise<DiaryStatistics> => {
    const response = await apiClient.get('/diaries/statistics', { params });
    return response.data;
  },

  // Get diary details
  getDiary: async (diaryId: string): Promise<Diary> => {
    const response = await apiClient.get(`/diaries/${diaryId}`);
    return response.data;
  },

  // Update diary entry
  updateDiary: async (diaryId: string, data: Partial<DiaryCreate>): Promise<Diary> => {
    const response = await apiClient.put(`/diaries/${diaryId}`, data);
    return response.data;
  },

  // Delete diary entry
  deleteDiary: async (diaryId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/diaries/${diaryId}`);
    return response.data;
  },

  // Get similar mood diaries
  getSimilarMoodDiaries: async (diaryId: string, limit: number = 5): Promise<Array<{
    id: string;
    title: string;
    created_at: string;
    mood: string;
  }>> => {
    const response = await apiClient.get(`/diaries/${diaryId}/similar`, {
      params: { limit },
    });
    return response.data;
  },
};