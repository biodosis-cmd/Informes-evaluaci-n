import { useStore } from '../../store/useStore';
import styles from './ContextBar.module.css';

export function ContextBar() {
  const {
    activeRubric,
    activeCourse,
    students,
    setActiveRubric,
    setActiveCourse,
    setStudents,
    setEvaluations,
    setView,
    addToast,
  } = useStore();

  const hasContext = !!(activeRubric && activeCourse);

  const handleClose = () => {
    setActiveRubric(null);
    setActiveCourse(null);
    setStudents([]);
    setEvaluations([]);
    addToast({ type: 'info', message: 'Sesión de trabajo cerrada. Selecciona otro curso.' });
    setView('dashboard');
  };

  const handleGoToDashboard = () => {
    setView('dashboard');
  };

  if (!hasContext) {
    return (
      <div className={styles.contextBarEmpty}>
        <span className={styles.warningText}>
          Ningún curso seleccionado
        </span>
      </div>
    );
  }

  const fechaFmt = activeCourse.fechaEvaluacion
    ? new Date(activeCourse.fechaEvaluacion + 'T12:00:00').toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className={styles.contextBar}>
      <div className={styles.badges}>
        <span className={styles.badgeRubric} title={activeRubric.name}>
          <span className={styles.badgeIcon}>📊</span>
          <span className={styles.badgeLabel}>{activeRubric.name}</span>
        </span>

        <span className={styles.badgeCourse} title={activeCourse.name}>
          <span className={styles.badgeIcon}>👥</span>
          <span className={styles.badgeLabel}>{activeCourse.name}</span>
        </span>

        {fechaFmt && (
          <span className={styles.badgeDate} title="Fecha de evaluación">
            <span className={styles.badgeIcon}>📅</span>
            <span className={styles.badgeLabel}>{fechaFmt}</span>
          </span>
        )}

        <span className={styles.separator} />

        <span className={styles.studentCount}>
          {students.length} estudiante{students.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.switchBtn}
          onClick={handleGoToDashboard}
          title="Cambiar de curso"
        >
          🔄 <span className={styles.btnLabel}>Cambiar</span>
        </button>
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          title="Cerrar sesión de trabajo"
        >
          ✕ <span className={styles.btnLabel}>Cerrar</span>
        </button>
      </div>
    </div>
  );
}
