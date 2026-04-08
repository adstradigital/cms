import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * Auth-related API calls.
 */
const authApi = {
  login: (credentials) => instance.post(ENDPOINTS.AUTH.LOGIN, credentials),
  logout: (data) => instance.post(ENDPOINTS.AUTH.LOGOUT, data),
  getProfile: () => instance.get(ENDPOINTS.AUTH.PROFILE),
  updateProfile: (data) => instance.patch(ENDPOINTS.AUTH.PROFILE, data),
};

export default authApi;
