import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthFormLayout } from '../features/auth/AuthFormLayout';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api-error';

const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface NavigationState {
  from?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setSubmissionError(null);

    try {
      await login(values);
      const state = location.state as NavigationState | null;
      navigate(state?.from ?? '/dashboard', { replace: true });
    } catch (error) {
      setSubmissionError(getApiErrorMessage(error, 'Unable to log in. Please try again.'));
    }
  }

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle="Sign in to manage freight operations."
      footer={
        <>
          New to the platform?{' '}
          <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm font-medium text-slate-800">
          Email address
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            type="email"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email ? (
            <span className="mt-1 block text-sm text-rose-600">{errors.email.message}</span>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Password
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password ? (
            <span className="mt-1 block text-sm text-rose-600">{errors.password.message}</span>
          ) : null}
        </label>

        {submissionError ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {submissionError}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthFormLayout>
  );
}
