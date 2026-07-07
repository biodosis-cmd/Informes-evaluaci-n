import { useState } from 'react';
import { verifyDocentePassword } from '../export/sheetsExporter';

interface Props {
  onSuccess: () => void;
}

export function DocenteLogin({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      await verifyDocentePassword(password.trim());
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al verificar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>🔐</div>
        <h2 style={styles.title}>Acceso Docente</h2>
        <p style={styles.subtitle}>Ingresa tu contraseña para continuar</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            style={styles.input}
            autoFocus
            disabled={loading}
          />

          {error && <div style={styles.error}>❌ {error}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? '⏳ Verificando...' : '🚀 Ingresar'}
          </button>
        </form>

        <p style={styles.footer}>
          Educación Física y Salud · 2026
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center' as const,
  },
  iconWrap: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
    border: 'none',
    borderRadius: '12px',
    fontFamily: 'inherit',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
  },
  footer: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '24px',
  },
};
