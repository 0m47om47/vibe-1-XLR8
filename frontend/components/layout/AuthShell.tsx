'use client';

import { Car } from 'lucide-react';
import ToastContainer from '@/components/ui/Toast';

/** Split-screen frame shared by the login and register pages. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
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
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">College</span>
            </div>
            <div className="w-px h-10 bg-gray-700 ml-[5px] relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 p-1.5 rounded-full border border-gray-700">
                <Car className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            {/* Station */}
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">Station</span>
            </div>
            <div className="w-px h-10 bg-gray-700 ml-[5px]" />
            {/* Office */}
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-green-400 ring-4 ring-green-400/20" />
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">Office</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F7F8FA]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">LAWAZIA</span>
              <span className="text-gray-400 text-xs font-semibold tracking-widest ml-2 uppercase">Toto Desk</span>
            </div>
          </div>
          {children}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

/** Text input styled like the rest of the auth forms, with an inline error. */
export function AuthField({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300 ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
