import { api, getToken } from './client';

export function listPhotos({ from, to, page = 0, size = 100 } = {}) {
  return api.get('/api/photos', { from, to, page, size });
}

export function uploadPhoto({ file, photoDate, measurementId }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('photoDate', photoDate);
  if (measurementId) {
    formData.append('measurementId', measurementId);
  }
  return api.upload('/api/photos', formData);
}

export function deletePhoto(id) {
  return api.del(`/api/photos/${id}`);
}

export async function fetchPhotoBlobUrl(id) {
  const response = await fetch(`/api/photos/${id}/file`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to load photo ${id}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
