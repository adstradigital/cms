import instance from './instance';

/**
 * Hostel-related API calls.
 */
const hostelApi = {
  // Hostels
  getHostels: () => instance.get('/hostel/'),
  getHostelDetail: (id) => instance.get(`/hostel/${id}/`),
  createHostel: (data) => instance.post('/hostel/', data),
  updateHostel: (id, data) => instance.patch(`/hostel/${id}/`, data),
  deleteHostel: (id) => instance.delete(`/hostel/${id}/`),

  // Floors
  getFloors: (params) => instance.get('/hostel/floors/', { params }),
  createFloor: (data) => instance.post('/hostel/floors/', data),

  // Rooms
  getRooms: (params) => instance.get('/hostel/rooms/', { params }),
  getRoomDetail: (id) => instance.get(`/hostel/rooms/${id}/`),
  createRoom: (data) => instance.post('/hostel/rooms/', data),
  updateRoom: (id, data) => instance.patch(`/hostel/rooms/${id}/`, data),
  deleteRoom: (id) => instance.delete(`/hostel/rooms/${id}/`),

  // Allotments
  getAllotments: (params) => instance.get('/hostel/allotments/', { params }),
  getAllotmentDetail: (id) => instance.get(`/hostel/allotments/${id}/`),
  createAllotment: (data) => instance.post('/hostel/allotments/', data),
  updateAllotment: (id, data) => instance.patch(`/hostel/allotments/${id}/`, data),
  vacateStudent: (id) => instance.post(`/hostel/allotments/${id}/vacate/`),
  autoAssign: (data) => instance.post('/hostel/allotments/auto-assign/', data),

  // Transfers
  getTransfers: (params) => instance.get('/hostel/transfers/', { params }),
  createTransfer: (data) => instance.post('/hostel/transfers/', data),

  // Attendance
  getAttendance: (params) => instance.get('/hostel/night-attendance/', { params }),
  markAttendance: (data) => instance.post('/hostel/night-attendance/', data),

  // Entry/Exit
  getGateLogs: (params) => instance.get('/hostel/entry-exit/', { params }),
  createGateLog: (data) => instance.post('/hostel/entry-exit/', data),

  // Violations
  getViolations: (params) => instance.get('/hostel/violations/', { params }),
  getViolationDetail: (id) => instance.get(`/hostel/violations/${id}/`),
  createViolation: (data) => instance.post('/hostel/violations/', data),
  updateViolation: (id, data) => instance.patch(`/hostel/violations/${id}/`, data),

  // Visitors
  getVisitors: (params) => instance.get('/hostel/visitors/', { params }),
  getVisitorDetail: (id) => instance.get(`/hostel/visitors/${id}/`),
  createVisitor: (data) => instance.post('/hostel/visitors/', data),
  approveVisitor: (id, decision) => instance.post(`/hostel/visitors/${id}/approve/`, { decision }),
  checkoutVisitor: (id) => instance.post(`/hostel/visitors/${id}/checkout/`),

  // Fees
  getFees: (params) => instance.get('/hostel/fees/', { params }),
  createFee: (data) => instance.post('/hostel/fees/', data),
  payFee: (id, data) => instance.post(`/hostel/fees/${id}/pay/`, data),

  // Analytics
  getAnalytics: (params) => instance.get('/hostel/analytics/', { params }),

  // Mess
  getMessMenus: (params) => instance.get('/hostel/mess/menus/', { params }),
  createMessMenu: (data) => instance.post('/hostel/mess/menus/', data),
  updateMessMenu: (id, data) => instance.put(`/hostel/mess/menus/${id}/`, data),
  bulkSaveMessMenu: (data) => instance.post('/hostel/mess/menus/bulk/', data),
  getMessAttendance: (params) => instance.get('/hostel/mess/attendance/', { params }),
  markMessAttendance: (data) => instance.post('/hostel/mess/attendance/', data),
  getMessDietProfiles: (params) => instance.get('/hostel/mess/diet-profiles/', { params }),
  saveMessDietProfile: (data) => instance.post('/hostel/mess/diet-profiles/', data),
  updateMessDietProfile: (id, data) => instance.patch(`/hostel/mess/diet-profiles/${id}/`, data),
  deleteMessDietProfile: (id) => instance.delete(`/hostel/mess/diet-profiles/${id}/`),
  getMessFeedback: (params) => instance.get('/hostel/mess/feedback/', { params }),
  createMessFeedback: (data) => instance.post('/hostel/mess/feedback/', data),
  updateMessFeedback: (id, data) => instance.patch(`/hostel/mess/feedback/${id}/`, data),
  deleteMessFeedback: (id) => instance.delete(`/hostel/mess/feedback/${id}/`),
  clearMessFeedback: (params) => instance.delete('/hostel/mess/feedback/', { params }),
  getMessInventoryItems: (params) => instance.get('/hostel/mess/inventory/items/', { params }),
  createMessInventoryItem: (data) => instance.post('/hostel/mess/inventory/items/', data),
  getMessInventoryLogs: (params) => instance.get('/hostel/mess/inventory/logs/', { params }),
  createMessInventoryLog: (data) => instance.post('/hostel/mess/inventory/logs/', data),
  getMessVendors: (params) => instance.get('/hostel/mess/vendors/', { params }),
  createMessVendor: (data) => instance.post('/hostel/mess/vendors/', data),
  getMessVendorSupplies: (params) => instance.get('/hostel/mess/vendor-supplies/', { params }),
  createMessVendorSupply: (data) => instance.post('/hostel/mess/vendor-supplies/', data),
  updateMessVendorSupply: (id, data) => instance.patch(`/hostel/mess/vendor-supplies/${id}/`, data),
  getMessWastage: (params) => instance.get('/hostel/mess/wastage/', { params }),
  createMessWastage: (data) => instance.post('/hostel/mess/wastage/', data),
  updateMessWastage: (id, data) => instance.patch(`/hostel/mess/wastage/${id}/`, data),
  deleteMessWastage: (id) => instance.delete(`/hostel/mess/wastage/${id}/`),
  getMessConsumption: (params) => instance.get('/hostel/mess/consumption/', { params }),
  createMessConsumption: (data) => instance.post('/hostel/mess/consumption/', data),
  updateMessConsumption: (id, data) => instance.patch(`/hostel/mess/consumption/${id}/`, data),
  deleteMessConsumption: (id) => instance.delete(`/hostel/mess/consumption/${id}/`),
  getMessStudentCosts: (params) => instance.get('/hostel/mess/student-costs/', { params }),
  getMessAnalytics: (params) => instance.get('/hostel/mess/analytics/', { params }),
};

export default hostelApi;
