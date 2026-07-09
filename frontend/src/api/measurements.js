import { api } from './client';

export function listMeasurements({ from, to, page = 0, size = 50 } = {}) {
  return api.get('/api/measurements', { from, to, page, size });
}

export function createMeasurement(payload) {
  return api.post('/api/measurements', payload);
}

export function updateMeasurement(id, payload) {
  return api.put(`/api/measurements/${id}`, payload);
}

export function deleteMeasurement(id) {
  return api.del(`/api/measurements/${id}`);
}
