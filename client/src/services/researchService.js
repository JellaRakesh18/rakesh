import api, { API_BASE_URL } from './api';

export const researchService = {
  async generatePlan(payload) {
    const { data } = await api.post('/research/plan', payload, { timeout: 120000 });
    return data.session;
  },

  async executeResearch(payload) {
    const { data } = await api.post('/research/execute', payload);
    return data.session;
  },

  async getHistory(params = {}) {
    const { data } = await api.get('/research/history', { params });
    return data;
  },

  async getSession(id) {
    const { data } = await api.get(`/research/${id}`);
    return data;
  },

  async pauseSession(id) {
    const { data } = await api.post(`/research/${id}/pause`);
    return data.session;
  },

  async resumeSession(id) {
    const { data } = await api.post(`/research/${id}/resume`);
    return data.session;
  },

  async cancelSession(id) {
    const { data } = await api.post(`/research/${id}/cancel`);
    return data.session;
  },

  async approveAction(id, approved) {
    const { data } = await api.post(`/research/${id}/approve`, { approved });
    return data;
  },

  async deleteSession(id) {
    const { data } = await api.delete(`/research/${id}`);
    return data;
  },

  async askFollowUp(id, question) {
    const { data } = await api.post(`/research/${id}/followup`, { question });
    return data;
  },

  getStreamUrl(id) {
    const token = localStorage.getItem('researchx_token') || '';
    return `${API_BASE_URL}/research/${id}/stream?token=${encodeURIComponent(token)}`;
  },
};
