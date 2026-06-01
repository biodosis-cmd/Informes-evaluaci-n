import { useStore } from '../../store/useStore';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="false">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ type, message, onClose }: { type: string; message: string; id: string; onClose: () => void }) {
  const icons: Record<string, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
  };
  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <span className={styles.icon}>{icons[type] ?? 'ℹ'}</span>
      <span className={styles.message}>{message}</span>
      <button className={styles.close} onClick={onClose} aria-label="Cerrar">×</button>
    </div>
  );
}
