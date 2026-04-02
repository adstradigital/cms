import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * Admin-related API calls.
 */
const adminApi = {
  getStats: () => instance.get('/admin/stats/'),
  getStudents: () => instance.get(ENDPOINTS.STUDENTS.LIST),
  getStudentDetail: (id) => instance.get(ENDPOINTS.STUDENTS.DETAIL(id)),
  createStudent: (data) => instance.post(ENDPOINTS.STUDENTS.LIST, data),
  getAttendanceReport: () => instance.get(ENDPOINTS.ATTENDANCE.REPORT),
};

export default adminApi;
