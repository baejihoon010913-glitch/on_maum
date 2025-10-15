import apiClient from './client';
import { Post, PostCreate, PaginatedResponse } from '@/types';

export interface PostsQuery {
  skip?: number;
  limit?: number;
  category?: string;
}

export interface SearchPostsQuery {
  q: string;
  skip?: number;
  limit?: number;
  sort_by?: 'relevance' | 'latest' | 'empathy_count';
}

// Posts API calls
export const postsApi = {
  // Get posts list
  getPosts: async (params: PostsQuery = {}): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get('/posts', { params });
    return response.data;
  },

  // Create new post
  createPost: async (data: PostCreate): Promise<Post> => {
    const response = await apiClient.post('/posts', data);
    return response.data;
  },

  // Get user's posts
  getMyPosts: async (params: Omit<PostsQuery, 'category'> = {}): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get('/posts/my', { params });
    return response.data;
  },

  // Get post details
  getPost: async (postId: string): Promise<Post> => {
    const response = await apiClient.get(`/posts/${postId}`);
    return response.data;
  },

  // Update post
  updatePost: async (postId: string, data: Partial<PostCreate>): Promise<Post> => {
    const response = await apiClient.put(`/posts/${postId}`, data);
    return response.data;
  },

  // Delete post
  deletePost: async (postId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/posts/${postId}`);
    return response.data;
  },

  // Toggle empathy
  toggleEmpathy: async (postId: string): Promise<{
    empathized: boolean;
    empathy_count: number;
    message: string;
  }> => {
    const response = await apiClient.post(`/posts/${postId}/empathy`);
    return response.data;
  },

  // Add emoji reaction
  addEmojiReaction: async (postId: string, emoji: string): Promise<{
    reaction_id: string;
    message: string;
  }> => {
    const response = await apiClient.post(`/posts/${postId}/emoji-reaction`, null, {
      params: { emoji },
    });
    return response.data;
  },

  // Remove emoji reaction
  removeEmojiReaction: async (postId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/posts/${postId}/emoji-reaction`);
    return response.data;
  },

  // Search posts
  searchPosts: async (params: SearchPostsQuery): Promise<PaginatedResponse<Post> & {
    query: string;
    search_time: number;
  }> => {
    const response = await apiClient.get('/posts/search', { params });
    return response.data;
  },

  // Report post
  reportPost: async (postId: string, data: {
    reason: string;
    description: string;
    details?: string;
  }): Promise<{
    report_id: string;
    message: string;
    report_number: string;
    submitted_at: string;
  }> => {
    const response = await apiClient.post(`/posts/${postId}/report`, data);
    return response.data;
  },
};