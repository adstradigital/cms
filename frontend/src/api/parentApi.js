import instance from './instance';

/**
 * Parent-related API calls.
 */
const parentApi = {
  getStats: () => instance.get('/parent/stats/'),
  getChildProgress: (childId) => instance.get(`/parent/child/${childId}/progress/`),
  getPayments: () => instance.get('/parent/payments/'),
};

export default parentApi;
