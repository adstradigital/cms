import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * School-related API calls.
 */
const schoolApi = {
  getConfig: () => instance.get(ENDPOINTS.SCHOOL.CONFIG),
  getSchools: () => instance.get(ENDPOINTS.SCHOOL.LIST),
  updateSchool: (id, data) => instance.patch(ENDPOINTS.SCHOOL.DETAIL(id), data),
  getAcademicYears: () => instance.get(ENDPOINTS.SCHOOL.YEARS),
};

export default schoolApi;
