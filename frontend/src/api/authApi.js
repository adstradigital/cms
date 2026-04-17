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
  getProfileDetails: () => instance.get(ENDPOINTS.AUTH.PROFILE_DETAILS),
  updateProfileDetails: (data) => instance.patch(ENDPOINTS.AUTH.PROFILE_DETAILS, data),
  changePassword: (data) => instance.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, data),
};

export default authApi;
