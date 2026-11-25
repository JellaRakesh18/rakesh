import api from './api';

export const adminService = {
  async getOverview() {
    const { data } = await api.get('/admin/overview');
    return data;
  },
  async getHealth() {
    const { data } = await api.get('/health');
    return data;
  },
};
