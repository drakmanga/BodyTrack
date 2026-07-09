import { api } from './client';

export function getMe() {
  return api.get('/api/users/me');
}
