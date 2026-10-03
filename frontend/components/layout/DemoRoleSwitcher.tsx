'use client';

import { useState, useRef, useEffect } from 'react';
import { useDemo } from '@/lib/demo-state';
import { useRouter } from 'next/navigation';
import { Monitor, GraduationCap, Briefcase, Car } from 'lucide-react';
import { Role } from '@/lib/types';

const ROLES: { value: Role; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'employee', label: 'Employee', icon: Briefcase },
  { value: 'rider', label: 'Rider', icon: Car },
];

export default function DemoRoleSwitcher() {
  const { currentRole, setRole } = useDemo();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (role: Role) => {
    setRole(role);
    setOpen(false);
    if (role === 'rider') {
      router.push('/rider');
    } else {
      router.push('/dashboard');
    }
  };

  const current = ROLES.find((r) => r.value === currentRole)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
      >
        <Monitor className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wider text-[10px] font-semibold text-gray-400">Demo</span>
        <span className="text-gray-700">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 modal-enter">
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Demo Mode
            </p>
          </div>
          {ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => handleSelect(role.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors cursor-pointer ${
                currentRole === role.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <role.icon className="w-4 h-4" />
              {role.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
