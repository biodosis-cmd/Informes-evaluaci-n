import { useStore } from '../../store/useStore';
import type { AppView } from '../../store/useStore';
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
  const { activeView, setView, activeRubric, activeCourse } = useStore();
  const hasContext = !!(activeRubric && activeCourse);

  const handleNav = (item: NavItem) => {
    if (item.requiresContext && !hasContext) return;
    setView(item.view);
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

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerText}>v1.0 · Local-First PWA</span>
      </div>
    </aside>
  );
}
