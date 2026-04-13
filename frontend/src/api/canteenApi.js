import instance from './instance';

/**
 * Canteen-related API calls.
 */
const canteenApi = {
  // Food Items & Categories
  getFoodItems: (params) => instance.get('/canteen/food-items/', { params }),
  getPriceChart: () => instance.get('/canteen/food-items/price_chart/'),
  createFoodItem: (data) => instance.post('/canteen/food-items/', data),
  updateFoodItem: (id, data) => instance.patch(`/canteen/food-items/${id}/`, data),
  deleteFoodItem: (id) => instance.delete(`/canteen/food-items/${id}/`),

  getFoodCategories: () => instance.get('/canteen/food-categories/'),
  createFoodCategory: (data) => instance.post('/canteen/food-categories/', data),

  // Daily Menu
  getDailyMenus: (params) => instance.get('/canteen/daily-menu/', { params }),
  createDailyMenu: (data) => instance.post('/canteen/daily-menu/', data),
  updateDailyMenu: (id, data) => instance.patch(`/canteen/daily-menu/${id}/`, data),

  // Complaints
  getComplaints: (params) => instance.get('/canteen/complaints/', { params }),
  createComplaint: (data) => instance.post('/canteen/complaints/', data),
  updateComplaint: (id, data) => instance.patch(`/canteen/complaints/${id}/`, data),

  // Suppliers
  getSuppliers: (params) => instance.get('/canteen/suppliers/', { params }),
  createSupplier: (data) => instance.post('/canteen/suppliers/', data),
  updateSupplier: (id, data) => instance.patch(`/canteen/suppliers/${id}/`, data),

  // Inventory
  getInventoryItems: (params) => instance.get('/canteen/inventory-items/', { params }),
  createInventoryItem: (data) => instance.post('/canteen/inventory-items/', data),
  updateInventoryItem: (id, data) => instance.patch(`/canteen/inventory-items/${id}/`, data),
  deleteInventoryItem: (id) => instance.delete(`/canteen/inventory-items/${id}/`),
  getInventoryLogs: (params) => instance.get('/canteen/inventory-logs/', { params }),
  createInventoryLog: (data) => instance.post('/canteen/inventory-logs/', data),

  // Wastage & Consumption
  getWastageLogs: (params) => instance.get('/canteen/wastage-logs/', { params }),
  createWastageLog: (data) => instance.post('/canteen/wastage-logs/', data),
  getConsumptionLogs: (params) => instance.get('/canteen/consumption-logs/', { params }),
  createConsumptionLog: (data) => instance.post('/canteen/consumption-logs/', data),
  getAnalytics: () => instance.get('/canteen/consumption-logs/analytics/'),

  // Ingredient, Dish, Combo
  getIngredients: () => instance.get('/canteen/ingredients/'),
  createIngredient: (data) => instance.post('/canteen/ingredients/', data),
  getDishes: (params) => instance.get('/canteen/dishes/', { params }),
  createDish: (data) => instance.post('/canteen/dishes/', data),
  getCombos: (params) => instance.get('/canteen/combos/', { params }),
  createCombo: (data) => instance.post('/canteen/combos/', data),
};

export default canteenApi;
