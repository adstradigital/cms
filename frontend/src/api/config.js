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
    TERMS: '/accounts/terms/',
    TERM_DETAIL: (id) => `/accounts/terms/${id}/`,
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
  ALUMNI: {
    LIST: '/alumni/alumni/',
    DETAIL: (id) => `/alumni/alumni/${id}/`,
    DASHBOARD: '/alumni/alumni/dashboard/',
    IMPORT: '/alumni/alumni/import/',
    EXPORT: '/alumni/alumni/export/',
    REPORTS: '/alumni/alumni/reports/',

    EVENTS: '/alumni/events/',
    EVENT_DETAIL: (id) => `/alumni/events/${id}/`,
    EVENT_RSVPS: (id) => `/alumni/events/${id}/rsvps/`,
    EVENT_RSVPS_LIST: '/alumni/event-rsvps/',

    COMMUNICATIONS: '/alumni/communications/',
    COMMUNICATION_DETAIL: (id) => `/alumni/communications/${id}/`,
    COMMUNICATION_SEND: (id) => `/alumni/communications/${id}/send/`,

    CONTRIBUTIONS: '/alumni/contributions/',
    CONTRIBUTION_DETAIL: (id) => `/alumni/contributions/${id}/`,

    ACHIEVEMENTS: '/alumni/achievements/',
    ACHIEVEMENT_DETAIL: (id) => `/alumni/achievements/${id}/`,
  },
};
