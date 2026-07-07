import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { AppView } from '../../store/useStore';
import { exportDBToFile, importDBFromFile } from '../../db/backup';
import styles from './Sidebar.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  view: AppView;
  description: string;
  requiresContext?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-dashboard',   label: 'Inicio',         icon: '⌂', view: 'dashboard',      description: 'Panel principal' },
  { id: 'nav-rubric',      label: 'Cargar Rúbrica', icon: '📊', view: 'rubric-upload',  description: 'Sube tu archivo Excel o CSV' },
  { id: 'nav-course',      label: 'Curso',          icon: '👥', view: 'course-setup',   description: 'Configura estudiantes' },
];

const CONTEXT_ITEMS: NavItem[] = [
  { id: 'nav-evaluation',  label: 'Evaluación',     icon: '✏️', view: 'evaluation',     description: 'Grilla de evaluación', requiresContext: true },
  { id: 'nav-megaprompt',  label: 'Mega Prompt',    icon: '🤖', view: 'mega-prompt',    description: 'Generar prompt para IA', requiresContext: true },
  { id: 'nav-ingestion',   label: 'Importar IA',    icon: '📥', view: 'json-ingestion', description: 'Pegar respuesta JSON', requiresContext: true },
  { id: 'nav-reports',     label: 'Informes',       icon: '📄', view: 'reports',        description: 'Exportar PDF y Word', requiresContext: true },
];

export function Sidebar() {
  const { activeView, setView, activeRubric, activeCourse, addToast } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasContext = !!(activeRubric && activeCourse);

  const handleNav = (item: NavItem) => {
    if (item.requiresContext && !hasContext) return;
    setView(item.view);
  };

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      await exportDBToFile();
      addToast({ type: 'success', message: 'Respaldo descargado exitosamente.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error al exportar.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      await importDBFromFile(file);
      addToast({ type: 'success', message: 'Datos restaurados con éxito. Recargando...' });
      
      // Recargar la página después de 1.5s para que los estados (Zustand) se refresquen con la nueva base de datos
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error al importar datos.' });
    } finally {
      setIsProcessing(false);
      // Limpiar el input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>IE</div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>Informe</span>
          <span className={styles.logoSub}>Evaluación</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Navegación principal */}
      <nav className={styles.nav} aria-label="Navegación principal">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={item.id}
            className={`${styles.navItem} ${activeView === item.view ? styles.active : ''}`}
            onClick={() => handleNav(item)}
            title={item.description}
            aria-current={activeView === item.view ? 'page' : undefined}
          >
            <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {activeView === item.view && <span className={styles.activeIndicator} />}
          </button>
        ))}

        {/* Items contextuales — solo si hay curso activo */}
        {hasContext && (
          <>
            <div className={styles.divider} />
            <div className={styles.contextHeader}>
              <span className={styles.contextDot} />
              <span className={styles.contextLabel} title={`${activeRubric.name} · ${activeCourse.name}`}>
                {activeCourse.name}
              </span>
            </div>
            {CONTEXT_ITEMS.map(item => (
              <button
                key={item.id}
                id={item.id}
                className={`${styles.navItem} ${activeView === item.view ? styles.active : ''}`}
                onClick={() => handleNav(item)}
                title={item.description}
                aria-current={activeView === item.view ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {activeView === item.view && <span className={styles.activeIndicator} />}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className={styles.spacer} />

      {/* Sección de Backups */}
      <div className={styles.backupSection}>
        <div className={styles.backupTitle}>Datos (Local)</div>
        <button 
          className={styles.backupBtn} 
          onClick={handleExport}
          disabled={isProcessing}
          title="Descargar todos tus datos en un archivo JSON"
        >
          <span className={styles.backupIcon}>💾</span>
          <span>Respaldar</span>
        </button>
        <button 
          className={styles.backupBtn} 
          onClick={handleImportClick}
          disabled={isProcessing}
          title="Subir un archivo de respaldo (restaurar datos)"
        >
          <span className={styles.backupIcon}>📂</span>
          <span>Restaurar</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="application/json"
          onChange={handleFileChange}
        />
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerText}>v1.0 · Local-First PWA</span>
      </div>
    </aside>
  );
}
