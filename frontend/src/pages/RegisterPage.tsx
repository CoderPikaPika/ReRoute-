import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthFormLayout } from '../features/auth/AuthFormLayout';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api-error';

const registrationFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().regex(/^[+]?[\d\s-]{8,20}$/, 'Enter a valid phone number'),
    role: z.enum(['SHIPPER', 'TRANSPORTER']),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/\d/, 'Password must include a number'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'SHIPPER',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: RegistrationFormValues): Promise<void> {
    setSubmissionError(null);

    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: values.role,
        password: values.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setSubmissionError(
        getApiErrorMessage(error, 'Unable to create your account. Please try again.'),
      );
    }
  }

  return (
    <AuthFormLayout
      title="Create your account"
      subtitle="Register as a shipper or transporter."
      footer={
        <>
          Already have an account?{' '}
          <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm font-medium text-slate-800">
          Full name
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            {...register('name')}
          />
          {errors.name ? (
            <span className="mt-1 block text-sm text-rose-600">{errors.name.message}</span>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Email address
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            type="email"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email ? (
            <span className="mt-1 block text-sm text-rose-600">{errors.email.message}</span>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Phone number
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            inputMode="tel"
            autoComplete="tel"
            {...register('phone')}
          />
          {errors.phone ? (
            <span className="mt-1 block text-sm text-rose-600">{errors.phone.message}</span>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          I am registering as
          <select
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            {...register('role')}
          >
            <option value="SHIPPER">Shipper</option>
            <option value="TRANSPORTER">Transporter</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Password
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password ? (
            <span className="mt-1 block text-sm text-rose-600">{errors.password.message}</span>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Confirm password
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <span className="mt-1 block text-sm text-rose-600">
              {errors.confirmPassword.message}
            </span>
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthFormLayout>
  );
}
