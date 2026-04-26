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
  sendAttendanceWarning: (data) => instance.post('/attendance/admin/warning/', data),
  // Academics - Subjects & Syllabus
  getSubjects: (params) => instance.get('/academics/subjects/', { params }),
  createSubject: (data) => instance.post('/academics/subjects/', data),
  deleteSubject: (id) => instance.delete(`/academics/subjects/${id}/`),
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
  getExams: (params) => instance.get('/exams/', { params }),
  createExam: (data) => instance.post('/exams/', data),
  updateExam: (id, data) => instance.patch(`/exams/${id}/`, data),
  deleteExam: (id) => instance.delete(`/exams/${id}/`),
  publishExam: (id) => instance.post(`/exams/${id}/publish/`),
  calculateExamStats: (id) => instance.post(`/exams/${id}/calculate-stats/`),
  getExamSchedules: (examId) => 
    examId ? instance.get(`/exams/${examId}/schedules/`) : instance.get('/exams/schedules/'),
  createExamSchedule: (examId, data) => instance.post(`/exams/${examId}/schedules/`, data),
  updateExamSchedule: (id, data) => instance.patch(`/exams/schedules/${id}/`, data),
  deleteExamSchedule: (id) => instance.delete(`/exams/schedules/${id}/`),
  getExamResults: (params) => instance.get('/exams/results/', { params }),
  bulkSaveExamResults: (records) => instance.post('/exams/results/bulk/', { records }),
  getReportCards: (params) => instance.get('/exams/report-cards/', { params }),
  getReportTemplates: (params) => instance.get('/exams/report-templates/', { params }),
  createReportTemplate: (data) => instance.post('/exams/report-templates/', data),
  getExamTypes: (params) => instance.get('/exams/types/', { params }),
  createExamType: (data) => instance.post('/exams/types/', data),
  updateExamType: (id, data) => instance.patch(`/exams/types/${id}/`, data),
  deleteExamType: (id) => instance.delete(`/exams/types/${id}/`),
  getQuestionBank: (params) => instance.get('/exams/question-bank/', { params }),
  createQuestion: (data) => instance.post('/exams/question-bank/', data),
  deleteQuestion: (id) => instance.delete(`/exams/question-bank/${id}/`),
  bulkDeleteQuestions: (data) => instance.post('/exams/question-bank/bulk-delete/', data),
  getQuestionPapers: (params) => instance.get('/exams/question-papers/', { params }),
  createQuestionPaper: (data) => instance.post('/exams/question-papers/', data),
  getQuestionPaperDetail: (id) => instance.get(`/exams/question-papers/${id}/`),
  updateQuestionPaper: (id, data) => instance.patch(`/exams/question-papers/${id}/`, data),
  deleteQuestionPaper: (id) => instance.delete(`/exams/question-papers/${id}/`),
  getExamAnalytics: (params) => instance.get('/exams/analytics/', { params }),
  getPerformanceSummary: (params) => instance.get('/exams/performance-summary/', { params }),
  // Timetable
  generateAiTimetable: (data) => instance.post('/ai-brain/timetable/generate/', data),
  validateAiTimetable: (data) => instance.post('/ai-brain/timetable/validate/', data),
  applyAiTimetableDraft: (draftId, data) => instance.post(`/ai-brain/timetable/drafts/${draftId}/apply/`, data),
  rollbackAiTimetableDraft: (draftId) => instance.post(`/ai-brain/timetable/drafts/${draftId}/rollback/`),

  // Report Cards
  generateAiReportCardsForSection: (data) => instance.post('/ai-brain/report-card/generate-class/', data),
  generateAiReportCardForStudent: (data) => instance.post('/ai-brain/report-card/generate/', data),

  // At-Risk
  detectAtRiskStudents: (data) => instance.post('/ai-brain/students/at-risk/', data),
  runSchoolAtRiskSweep: (data) => instance.post('/ai-brain/students/at-risk/sweep/', data),
  getAtRiskRecords: (params) => instance.get('/ai-brain/at-risk/records/', { params }),
  resolveAtRiskRecord: (recordId) => instance.post(`/ai-brain/at-risk/records/${recordId}/resolve/`),

  // Audit & Task Logs
  getAiBrainAuditLog: (params) => instance.get('/ai-brain/audit-log/', { params }),
  getAiTaskLogs: (params) => instance.get('/ai-brain/tasks/', { params }),
  getAiTaskStatus: (taskId) => instance.get(`/ai-brain/tasks/${taskId}/status/`),
  triggerAiTask: (data) => instance.post('/ai-brain/tasks/trigger/', data),

  // Notice Board / Events (Notifications)
  getNotifications: (params) => instance.get('/notifications/', { params }),
  createNotification: (data) => instance.post('/notifications/', data),
  updateNotification: (id, data) => instance.patch(`/notifications/${id}/`, data),
  deleteNotification: (id) => instance.delete(`/notifications/${id}/`),
  publishNotification: (id) => instance.post(`/notifications/${id}/publish/`),

  // ─── Fees ─────────────────────────────────────────────────────────────────
  // Fee Categories (Fee Heads)
  getFeeCategories: (params) => instance.get('/fees/categories/', { params }),
  createFeeCategory: (data) => instance.post('/fees/categories/', data),
  updateFeeCategory: (id, data) => instance.patch(`/fees/categories/${id}/`, data),
  deleteFeeCategory: (id) => instance.delete(`/fees/categories/${id}/`),

  // Fee Structures
  getFeeStructures: (params) => instance.get('/fees/structures/', { params }),
  createFeeStructure: (data) => instance.post('/fees/structures/', data),
  updateFeeStructure: (id, data) => instance.patch(`/fees/structures/${id}/`, data),
  deleteFeeStructure: (id) => instance.delete(`/fees/structures/${id}/`),
  copyFeeStructure: (data) => instance.post('/fees/structures/copy/', data),

  // Fee Instalments
  getFeeInstalments: (params) => instance.get('/fees/instalments/', { params }),
  createFeeInstalment: (data) => instance.post('/fees/instalments/', data),
  updateFeeInstalment: (id, data) => instance.patch(`/fees/instalments/${id}/`, data),
  deleteFeeInstalment: (id) => instance.delete(`/fees/instalments/${id}/`),

  // Concessions
  getConcessions: (params) => instance.get('/fees/concessions/', { params }),
  createConcession: (data) => instance.post('/fees/concessions/', data),
  updateConcession: (id, data) => instance.patch(`/fees/concessions/${id}/`, data),
  deleteConcession: (id) => instance.delete(`/fees/concessions/${id}/`),
  getStudentConcessions: (params) => instance.get('/fees/student-concessions/', { params }),
  assignStudentConcession: (data) => instance.post('/fees/student-concessions/', data),
  revokeStudentConcession: (id) => instance.delete(`/fees/student-concessions/${id}/`),

  // Fee Payments & Receipts
  getFeePayments: (params) => instance.get('/fees/payments/', { params }),
  createFeePayment: (data) => instance.post('/fees/payments/', data),
  updateFeePayment: (id, data) => instance.patch(`/fees/payments/${id}/`, data),

  // Reports & Tracking
  getFeeSectionOverview: (params) => instance.get('/fees/section-overview/', { params }),
  getStudentFeeStatement: (studentId, params) => instance.get(`/fees/students/${studentId}/statement/`, { params }),
  getFeeDefaulters: (params) => instance.get('/fees/defaulters/', { params }),

  // Roles & Permissions (roles_v2)
  getRolesV2: () => instance.get('/permissions/roles/'),
  createRoleV2: (data) => instance.post('/permissions/roles/', data),
  updateRoleV2: (id, data) => instance.patch(`/permissions/roles/${id}/`, data),
  deleteRoleV2: (id) => instance.delete(`/permissions/roles/${id}/`),
  getPermissions: () => instance.get('/permissions/permissions/'),
  getUserPermissions: (userId) => instance.get(`/permissions/users/${userId}/permissions/`),
  updateUserPermissions: (userId, data) => instance.patch(`/permissions/users/${userId}/permissions/`, data),
  getUserEffectivePermissions: (userId) => instance.get(`/permissions/users/${userId}/effective/`),
  getPermissionChangelog: (params) => instance.get('/permissions/changelog/', { params }),
  getPermStaffUsers: (params) => instance.get('/permissions/staff-users/', { params }),

  // Phase 2: Staff HR
  getStaffAttendance: (params) => instance.get('/staff/attendance/', { params }),
  clockInStaff: () => instance.post('/staff/attendance/', { action: 'clock_in' }),
  clockOutStaff: () => instance.post('/staff/attendance/', { action: 'clock_out' }),
  getStaffLeaves: (params) => instance.get('/staff/leaves/', { params }),
  applyStaffLeave: (data) => instance.post('/staff/leaves/', data),
  updateStaffLeave: (id, data) => instance.patch(`/staff/leaves/${id}/`, data),
  
  // Leaderboard & Tasks
  getTeacherLeaderboard: (params) => instance.get('/staff/leaderboard/', { params }),
  getStaffTasks: (params) => instance.get('/staff/tasks/', { params }),
  createStaffTask: (data) => instance.post('/staff/tasks/', data),
  updateStaffTask: (id, data) => instance.patch(`/staff/tasks/${id}/`, data),

  // Events & Clubs
  getEvents: (params) => instance.get('/events/events/', { params }),
  createEvent: (data) => instance.post('/events/events/', data),
  updateEvent: (id, data) => instance.patch(`/events/events/${id}/`, data),
  deleteEvent: (id) => instance.delete(`/events/events/${id}/`),
  
  getClubs: (params) => instance.get('/events/clubs/', { params }),
  createClub: (data) => instance.post('/events/clubs/', data),
  updateClub: (id, data) => instance.patch(`/events/clubs/${id}/`, data),

  // ─── Online Tests v2 ─────────────────────────────────────────────
  getOnlineTests: (params) => instance.get('/exams/online-tests/', { params }),
  createOnlineTest: (data) => instance.post('/exams/online-tests/', data),
  getOnlineTest: (id) => instance.get(`/exams/online-tests/${id}/`),
  updateOnlineTest: (id, data) => instance.patch(`/exams/online-tests/${id}/`, data),
  deleteOnlineTest: (id) => instance.delete(`/exams/online-tests/${id}/`),
  publishOnlineTest: (id) => instance.post(`/exams/online-tests/${id}/publish/`),

  // Questions
  getTestQuestions: (testId) => instance.get(`/exams/online-tests/${testId}/questions/`),
  createTestQuestion: (testId, data) => instance.post(`/exams/online-tests/${testId}/questions/`, data),
  updateTestQuestion: (id, data) => instance.patch(`/exams/online-tests/questions/${id}/`, data),
  deleteTestQuestion: (id) => instance.delete(`/exams/online-tests/questions/${id}/`),

  // Attempts
  startTestAttempt: (testId) => instance.post(`/exams/online-tests/${testId}/attempt/`),
  submitTestAttempt: (attemptId, data) => instance.post(`/exams/online-tests/attempts/${attemptId}/submit/`, data),
  getTestAttempt: (attemptId) => instance.get(`/exams/online-tests/attempts/${attemptId}/`),
  getTestSubmissions: (testId, params) => instance.get(`/exams/online-tests/${testId}/submissions/`, { params }),

  // Grading
  gradeTestAnswer: (answerId, data) => instance.patch(`/exams/online-tests/answers/${answerId}/grade/`, data),
  publishTestResult: (attemptId) => instance.post(`/exams/online-tests/attempts/${attemptId}/publish/`),

  // ─── Expenses ─────────────────────────────────────────────────────────────
  getExpenseCategories: (params) => instance.get('/expenses/categories/', { params }),
  createExpenseCategory: (data) => instance.post('/expenses/categories/', data),
  updateExpenseCategory: (id, data) => instance.patch(`/expenses/categories/${id}/`, data),
  deleteExpenseCategory: (id) => instance.delete(`/expenses/categories/${id}/`),
  getExpenseEntries: (params) => instance.get('/expenses/entries/', { params }),
  createExpenseEntry: (data) => instance.post('/expenses/entries/', data),
  updateExpenseEntry: (id, data) => instance.patch(`/expenses/entries/${id}/`, data),
  deleteExpenseEntry: (id) => instance.delete(`/expenses/entries/${id}/`),
  approveExpense: (id, data) => instance.post(`/expenses/entries/${id}/approve/`, data),

  // ─── Payroll ──────────────────────────────────────────────────────────────
  getSalaryStructures: (params) => instance.get('/payroll/salary-structures/', { params }),
  createSalaryStructure: (data) => instance.post('/payroll/salary-structures/', data),
  updateSalaryStructure: (id, data) => instance.patch(`/payroll/salary-structures/${id}/`, data),
  deleteSalaryStructure: (id) => instance.delete(`/payroll/salary-structures/${id}/`),
  getDeductionTypes: (params) => instance.get('/payroll/deductions/', { params }),
  createDeductionType: (data) => instance.post('/payroll/deductions/', data),
  updateDeductionType: (id, data) => instance.patch(`/payroll/deductions/${id}/`, data),
  deleteDeductionType: (id) => instance.delete(`/payroll/deductions/${id}/`),
  getPayrollRuns: (params) => instance.get('/payroll/runs/', { params }),
  createPayrollRun: (data) => instance.post('/payroll/runs/', data),
  getPayrollRun: (id) => instance.get(`/payroll/runs/${id}/`),
  processPayrollRun: (id) => instance.post(`/payroll/runs/${id}/process/`),
  updatePayrollEntry: (id, data) => instance.patch(`/payroll/entries/${id}/`, data),
  getPayrollEntry: (id) => instance.get(`/payroll/entries/${id}/`),

  // ─── Budget ───────────────────────────────────────────────────────────────
  getDonations: (params) => instance.get('/fees/donations/', { params }),
  createDonation: (data) => instance.post('/fees/donations/', data),
  updateDonation: (id, data) => instance.patch(`/fees/donations/${id}/`, data),
  deleteDonation: (id) => instance.delete(`/fees/donations/${id}/`),
  getAnnualBudgets: (params) => instance.get('/fees/budgets/', { params }),
  createAnnualBudget: (data) => instance.post('/fees/budgets/', data),
  updateAnnualBudget: (id, data) => instance.patch(`/fees/budgets/${id}/`, data),
  getBudgetItems: (budgetId) => instance.get(`/fees/budgets/${budgetId}/items/`),
  createBudgetItem: (data) => instance.post('/fees/budget-items/', data),
  updateBudgetItem: (id, data) => instance.patch(`/fees/budget-items/${id}/`, data),
  deleteBudgetItem: (id) => instance.delete(`/fees/budget-items/${id}/`),
};

export default adminApi;
