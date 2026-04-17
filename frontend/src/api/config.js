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
    PROFILE_DETAILS: '/accounts/me/profile/',
    CHANGE_PASSWORD: '/accounts/change-password/',
  },
  SCHOOL: {
    CONFIG: '/accounts/school-config/',
    LIST: '/accounts/schools/',
    DETAIL: (id) => `/accounts/schools/${id}/`,
    YEARS: '/accounts/academic-years/',
    YEAR_DETAIL: (id) => `/accounts/academic-years/${id}/`,
  },
  STUDENTS: {
    LIST: '/students/students/',
    DETAIL: (id) => `/students/students/${id}/`,
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
