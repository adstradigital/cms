import instance from './instance';

const transportApi = {
  // Buses
  getBuses: (params) => instance.get('/transport/buses/', { params }),
  getBusDetail: (id) => instance.get(`/transport/buses/${id}/`),
  createBus: (data) => instance.post('/transport/buses/', data),
  updateBus: (id, data) => instance.patch(`/transport/buses/${id}/`, data),
  deleteBus: (id) => instance.delete(`/transport/buses/${id}/`),
  getLiveLocation: (id) => instance.get(`/transport/buses/${id}/live-location/`),
  pingBus: (data) => instance.post('/transport/buses/ping/', data),

  // Routes and stops
  getRoutes: (params) => instance.get('/transport/routes/', { params }),
  getRouteDetail: (id) => instance.get(`/transport/routes/${id}/`),
  createRoute: (data) => instance.post('/transport/routes/', data),
  updateRoute: (id, data) => instance.patch(`/transport/routes/${id}/`, data),
  deleteRoute: (id) => instance.delete(`/transport/routes/${id}/`),
  getRouteStops: (routeId) => instance.get(`/transport/routes/${routeId}/stops/`),
  createRouteStop: (routeId, data) => instance.post(`/transport/routes/${routeId}/stops/`, data),
  updateStop: (id, data) => instance.patch(`/transport/stops/${id}/`, data),
  deleteStop: (id) => instance.delete(`/transport/stops/${id}/`),

  // Student transport allocations
  getStudentTransports: (params) => instance.get('/transport/students/', { params }),
  assignStudentTransport: (data) => instance.post('/transport/students/', data),
  updateStudentTransport: (id, data) => instance.patch(`/transport/students/${id}/`, data),
  removeStudentTransport: (id) => instance.delete(`/transport/students/${id}/`),

  // Live location logs
  getLocationLogs: (params) => instance.get('/transport/locations/', { params }),
  createLocationLog: (data) => instance.post('/transport/locations/', data),

  // Fees
  getFees: (params) => instance.get('/transport/fees/', { params }),
  getFeeDetail: (id) => instance.get(`/transport/fees/${id}/`),
  createFee: (data) => instance.post('/transport/fees/', data),
  updateFee: (id, data) => instance.patch(`/transport/fees/${id}/`, data),
  payFee: (id, data) => instance.post(`/transport/fees/${id}/pay/`, data),

  // Complaints
  getComplaints: (params) => instance.get('/transport/complaints/', { params }),
  getComplaintDetail: (id) => instance.get(`/transport/complaints/${id}/`),
  createComplaint: (data) => instance.post('/transport/complaints/', data),
  updateComplaint: (id, data) => instance.patch(`/transport/complaints/${id}/`, data),
  deleteComplaint: (id) => instance.delete(`/transport/complaints/${id}/`),

  // Analytics
  getAnalytics: () => instance.get('/transport/analytics/'),
};

export default transportApi;
