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
  getMaterials: (params) => instance.get(ENDPOINTS.ACADEMICS.MATERIALS, { params }),
  createMaterial: (formData) => instance.post(ENDPOINTS.ACADEMICS.MATERIALS, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMaterial: (id) => instance.delete(`${ENDPOINTS.ACADEMICS.MATERIALS}${id}/`),
  getAllocations: () => instance.get('/academics/allocations/'),
};


export default staffApi;
