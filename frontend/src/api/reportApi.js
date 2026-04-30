import instance from './instance';

const reportApi = {
  getMeta: () => instance.get('/reports/meta/'),

  run: (payload) => instance.post('/reports/run/', payload),

  exportExcel: (payload) => instance.post('/reports/export/excel/', payload, {
    responseType: 'blob',
  }),

  exportPdf: (payload) => instance.post('/reports/export/pdf/', payload, {
    responseType: 'blob',
  }),

  getSaved: (params) => instance.get('/reports/saved/', { params }),
  saveReport: (data) => instance.post('/reports/saved/', data),
  updateReport: (id, data) => instance.patch(`/reports/saved/${id}/`, data),
  deleteReport: (id) => instance.delete(`/reports/saved/${id}/`),
  loadReport: (id) => instance.get(`/reports/saved/${id}/`),
};

export default reportApi;
