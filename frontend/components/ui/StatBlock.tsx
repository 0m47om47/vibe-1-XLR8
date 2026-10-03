'use client';

interface StatBlockProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: 'default' | 'blue' | 'green' | 'red' | 'amber';
}

const COLOR_MAP = {
  default: 'text-gray-900',
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  amber: 'text-amber-600',
};

export default function StatBlock({ label, value, icon, color = 'default' }: StatBlockProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-1 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-500 font-medium">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <span className={`text-[28px] font-semibold leading-tight ${COLOR_MAP[color]}`}>
        {value}
      </span>
    </div>
  );
}
