// API Configuration
export const API_BASE_URL = '/api/v1';

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'onmaum_access_token',
  REFRESH_TOKEN: 'onmaum_refresh_token',
  USER_DATA: 'onmaum_user_data',
} as const;

// Route Constants
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
  EMPATHY_NOTES: '/empathy-notes',
  COMMA_NOTES: '/comma-notes',
  CHAT: '/chat',
  DIARY: '/diary',
  COUNSELORS: '/counselors',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
} as const;

// Post Categories
export const POST_CATEGORIES = [
  'Daily',
  'Academic Stress',
  'Relationships',
  'Family',
  'Career',
  'Mental Health',
  'Other',
] as const;

// Moods for Diary
export const MOODS = [
  { value: 'happy', label: '😊 행복', color: 'text-yellow-500' },
  { value: 'sad', label: '😢 슬픔', color: 'text-blue-500' },
  { value: 'angry', label: '😠 화남', color: 'text-red-500' },
  { value: 'anxious', label: '😰 불안', color: 'text-orange-500' },
  { value: 'calm', label: '😌 평온', color: 'text-green-500' },
  { value: 'excited', label: '🤩 신남', color: 'text-purple-500' },
  { value: 'tired', label: '😴 피곤', color: 'text-gray-500' },
] as const;

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'other', label: '기타' },
] as const;

// Birth Year Range (for teenagers)
export const BIRTH_YEAR_RANGE = {
  MIN: 2005, // 19세
  MAX: 2011, // 13세
} as const;