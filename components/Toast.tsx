import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

interface ToastsProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const Toasts: React.FC<ToastsProps> = ({ toasts, removeToast }) => {
  useEffect(() => {
    const timers = toasts.map(t => {
      const timer = setTimeout(() => removeToast(t.id), 4000);
      return () => clearTimeout(timer);
    });
    return () => timers.forEach(fn => fn());
  }, [toasts, removeToast]);

  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded shadow-md text-white font-bold text-sm ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-sky-600'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
};
