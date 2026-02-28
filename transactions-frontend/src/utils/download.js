import api from '../api/axios.js';

export async function downloadExport(batchId, format = 'csv') {
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
}
