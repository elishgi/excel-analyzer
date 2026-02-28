import api from './axios.js';

export async function getMonthlyDashboard(monthKey) {
  const { data } = await api.get('/api/dashboard/monthly', { params: { monthKey } });
  return data;
}
