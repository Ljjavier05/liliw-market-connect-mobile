import api from './api';

/** PUT /users/profile */
export async function updateProfile({ name, phone, address }) {
  const res = await api.put('/users/profile', { name, phone, address });
  return res.data;
}

/** PUT /users/password */
export async function changePassword({ currentPassword, newPassword }) {
  const res = await api.put('/users/password', { currentPassword, newPassword });
  return res.data;
}
