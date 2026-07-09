import { api } from './client';

export function listMetrics() {
  return api.get('/api/metrics');
}

export function getCatalog() {
  return api.get('/api/metrics/catalog');
}

export function createMetric(payload) {
  return api.post('/api/metrics', payload);
}

export function updateMetric(id, payload) {
  return api.put(`/api/metrics/${id}`, payload);
}

export function deleteMetric(id) {
  return api.del(`/api/metrics/${id}`);
}

export function getHistory(metricId, { from, to, page = 0, size = 500 } = {}) {
  return api.get(`/api/metrics/${metricId}/history`, { from, to, page, size });
}

export function getSummary(metricId, period = 'all') {
  return api.get(`/api/metrics/${metricId}/summary`, { period });
}
