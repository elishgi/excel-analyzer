import api from '../api/axios.js';
import toast from 'react-hot-toast';

export async function downloadExport(batchId, format = 'csv', { onUnauthorized } = {}) {
  try {
    const res = await api.get(`/api/imports/${batchId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${batchId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    if (e.response?.status === 401 && typeof onUnauthorized === 'function') {
      onUnauthorized();
      return;
    }
    toast.error('הורדה נכשלה');
  }
}
