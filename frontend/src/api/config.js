/**
 * API configuration and constants.
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 15000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/accounts/login/',
    LOGOUT: '/accounts/logout/',
    PROFILE: '/accounts/me/',
    ONBOARD_SCHOOL: '/accounts/onboard-school/',
  },
  SCHOOL: {
    CONFIG: '/school/config/',
  },
  STUDENTS: {
    LIST: '/students/',
    DETAIL: (id) => `/students/${id}/`,
  },
  ACADEMICS: {
    CLASSES: '/academics/classes/',
    ASSIGNMENTS: '/academics/assignments/',
    MATERIALS: '/academics/materials/',
  },
  ATTENDANCE: {
    MARK: '/attendance/mark/',
    REPORT: '/attendance/report/',
  },
};
