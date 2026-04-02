import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * School-related API calls.
 */
const schoolApi = {
  getConfig: () => instance.get(ENDPOINTS.SCHOOL.CONFIG),
};

export default schoolApi;
