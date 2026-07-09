import { api } from './client';

export function getProfiles() {
  return api.get('/api/profiles');
}

export function createProfile(payload) {
  return api.post('/api/profiles', payload);
}

export function updateProfile(id, payload) {
  return api.put(`/api/profiles/${id}`, payload);
}

export function deleteProfile(id) {
  return api.del(`/api/profiles/${id}`);
}

export function activateProfile(id) {
  return api.post(`/api/profiles/${id}/activate`);
}
