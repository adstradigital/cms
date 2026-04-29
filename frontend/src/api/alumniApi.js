import instance from './instance';
import { ENDPOINTS } from './config';

const alumniApi = {
  // Dashboard / Analytics
  getDashboard: () => instance.get(ENDPOINTS.ALUMNI.DASHBOARD),
  getReports: () => instance.get(ENDPOINTS.ALUMNI.REPORTS),

  // Alumni CRUD
  listAlumni: (params) => instance.get(ENDPOINTS.ALUMNI.LIST, { params }),
  getAlumni: (id) => instance.get(ENDPOINTS.ALUMNI.DETAIL(id)),
  createAlumni: (data) => instance.post(ENDPOINTS.ALUMNI.LIST, data),
  updateAlumni: (id, data) => instance.patch(ENDPOINTS.ALUMNI.DETAIL(id), data),
  deleteAlumni: (id) => instance.delete(ENDPOINTS.ALUMNI.DETAIL(id)),

  approveAlumni: (id) => instance.post(`${ENDPOINTS.ALUMNI.DETAIL(id)}approve/`),
  rejectAlumni: (id) => instance.post(`${ENDPOINTS.ALUMNI.DETAIL(id)}reject/`),
  verifyAlumni: (id) => instance.post(`${ENDPOINTS.ALUMNI.DETAIL(id)}verify/`),
  unverifyAlumni: (id) => instance.post(`${ENDPOINTS.ALUMNI.DETAIL(id)}unverify/`),

  // Import/Export
  importAlumni: (file, { defaultStatus = 'pending', schoolId } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (defaultStatus) formData.append('default_status', defaultStatus);
    if (schoolId) formData.append('school_id', String(schoolId));
    return instance.post(ENDPOINTS.ALUMNI.IMPORT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportAlumniCsv: (params) =>
    instance.get(ENDPOINTS.ALUMNI.EXPORT, {
      params,
      responseType: 'blob',
    }),

  // Events
  listEvents: (params) => instance.get(ENDPOINTS.ALUMNI.EVENTS, { params }),
  createEvent: (data) => instance.post(ENDPOINTS.ALUMNI.EVENTS, data),
  updateEvent: (id, data) => instance.patch(ENDPOINTS.ALUMNI.EVENT_DETAIL(id), data),
  deleteEvent: (id) => instance.delete(ENDPOINTS.ALUMNI.EVENT_DETAIL(id)),
  getEventRsvps: (id) => instance.get(ENDPOINTS.ALUMNI.EVENT_RSVPS(id)),

  // Communications
  listCommunications: (params) => instance.get(ENDPOINTS.ALUMNI.COMMUNICATIONS, { params }),
  createCommunication: (data) => instance.post(ENDPOINTS.ALUMNI.COMMUNICATIONS, data),
  updateCommunication: (id, data) => instance.patch(ENDPOINTS.ALUMNI.COMMUNICATION_DETAIL(id), data),
  deleteCommunication: (id) => instance.delete(ENDPOINTS.ALUMNI.COMMUNICATION_DETAIL(id)),
  sendCommunication: (id) => instance.post(ENDPOINTS.ALUMNI.COMMUNICATION_SEND(id)),

  // Contributions
  listContributions: (params) => instance.get(ENDPOINTS.ALUMNI.CONTRIBUTIONS, { params }),
  createContribution: (data) => instance.post(ENDPOINTS.ALUMNI.CONTRIBUTIONS, data),
  updateContribution: (id, data) => instance.patch(ENDPOINTS.ALUMNI.CONTRIBUTION_DETAIL(id), data),
  deleteContribution: (id) => instance.delete(ENDPOINTS.ALUMNI.CONTRIBUTION_DETAIL(id)),

  // Achievements / Highlights
  listAchievements: (params) => instance.get(ENDPOINTS.ALUMNI.ACHIEVEMENTS, { params }),
  createAchievement: (data) => instance.post(ENDPOINTS.ALUMNI.ACHIEVEMENTS, data),
  updateAchievement: (id, data) => instance.patch(ENDPOINTS.ALUMNI.ACHIEVEMENT_DETAIL(id), data),
  deleteAchievement: (id) => instance.delete(ENDPOINTS.ALUMNI.ACHIEVEMENT_DETAIL(id)),
};

export default alumniApi;
