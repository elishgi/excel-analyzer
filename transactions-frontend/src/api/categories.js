import api from './axios.js';

export const getCategories = async () => (await api.get('/api/categories')).data;
export const createCategory = async (payload) => (await api.post('/api/categories', payload)).data;
export const patchCategory = async (id, payload) => (await api.patch(`/api/categories/${id}`, payload)).data;
export const deleteCategory = async (id, payload) => (await api.delete(`/api/categories/${id}`, { data: payload })).data;
