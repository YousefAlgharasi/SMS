import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export const authAPI      = { login: (d) => api.post('/auth/login', d), getMe: () => api.get('/auth/me'), logout: () => api.post('/auth/logout'), updatePassword: (d) => api.put('/auth/password', d) };
export const usersAPI     = { getAll: (p) => api.get('/users', { params: p }), getById: (id) => api.get(`/users/${id}`), create: (d) => api.post('/users', d), update: (id, d) => api.put(`/users/${id}`, d), delete: (id) => api.delete(`/users/${id}`) };
export const customersAPI = {
  getAll:        (p)    => api.get('/customers', { params: p }),
  getById:       (id)   => api.get(`/customers/${id}`),
  create:        (d)    => api.post('/customers', d),
  update:        (id,d) => api.put(`/customers/${id}`, d),
  delete:        (id)   => api.delete(`/customers/${id}`),
  getHistory:    (id)   => api.get(`/customers/${id}/history`),
  topUpWallet:   (id,d) => api.post(`/customers/${id}/wallet`, d),
  deductWallet:  (id,d) => api.post(`/customers/${id}/wallet/deduct`, d),
};
export const productsAPI  = { getAll: (p) => api.get('/products', { params: p }), getById: (id) => api.get(`/products/${id}`), create: (d) => api.post('/products', d), update: (id,d) => api.put(`/products/${id}`, d), delete: (id) => api.delete(`/products/${id}`), adjustStock: (id,d) => api.put(`/products/${id}/stock`, d), getCategories: () => api.get('/products/categories'), getByBarcode: (b) => api.get(`/products/barcode/${b}`) };
export const salesAPI     = { getAll: (p) => api.get('/sales', { params: p }), getById: (id) => api.get(`/sales/${id}`), create: (d) => api.post('/sales', d), getToday: () => api.get('/sales/today') };
export const inventoryAPI = { getOverview: () => api.get('/inventory/overview'), getLowStock: () => api.get('/inventory/low-stock'), getMovements: (p) => api.get('/inventory/movements', { params: p }) };
export const suppliersAPI = { getAll: (p) => api.get('/suppliers', { params: p }), getById: (id) => api.get(`/suppliers/${id}`), create: (d) => api.post('/suppliers', d), update: (id,d) => api.put(`/suppliers/${id}`, d), delete: (id) => api.delete(`/suppliers/${id}`) };
export const poAPI        = { getAll: (p) => api.get('/purchase-orders', { params: p }), getById: (id) => api.get(`/purchase-orders/${id}`), create: (d) => api.post('/purchase-orders', d), receive: (id,d) => api.put(`/purchase-orders/${id}/receive`, d), updateStatus: (id,d) => api.put(`/purchase-orders/${id}/status`, d) };
export const returnsAPI   = { getAll: (p) => api.get('/returns', { params: p }), getById: (id) => api.get(`/returns/${id}`), create: (d) => api.post('/returns', d) };
export const reportsAPI   = { getSales: (p) => api.get('/reports/sales', { params: p }), getInventory: () => api.get('/reports/inventory'), getCustomers: () => api.get('/reports/customers') };
export const dashboardAPI = { getStats: () => api.get('/dashboard/stats') };
export const auditAPI     = { getLogs: (p) => api.get('/audit', { params: p }) };
export const categoriesAPI = {
  getAll:      ()         => api.get('/categories'),
  getProducts: (name)     => api.get(`/categories/${encodeURIComponent(name)}/products`),
  rename:      (name,n)   => api.put(`/categories/${encodeURIComponent(name)}/rename`, { newName: n }),
  delete:      (name)     => api.delete(`/categories/${encodeURIComponent(name)}`),
};

export default api;
