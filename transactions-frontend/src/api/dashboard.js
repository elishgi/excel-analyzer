import api from './axios.js';

export async function getMonthlyDashboard(monthKey) {
  const { data } = await api.get('/api/dashboard/monthly', { params: { monthKey } });
  return data;
}

export async function patchDashboardCell(payload) {
  const { data } = await api.patch('/api/dashboard/monthly/cell', payload);
  return data;
}

export async function closeDashboardMonth(monthKey) {
  const { data } = await api.post('/api/dashboard/monthly/close', { monthKey });
  return data;
}
