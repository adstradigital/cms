import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * Staff-related API calls.
 */
const staffApi = {
  getStats: () => instance.get('/staff/stats/'),
  markAttendance: (data) => instance.post(ENDPOINTS.ATTENDANCE.MARK, data),
  getExams: () => instance.get('/staff/exams/'),
  getAssignments: () => instance.get('/staff/assignments/'),
};

export default staffApi;
