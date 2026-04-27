import instance from './instance';

const canteenApi = {
  // ── Dashboard & Reports ──────────────────────────────────────────────────────
  getDashboard: () => instance.get('/canteen/dashboard/'),
  getReports: (period = 'weekly') => instance.get('/canteen/reports/', { params: { period } }),

  // ── Food Items & Categories ──────────────────────────────────────────────────
  getFoodItems: (params) => instance.get('/canteen/food-items/', { params }),
  createFoodItem: (data) => instance.post('/canteen/food-items/', data),
  updateFoodItem: (id, data) => instance.patch(`/canteen/food-items/${id}/`, data),
  deleteFoodItem: (id) => instance.delete(`/canteen/food-items/${id}/`),
  toggleFoodItemAvailability: (id) => instance.patch(`/canteen/food-items/${id}/toggle_availability/`),
  getTopSellingItems: () => instance.get('/canteen/food-items/top_selling/'),
  getPriceChart: () => instance.get('/canteen/food-items/price_chart/'),

  getFoodCategories: () => instance.get('/canteen/food-categories/'),
  createFoodCategory: (data) => instance.post('/canteen/food-categories/', data),
  updateFoodCategory: (id, data) => instance.patch(`/canteen/food-categories/${id}/`, data),
  deleteFoodCategory: (id) => instance.delete(`/canteen/food-categories/${id}/`),

  // Daily Menu
  getDailyMenu: (params) => instance.get('/canteen/daily-menu/', { params }),
  getWeeklyMenus: (params) => instance.get('/canteen/weekly-menu/', { params }),
  getWeeklyMenu: (params) => instance.get('/canteen/weekly-menu/', { params }),
  createWeeklyMenu: (data) => instance.post('/canteen/weekly-menu/', data),
  updateWeeklyMenu: (id, data) => instance.patch(`/canteen/weekly-menu/${id}/`, data),
  deleteWeeklyMenu: (id) => instance.delete(`/canteen/weekly-menu/${id}/`),

  // ── Orders ───────────────────────────────────────────────────────────────────
  getOrders: (params) => instance.get('/canteen/orders/', { params }),
  createOrder: (data) => instance.post('/canteen/orders/', data),
  updateOrder: (id, data) => instance.patch(`/canteen/orders/${id}/`, data),
  updateOrderStatus: (id, orderStatus) => instance.patch(`/canteen/orders/${id}/update_status/`, { status: orderStatus }),
  cancelOrder: (id) => instance.post(`/canteen/orders/${id}/cancel/`),
  deleteOrder: (id) => instance.delete(`/canteen/orders/${id}/`),

  // ── Payments ─────────────────────────────────────────────────────────────────
  getPayments: (params) => instance.get('/canteen/payments/', { params }),
  createPayment: (data) => instance.post('/canteen/payments/', data),
  updatePayment: (id, data) => instance.patch(`/canteen/payments/${id}/`, data),
  getDailySummary: (date) => instance.get('/canteen/payments/daily_summary/', { params: { date } }),

  // ── Complaints / Feedback ────────────────────────────────────────────────────
  getComplaints: (params) => instance.get('/canteen/complaints/', { params }),
  createComplaint: (data) => instance.post('/canteen/complaints/', data),
  updateComplaint: (id, data) => instance.patch(`/canteen/complaints/${id}/`, data),
  updateComplaintStatus: (id, status, resolution_note) =>
    instance.patch(`/canteen/complaints/${id}/update_status/`, { status, resolution_note }),

  // ── Suppliers ────────────────────────────────────────────────────────────────
  getSuppliers: (params) => instance.get('/canteen/suppliers/', { params }),
  createSupplier: (data) => instance.post('/canteen/suppliers/', data),
  updateSupplier: (id, data) => instance.patch(`/canteen/suppliers/${id}/`, data),
  deleteSupplier: (id) => instance.delete(`/canteen/suppliers/${id}/`),

  // ── Vendors ──────────────────────────────────────────────────────────────────
  getVendors: (params) => instance.get('/canteen/vendors/', { params }),
  createVendor: (data) => instance.post('/canteen/vendors/', data),
  updateVendor: (id, data) => instance.patch(`/canteen/vendors/${id}/`, data),
  deleteVendor: (id) => instance.delete(`/canteen/vendors/${id}/`),

  // ── Inventory ────────────────────────────────────────────────────────────────
  getInventoryItems: (params) => instance.get('/canteen/inventory-items/', { params }),
  createInventoryItem: (data) => instance.post('/canteen/inventory-items/', data),
  updateInventoryItem: (id, data) => instance.patch(`/canteen/inventory-items/${id}/`, data),
  deleteInventoryItem: (id) => instance.delete(`/canteen/inventory-items/${id}/`),
  getLowStockItems: () => instance.get('/canteen/inventory-items/low_stock/'),

  getInventoryCategories: () => instance.get('/canteen/inventory-categories/'),
  createInventoryCategory: (data) => instance.post('/canteen/inventory-categories/', data),

  getInventoryLogs: (params) => instance.get('/canteen/inventory-logs/', { params }),
  createInventoryLog: (data) => instance.post('/canteen/inventory-logs/', data),

  getWastageLogs: (params) => instance.get('/canteen/wastage-logs/', { params }),
  createWastageLog: (data) => instance.post('/canteen/wastage-logs/', data),

  getConsumptionLogs: (params) => instance.get('/canteen/consumption-logs/', { params }),
  createConsumptionLog: (data) => instance.post('/canteen/consumption-logs/', data),
  getAnalytics: () => instance.get('/canteen/consumption-logs/analytics/'),

  // ── Dishes / Ingredients / Combos (Kitchen Library) ─────────────────────────
  getIngredients: () => instance.get('/canteen/ingredients/'),
  createIngredient: (data) => instance.post('/canteen/ingredients/', data),
  updateIngredient: (id, data) => instance.patch(`/canteen/ingredients/${id}/`, data),

  getDishes: (params) => instance.get('/canteen/dishes/', { params }),
  createDish: (data) => instance.post('/canteen/dishes/', data),
  updateDish: (id, data) => instance.patch(`/canteen/dishes/${id}/`, data),
  deleteDish: (id) => instance.delete(`/canteen/dishes/${id}/`),

  getCombos: (params) => instance.get('/canteen/combos/', { params }),
  createCombo: (data) => instance.post('/canteen/combos/', data),
  updateCombo: (id, data) => instance.patch(`/canteen/combos/${id}/`, data),
  deleteCombo: (id) => instance.delete(`/canteen/combos/${id}/`),
  
  // ── Customer Search (Students/Staff) ─────────────────────────────────────────
  searchStudents: (query, params = {}) => instance.get('/students/students/', { params: { search: query, ...params } }),
  searchStaff: (query, params = {}) => instance.get('/staff/', { params: { q: query, ...params } }),

  // ── Purchase Orders ──────────────────────────────────────────────────────────
  getPurchaseOrders: (params) => instance.get('/canteen/purchase-orders/', { params }),
  createPurchaseOrder: (data) => instance.post('/canteen/purchase-orders/', data),
  updatePurchaseOrder: (id, data) => instance.patch(`/canteen/purchase-orders/${id}/`, data),
  receivePurchaseOrder: (id) => instance.post(`/canteen/purchase-orders/${id}/receive_order/`),

  // ── Staff Profiles & Attendance ──────────────────────────────────────────────
  getStaffProfiles: (params) => instance.get('/canteen/staff-profiles/', { params }),
  createStaffProfile: (data) => instance.post('/canteen/staff-profiles/', data),
  getStaffAttendance: (params) => instance.get('/canteen/staff-attendance/', { params }),
  createStaffAttendance: (data) => instance.post('/canteen/staff-attendance/', data),
  updateStaffAttendance: (id, data) => instance.patch(`/canteen/staff-attendance/${id}/`, data),
  getStaffAnnouncements: (params) => instance.get('/canteen/staff-announcements/', { params }),
  createStaffAnnouncement: (data) => instance.post('/canteen/staff-announcements/', data),
  updateStaffAnnouncement: (id, data) => instance.patch(`/canteen/staff-announcements/${id}/`, data),
  deleteStaffAnnouncement: (id) => instance.delete(`/canteen/staff-announcements/${id}/`),
  getStaffLeaves: (params) => instance.get('/canteen/staff-leaves/', { params }),
  deleteStaffAttendance: (id) => instance.delete(`/canteen/staff-attendance/${id}/`),
};

export default canteenApi;
