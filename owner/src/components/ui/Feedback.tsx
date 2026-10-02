import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Memuat data...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-medium text-slate-500">{label}</span>
  </div>
);

export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon = 'inbox', title, description, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
    <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-3">
      <span className="material-symbols-outlined text-[30px]">{icon}</span>
    </div>
    <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
    <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>{actionText}</span>
      </button>
    )}
  </div>
);
