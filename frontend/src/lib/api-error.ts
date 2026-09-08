import axios from 'axios';

import type { ApiFailure } from '../types/api';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }

  return fallback;
}
