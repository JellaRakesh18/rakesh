import api from './api';

export const documentService = {
  async list() {
    const { data } = await api.get('/documents');
    return data.documents;
  },

  async getById(id) {
    const { data } = await api.get(`/documents/${id}`);
    return data.document;
  },

  async upload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return data.document;
  },

  async remove(id) {
    const { data } = await api.delete(`/documents/${id}`);
    return data;
  },
};
