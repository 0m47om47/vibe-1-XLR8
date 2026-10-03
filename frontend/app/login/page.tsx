'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { homeFor, useApp } from '@/lib/app-state';
import { ApiError, errorMessage } from '@/lib/api';
import { validateEmail } from '@/lib/validation';
import { Car, ArrowRight, GraduationCap, Briefcase, AlertCircle, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import AuthShell, { AuthField } from '@/components/layout/AuthShell';
import { PageLoader } from '@/components/ui/PageState';

/** Seeded demo accounts (backend `npm run seed`). Password for all: password123. */
const DEMO_ACCOUNTS = [
  { label: 'Student', hint: 'Rahul', email: 'rahul@lawazia.test', icon: GraduationCap },
  { label: 'Employee', hint: 'Neha', email: 'neha@lawazia.test', icon: Briefcase },
  { label: 'Rider', hint: 'Ravi', email: 'rider@lawazia.test', icon: Car },
  { label: 'Admin', hint: 'Om', email: 'admin@lawazia.test', icon: Shield },
];
const DEMO_PASSWORD = 'password123';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState<string | null>(null);

  /** Only same-site paths are honoured for ?next= (no open redirects). */
  const nextPath = (() => {
    const next = params.get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  })();

  // Already logged in → go straight to the app.
  useEffect(() => {
    if (user) router.replace(nextPath ?? homeFor(user.role));
  }, [user, router, nextPath]);

  const signIn = async (mail: string, pass: string, key: string) => {
    const emailError = validateEmail(mail);
    const nextErrors = { email: emailError ?? undefined, password: pass ? undefined : 'Password is required' };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(key);
    try {
      await login(mail.trim(), pass);
      // The effect above redirects once `user` is set.
    } catch (err) {
      setErrors(
        err instanceof ApiError && err.status === 401
          ? { form: 'Incorrect email or password.' }
          : { form: errorMessage(err) },
      );
      setLoading(null);
    }
  };

  if (user) return <PageLoader label="Signing you in…" />;

  return (
    <AuthShell>
      {/* Login card */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          signIn(email, password, 'form');
        }}
        className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
      >
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
        <p className="text-gray-500 text-sm mt-1.5 mb-8">Sign in to continue to your Toto desk.</p>

        {errors.form && (
          <div role="alert" className="flex items-start gap-2 mb-5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {errors.form}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@lawazia.com"
            error={errors.email}
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={errors.password}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading === 'form'}
          disabled={loading !== null}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>

        <p className="text-sm text-gray-500 text-center mt-6">
          New here?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Create an account
          </Link>
        </p>
      </form>

      {/* Demo access — real logins with the seeded accounts */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Demo Access</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={loading !== null}
              onClick={() => {
                setEmail(acc.email);
                setPassword(DEMO_PASSWORD);
                signIn(acc.email, DEMO_PASSWORD, acc.email);
              }}
              className="flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <acc.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors">
                {acc.label}
              </span>
              <span className="text-[10px] text-gray-400">{loading === acc.email ? 'Signing in…' : acc.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-3">
          Seeded demo accounts · password <span className="font-mono">{DEMO_PASSWORD}</span>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginForm />
    </Suspense>
  );
}
