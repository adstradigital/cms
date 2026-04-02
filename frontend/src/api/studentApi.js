import instance from './instance';
import { ENDPOINTS } from './config';

/**
 * Student-related API calls.
 */
const studentApi = {
  getStats: () => instance.get('/student/stats/'), // Example endpoint
  getTimetable: () => instance.get('/student/timetable/'),
  getResults: () => instance.get('/student/results/'),
  getFees: () => instance.get('/student/fees/'),
};

export default studentApi;
