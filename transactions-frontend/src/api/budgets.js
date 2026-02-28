import api from './axios.js';

export async function getBudget(monthKey) {
  const { data } = await api.get(`/api/budgets/${monthKey}`);
  return data;
}

export async function putBudget(monthKey, payload) {
  const { data } = await api.put(`/api/budgets/${monthKey}`, payload);
  return data;
}

export async function patchBudgetCell(monthKey, path, value) {
  const { data } = await api.patch(`/api/budgets/${monthKey}/cells`, { path, value });
  return data;
}
