'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { homeFor, useApp } from '@/lib/app-state';
import { ApiError, errorMessage } from '@/lib/api';
import { validateEmail, validatePersonName } from '@/lib/validation';
import { ArrowRight, GraduationCap, Briefcase, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import AuthShell, { AuthField } from '@/components/layout/AuthShell';
import { PageLoader } from '@/components/ui/PageState';
import { cn } from '@/lib/utils';

type Field = 'name' | 'email' | 'password' | 'role' | 'form';

const ROLES = [
  { value: 'STUDENT' as const, label: 'Student', icon: GraduationCap },
  { value: 'EMPLOYEE' as const, label: 'Employee', icon: Briefcase },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'EMPLOYEE'>('STUDENT');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace(homeFor(user.role));
  }, [user, router]);

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {
      name: validatePersonName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: password.length < 8 ? 'Password must be at least 8 characters' : undefined,
    };
    setErrors(next);
    if (next.name || next.email || next.password) return;

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, role });
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'VALIDATION_ERROR' || err.code === 'CONFLICT')) {
        const fields = (err.details ?? {}) as Partial<Record<Field, string>>;
        setErrors(Object.keys(fields).length ? fields : { form: err.message });
      } else {
        setErrors({ form: errorMessage(err) });
      }
      setLoading(false);
    }
  };

  if (user) return <PageLoader label="Setting up your desk…" />;

  return (
    <AuthShell>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
      >
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
        <p className="text-gray-500 text-sm mt-1.5 mb-8">Request Toto rides for yourself or your group.</p>

        {errors.form && (
          <div role="alert" className="flex items-start gap-2 mb-5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {errors.form}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <AuthField
            label="Full name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Sharma"
            error={errors.name}
          />
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            error={errors.password}
          />

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">I am a</span>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Role">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={role === r.value}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer min-h-[44px]',
                    role === r.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <r.icon className="w-4 h-4" />
                  {r.label}
                </button>
              ))}
            </div>
            {errors.role && <p className="text-xs text-red-600 mt-1.5">{errors.role}</p>}
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
          Create Account
        </Button>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </form>
      <p className="text-[11px] text-gray-400 text-center mt-4">
        Rider accounts are created by the administrator.
      </p>
    </AuthShell>
  );
}
