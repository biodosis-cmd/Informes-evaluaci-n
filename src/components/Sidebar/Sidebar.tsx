import { useStore } from '../../store/useStore';
import type { AppView } from '../../store/useStore';
import styles from './Sidebar.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  view: AppView;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-dashboard',   label: 'Inicio',         icon: '⌂', view: 'dashboard',      description: 'Panel principal' },
  { id: 'nav-rubric',      label: 'Cargar Rúbrica', icon: '📊', view: 'rubric-upload',  description: 'Sube tu archivo Excel o CSV' },
  { id: 'nav-course',      label: 'Curso',           icon: '👥', view: 'course-setup',   description: 'Configura estudiantes' },
  { id: 'nav-evaluation',  label: 'Evaluación',      icon: '✏️', view: 'evaluation',     description: 'Grilla de evaluación' },
  { id: 'nav-megaprompt',  label: 'Mega Prompt',     icon: '🤖', view: 'mega-prompt',    description: 'Generar prompt para IA' },
  { id: 'nav-ingestion',   label: 'Importar IA',     icon: '📥', view: 'json-ingestion', description: 'Pegar respuesta JSON' },
  { id: 'nav-reports',     label: 'Informes',        icon: '📄', view: 'reports',        description: 'Exportar PDF y Word' },
];

export function Sidebar() {
  const { activeView, setView, activeRubric, activeCourse } = useStore();

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

      {/* Estado del flujo */}
      <div className={styles.flowStatus}>
        <div className={`${styles.statusItem} ${activeRubric ? styles.done : styles.pending}`}>
          <span className={styles.statusDot} />
          <span className={styles.statusLabel}>
            {activeRubric ? activeRubric.name : 'Sin rúbrica activa'}
          </span>
        </div>
        <div className={`${styles.statusItem} ${activeCourse ? styles.done : styles.pending}`}>
          <span className={styles.statusDot} />
          <span className={styles.statusLabel}>
            {activeCourse ? activeCourse.name : 'Sin curso activo'}
          </span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Navegación */}
      <nav className={styles.nav} aria-label="Navegación principal">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={item.id}
            className={`${styles.navItem} ${activeView === item.view ? styles.active : ''}`}
            onClick={() => setView(item.view)}
            title={item.description}
            aria-current={activeView === item.view ? 'page' : undefined}
          >
            <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {activeView === item.view && <span className={styles.activeIndicator} />}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerText}>v1.0 · Local-First PWA</span>
      </div>
    </aside>
  );
}
