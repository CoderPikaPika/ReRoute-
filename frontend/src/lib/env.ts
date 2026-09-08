import { z } from 'zod';

const clientEnvironmentSchema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_MAP_API_KEY: z.string().optional(),
});

const parsedEnvironment = clientEnvironmentSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_MAP_API_KEY: import.meta.env.VITE_MAP_API_KEY,
});

if (!parsedEnvironment.success) {
  throw new Error(
    'Invalid frontend environment configuration. Copy frontend/.env.example to frontend/.env.',
  );
}

export const clientEnv = {
  apiBaseUrl: parsedEnvironment.data.VITE_API_BASE_URL,
  mapApiKey: parsedEnvironment.data.VITE_MAP_API_KEY,
};
