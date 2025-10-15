import apiClient from './client';
import { ChatSession, Message } from '@/types';

export interface ChatSessionsQuery {
  skip?: number;
  limit?: number;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
}

export interface BookSessionRequest {
  counselor_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  concern_category?: string;
  description?: string;
  time_slot_id?: string;
}

export interface MessageCreate {
  content: string;
}

// Chat API calls
export const chatApi = {
  // Get user's chat sessions
  getMyChatSessions: async (params: ChatSessionsQuery = {}): Promise<ChatSession[]> => {
    const response = await apiClient.get('/chat/sessions/me', { params });
    return response.data;
  },

  // Book a new chat session
  bookChatSession: async (data: BookSessionRequest): Promise<{
    session_id: string;
    status: string;
    message: string;
  }> => {
    const response = await apiClient.post('/chat/sessions/book', data);
    return response.data;
  },

  // Get chat session details
  getChatSession: async (sessionId: string): Promise<ChatSession> => {
    const response = await apiClient.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  // Cancel chat session
  cancelChatSession: async (sessionId: string, cancelReason?: string): Promise<{
    message: string;
  }> => {
    const params = cancelReason ? { cancel_reason: cancelReason } : {};
    const response = await apiClient.post(`/chat/sessions/${sessionId}/cancel`, null, {
      params,
    });
    return response.data;
  },

  // Get chat messages
  getChatMessages: async (sessionId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },

  // Send chat message
  sendChatMessage: async (sessionId: string, data: MessageCreate): Promise<Message> => {
    const response = await apiClient.post(`/chat/sessions/${sessionId}/messages`, data);
    return response.data;
  },
};