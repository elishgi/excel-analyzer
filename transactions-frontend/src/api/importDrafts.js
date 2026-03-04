import api from './axios.js';

export const createImportDraft = async (files, sourceTypes) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  sourceTypes.forEach((s) => fd.append('sourceTypes', s));
  return (await api.post('/api/imports/draft', fd)).data;
};

export const getImportDraft = async (id) => (await api.get(`/api/imports/draft/${id}`)).data;
export const patchImportDraftRow = async (id, payload) => (await api.patch(`/api/imports/draft/${id}/row`, payload)).data;
export const approveImportDraft = async (id) => (await api.post(`/api/imports/draft/${id}/approve`)).data;
