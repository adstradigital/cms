import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * Admin-related API calls.
 */
const adminApi = {
  getStats: () => instance.get('/admin/stats/'),
  getUsers: (params) => instance.get('/accounts/users/', { params }),
  getStudents: (params) => instance.get(ENDPOINTS.STUDENTS.LIST, { params }),
  getStudentDetail: (id) => instance.get(ENDPOINTS.STUDENTS.DETAIL(id)),
  createStudent: (data) => instance.post(ENDPOINTS.STUDENTS.LIST, data),
  updateStudent: (id, data) => instance.patch(ENDPOINTS.STUDENTS.DETAIL(id), data),
  getAttendanceReport: () => instance.get(ENDPOINTS.ATTENDANCE.REPORT),
  // Attendance (new API)
  getAttendance: (params) => instance.get('/attendance/attendance/', { params }),
  bulkMarkAttendance: (data) => instance.post('/attendance/attendance/bulk-mark/', data),
  getAttendanceOverview: (params) => instance.get('/attendance/admin/overview/', { params }),
  getStudentAttendanceDetail: (studentId, params) => instance.get(`/attendance/admin/student/${studentId}/`, { params }),
  // Academics - Subjects & Syllabus
  getSubjects: (params) => instance.get('/academics/subjects/', { params }),
  createSubject: (data) => instance.post('/academics/subjects/', data),
  getSyllabusUnits: (params) => instance.get('/academics/syllabus/units/', { params }),
  createSyllabusUnit: (data) => instance.post('/academics/syllabus/units/', data),
  updateSyllabusUnit: (id, data) => instance.patch(`/academics/syllabus/units/${id}/`, data),
  deleteSyllabusUnit: (id) => instance.delete(`/academics/syllabus/units/${id}/`),
  
  getSyllabusChapters: (params) => instance.get('/academics/syllabus/chapters/', { params }),
  createSyllabusChapter: (data) => instance.post('/academics/syllabus/chapters/', data),
  updateSyllabusChapter: (id, data) => instance.patch(`/academics/syllabus/chapters/${id}/`, data),
  deleteSyllabusChapter: (id) => instance.delete(`/academics/syllabus/chapters/${id}/`),
  
  getSyllabusTopics: (params) => instance.get('/academics/syllabus/topics/', { params }),
  createSyllabusTopic: (data) => instance.post('/academics/syllabus/topics/', data),
  updateSyllabusTopic: (id, data) => instance.patch(`/academics/syllabus/topics/${id}/`, data),
  deleteSyllabusTopic: (id) => instance.delete(`/academics/syllabus/topics/${id}/`),
  
  // Academics - Allocations (Subject to Section/Teacher)
  getAllocations: (params) => instance.get('/academics/allocations/', { params }),
  createAllocation: (data) => instance.post('/academics/allocations/', data),
  updateAllocation: (id, data) => instance.patch(`/academics/allocations/${id}/`, data),
  deleteAllocation: (id) => instance.delete(`/academics/allocations/${id}/`),
  
  // Academics - Lesson Planning
  getLessonPlans: (params) => instance.get('/academics/lesson-plans/', { params }),
  saveLessonPlan: (data) => instance.post('/academics/lesson-plans/', data),
  deleteLessonPlan: (id) => instance.delete(`/academics/lesson-plans/${id}/`),

  // Academics - Assignments
  getAssignments: (params) => instance.get(ENDPOINTS.ACADEMICS.ASSIGNMENTS, { params }),
  createAssignment: (data) => instance.post(ENDPOINTS.ACADEMICS.ASSIGNMENTS, data),
  updateAssignment: (id, data) => instance.patch(`${ENDPOINTS.ACADEMICS.ASSIGNMENTS}${id}/`, data),
  deleteAssignment: (id) => instance.delete(`${ENDPOINTS.ACADEMICS.ASSIGNMENTS}${id}/`),

  // Academics - Materials
  getMaterials: (params) => instance.get(ENDPOINTS.ACADEMICS.MATERIALS, { params }),
  createMaterial: (data) => instance.post(ENDPOINTS.ACADEMICS.MATERIALS, data),
  updateMaterial: (id, data) => instance.patch(`${ENDPOINTS.ACADEMICS.MATERIALS}${id}/`, data),
  deleteMaterial: (id) => instance.delete(`${ENDPOINTS.ACADEMICS.MATERIALS}${id}/`),

  // Classes & Students
  getClasses: () => instance.get('/students/classes/'),
  createClass: (data) => instance.post('/students/classes/', data),
  updateClass: (id, data) => instance.patch(`/students/classes/${id}/`, data),
  deleteClass: (id) => instance.delete(`/students/classes/${id}/`),

  getSections: (params) => instance.get('/students/sections/', { params }),
  createSection: (data) => instance.post('/students/sections/', data),
  updateSection: (id, data) => instance.patch(`/students/sections/${id}/`, data),
  deleteSection: (id) => instance.delete(`/students/sections/${id}/`),

  getLeaderboard: (params) => instance.get('/students/students/leaderboard/', { params }),

  // Staff Management
  getStaff: (params) => instance.get('/staff/', { params }),
  createStaff: (data) => instance.post('/staff/', data),
  updateStaff: (id, data) => instance.patch(`/staff/${id}/`, data),
  resetStaffCredentials: (id) => instance.post(`/staff/${id}/reset-credentials/`),
  getTeachers: (params) => instance.get('/staff/teachers/', { params }),
  getStaffDetail: (id) => instance.get(`/staff/${id}/`),
  getAcademicYears: (params) => instance.get('/accounts/academic-years/', { params }),

  // Exams / Marks
  getExams: (params) => instance.get('/exams/exams/', { params }),
  createExam: (data) => instance.post('/exams/exams/', data),
  updateExam: (id, data) => instance.patch(`/exams/exams/${id}/`, data),
  deleteExam: (id) => instance.delete(`/exams/exams/${id}/`),
  publishExam: (id) => instance.post(`/exams/exams/${id}/publish/`),
  calculateExamStats: (id) => instance.post(`/exams/exams/${id}/calculate-stats/`),
  getExamSchedules: (examId) => instance.get(`/exams/exams/${examId}/schedules/`),
  createExamSchedule: (examId, data) => instance.post(`/exams/exams/${examId}/schedules/`, data),
  getExamResults: (params) => instance.get('/exams/results/', { params }),
  bulkSaveExamResults: (records) => instance.post('/exams/results/bulk/', { records }),
  getReportCards: (params) => instance.get('/exams/report-cards/', { params }),

  // Notice Board / Events (Notifications)
  getNotifications: (params) => instance.get('/notifications/', { params }),
  createNotification: (data) => instance.post('/notifications/', data),
  updateNotification: (id, data) => instance.patch(`/notifications/${id}/`, data),
  deleteNotification: (id) => instance.delete(`/notifications/${id}/`),
  publishNotification: (id) => instance.post(`/notifications/${id}/publish/`),

  // Fees
  getFeeSectionOverview: (params) => instance.get('/fees/section-overview/', { params }),
  getStudentFeeStatement: (studentId, params) => instance.get(`/fees/students/${studentId}/statement/`, { params }),
  getFeeDefaulters: (params) => instance.get('/fees/defaulters/', { params }),

  // Roles & Permissions (roles_v2)
  getRolesV2: () => instance.get('/permissions/roles/'),
  createRoleV2: (data) => instance.post('/permissions/roles/', data),
  updateRoleV2: (id, data) => instance.patch(`/permissions/roles/${id}/`, data),
  deleteRoleV2: (id) => instance.delete(`/permissions/roles/${id}/`),
  getPermissions: () => instance.get('/permissions/permissions/'),
};

export default adminApi;
