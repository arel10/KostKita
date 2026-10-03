import React, { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; text: string }
interface ToastCtx { toast: (text: string, kind?: Kind) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} });
let seq = 0;

const style: Record<Kind, { icon: string; cls: string }> = {
  success: { icon: 'check_circle', cls: 'bg-brand-600' },
  error: { icon: 'error', cls: 'bg-rose-600' },
  info: { icon: 'info', cls: 'bg-ink-800' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((text: string, kind: Kind = 'success') => {
    const id = ++seq;
    setItems((p) => [...p, { id, kind, text }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]">
        {items.map((t) => (
          <div key={t.id} className={`${style[t.kind].cls} text-white rounded-xl shadow-xl px-4 py-3 flex items-start gap-2.5 animate-slide-in`}>
            <span className="material-symbols-outlined text-[20px] shrink-0">{style[t.kind].icon}</span>
            <p className="text-sm font-medium leading-snug">{t.text}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export const useToast = () => useContext(Ctx);
