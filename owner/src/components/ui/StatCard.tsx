import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  subValue?: string;
  icon: string;
  color?: 'primary' | 'secondary' | 'emerald' | 'amber' | 'blue';
  progress?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  subValue,
  icon,
  color = 'primary',
  progress,
}) => {
  const iconColorStyles = {
    primary: 'bg-primary-fixed/40 text-primary',
    secondary: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
  }[color];

  return (
    <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl lg:text-3xl font-extrabold text-on-surface">
              {value}
            </span>
            {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconColorStyles}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>

      {(subtitle || subValue || progress !== undefined) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{subtitle}</span>
            {subValue && <span className="font-semibold text-on-surface">{subValue}</span>}
          </div>
          {progress !== undefined && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
