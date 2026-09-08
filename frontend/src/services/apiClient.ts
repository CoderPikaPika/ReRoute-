import axios from 'axios';

import { getStoredAccessToken } from '../lib/auth-storage';
import { clientEnv } from '../lib/env';

export const apiClient = axios.create({
  baseURL: clientEnv.apiBaseUrl,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken();

  if (accessToken) {
    config.headers.Authorization = 'Bearer ' + accessToken;
  }

  return config;
});
