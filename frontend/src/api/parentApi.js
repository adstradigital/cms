import instance from './instance';

/**
 * Parent-related API calls.
 */
const parentApi = {
  getStats: () => instance.get('/accounts/parent/stats/'),
  getChildren: () => instance.get('/accounts/parent/children/'),
  getChildProgress: (childId) => instance.get(`/accounts/parent/child/${childId}/progress/`),
  getAttendance: (childId) => instance.get(`/accounts/parent/child/${childId}/attendance/`),
  getFees: (childId) => instance.get(`/accounts/parent/child/${childId}/fees/`),
  getHomework: (childId) => instance.get(`/accounts/parent/child/${childId}/homework/`),
  getPayments: () => instance.get('/accounts/parent/payments/'),
};

export default parentApi;
