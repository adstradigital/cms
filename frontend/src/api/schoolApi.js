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
  createAcademicYear: (data) => instance.post(ENDPOINTS.SCHOOL.YEARS, data),
  updateAcademicYear: (id, data) => instance.patch(ENDPOINTS.SCHOOL.YEAR_DETAIL(id), data),
  deleteAcademicYear: (id) => instance.delete(ENDPOINTS.SCHOOL.YEAR_DETAIL(id)),
  getTerms: (academicYearId) => instance.get(ENDPOINTS.SCHOOL.TERMS, { params: { academic_year: academicYearId } }),
  createTerm: (data) => instance.post(ENDPOINTS.SCHOOL.TERMS, data),
  updateTerm: (id, data) => instance.patch(ENDPOINTS.SCHOOL.TERM_DETAIL(id), data),
  deleteTerm: (id) => instance.delete(ENDPOINTS.SCHOOL.TERM_DETAIL(id)),
};

export default schoolApi;
