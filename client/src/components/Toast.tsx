import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
let addToastFn: ((message: string, type: Toast['type']) => void) | null = null;
const pendingToasts: { message: string; type: Toast['type'] }[] = [];

export function showToast(message: string, type: Toast['type'] = 'info') {
  if (addToastFn) {
    addToastFn(message, type);
  } else {
    pendingToasts.push({ message, type });
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    // Flush any toasts that were queued before mount
    while (pendingToasts.length > 0) {
      const pending = pendingToasts.shift()!;
      addToast(pending.message, pending.type);
    }
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-wrapper">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <FiCheckCircle size={20} />}
          {toast.type === 'error' && <FiXCircle size={20} />}
          {toast.type === 'info' && <FiInfo size={20} />}
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
