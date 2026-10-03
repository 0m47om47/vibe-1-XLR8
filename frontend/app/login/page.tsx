'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-state';
import { Role } from '@/lib/types';
import { Car, ArrowRight, GraduationCap, Briefcase } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useDemo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (role: Role) => {
    login(role);
    if (role === 'rider') {
      router.push('/rider');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex page-enter">
      {/* Left — Brand */}
      <div className="hidden lg:flex lg:w-[55%] bg-gray-900 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-amber-400/20 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">LAWAZIA</span>
              <span className="text-gray-500 text-xs font-semibold tracking-widest ml-2 uppercase">
                Toto Desk
              </span>
            </div>
          </div>

          <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tight">
            Your ride.
            <br />
            <span className="text-gray-400">Handled simply.</span>
          </h1>

          <p className="text-gray-400 text-lg mt-6 max-w-md leading-relaxed">
            Request, manage and record every Toto trip from one place.
          </p>
        </div>

        {/* Route visualization */}
        <div className="relative z-10">
          <div className="flex flex-col gap-0">
            {/* College */}
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-blue-400 ring-4 ring-blue-400/20" />
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">
                College
              </span>
            </div>
            <div className="w-px h-10 bg-gray-700 ml-[5px] relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 p-1.5 rounded-full border border-gray-700">
                <Car className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            {/* Station */}
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">
                Station
              </span>
            </div>
            <div className="w-px h-10 bg-gray-700 ml-[5px]" />
            {/* Office */}
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-green-400 ring-4 ring-green-400/20" />
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">
                Office
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F7F8FA]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">LAWAZIA</span>
              <span className="text-gray-400 text-xs font-semibold tracking-widest ml-2 uppercase">
                Toto Desk
              </span>
            </div>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1.5 mb-8">
              Sign in to continue to your Toto desk.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@lawazia.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => handleLogin('student')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </div>

          {/* Demo access */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Demo Access
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleLogin('student')}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors">
                  Student
                </span>
              </button>
              <button
                onClick={() => handleLogin('employee')}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <Briefcase className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors">
                  Employee
                </span>
              </button>
              <button
                onClick={() => handleLogin('rider')}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <Car className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors">
                  Rider
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
