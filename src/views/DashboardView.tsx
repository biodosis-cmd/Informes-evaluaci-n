import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Rubric, Course } from '../db/db';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TeacherProfileModal } from '../components/ui/TeacherProfileModal';
import styles from './DashboardView.module.css';

export function DashboardView() {
  const { setView, setActiveRubric, setActiveCourse, addToast, teacher } = useStore();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'rubric'; item: Rubric }
    | { type: 'course'; item: Course }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [r, c] = await Promise.all([
      db.rubrics.orderBy('uploadedAt').reverse().toArray(),
      db.courses.orderBy('createdAt').reverse().toArray(),
    ]);
    setRubrics(r);
    setCourses(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSelectRubric = (r: Rubric) => {
    setActiveRubric(r);
    addToast({ type: 'success', message: `Rúbrica "${r.name}" activada` });
  };

  const handleSelectCourse = async (c: Course) => {
    const rubric = await db.rubrics.get(c.rubricId);
    if (rubric) setActiveRubric(rubric);
    setActiveCourse(c);
    const students = await db.students.where('courseId').equals(c.id).sortBy('order');
    const evals = await db.evaluations.where('courseId').equals(c.id).toArray();
    useStore.getState().setStudents(students);
    useStore.getState().setEvaluations(evals);
    addToast({ type: 'success', message: `Curso "${c.name}" cargado` });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'rubric') {
        const rubric = deleteTarget.item as Rubric;
        // Cascada: rubrica → cursos → alumnos → evaluaciones
        const relatedCourses = await db.courses.where('rubricId').equals(rubric.id).toArray();
        for (const course of relatedCourses) {
          await db.evaluations.where('courseId').equals(course.id).delete();
          await db.students.where('courseId').equals(course.id).delete();
        }
        await db.courses.where('rubricId').equals(rubric.id).delete();
        await db.rubrics.delete(rubric.id);
        // Limpiar estado global si era la activa
        if (useStore.getState().activeRubric?.id === rubric.id) {
          useStore.getState().setActiveRubric(null);
          useStore.getState().setActiveCourse(null);
          useStore.getState().setStudents([]);
          useStore.getState().setEvaluations([]);
        }
        addToast({ type: 'success', message: `Rúbrica "${rubric.name}" eliminada` });
      } else {
        const course = deleteTarget.item as Course;
        await db.evaluations.where('courseId').equals(course.id).delete();
        await db.students.where('courseId').equals(course.id).delete();
        await db.courses.delete(course.id);
        if (useStore.getState().activeCourse?.id === course.id) {
          useStore.getState().setActiveCourse(null);
          useStore.getState().setStudents([]);
          useStore.getState().setEvaluations([]);
        }
        addToast({ type: 'success', message: `Curso "${course.name}" eliminado` });
      }
      setDeleteTarget(null);
      await load();
    } catch {
      addToast({ type: 'error', message: 'Error al eliminar. Intenta de nuevo.' });
    } finally {
      setDeleting(false);
    }
  };

  const stats = [
    { label: 'Rúbricas', value: rubrics.length, icon: '📊', color: 'primary' },
    { label: 'Cursos', value: courses.length, icon: '👥', color: 'success' },
  ];

  const deleteLabel = deleteTarget?.type === 'rubric'
    ? (deleteTarget.item as Rubric).name
    : (deleteTarget?.item as Course | undefined)?.name ?? '';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Bienvenido a{' '}
            <span className="gradient-text">Informe Evaluación</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Plataforma de evaluación docente con rúbricas dinámicas, feedback con IA y exportación profesional de informes.
          </p>
          <div className={styles.heroCta}>
            <Button size="lg" onClick={() => setView('rubric-upload')} icon="📊">
              Cargar Rúbrica
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setView('course-setup')} icon="👥">
              Crear Curso
            </Button>
          </div>
          {/* Perfil docente */}
          <button
            className={styles.teacherChip}
            onClick={() => setShowTeacherModal(true)}
            title="Editar perfil docente"
          >
            <span>{teacher.sexo === 'M' ? '👨‍🏫' : teacher.sexo === 'F' ? '👩‍🏫' : '🧑‍🏫'}</span>
            <span>
              {teacher.name
                ? <>{teacher.name}<span className={styles.teacherChipEdit}>✏️</span></>
                : <span className={styles.teacherChipEmpty}>Configura tu perfil docente</span>
              }
            </span>
          </button>
        </div>
        <div className={styles.heroDecoration} aria-hidden="true">
          <div className={styles.orb} />
          <div className={styles.orb2} />
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        {stats.map(s => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statIcon}>{s.icon}</span>
            <div>
              <div className={styles.statValue}>{loading ? '—' : s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Flujo de trabajo */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Flujo de Trabajo</h2>
        <div className={styles.workflow}>
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={i} className={styles.workflowStep} onClick={() => setView(step.view as Parameters<typeof setView>[0])}>
              <div className={styles.stepNumber}>{i + 1}</div>
              <div className={styles.stepIcon}>{step.icon}</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDesc}>{step.desc}</div>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && <div className={styles.stepArrow}>›</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Rúbricas recientes */}
      {rubrics.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Rúbricas Recientes</h2>
          <div className={styles.grid}>
            {rubrics.slice(0, 6).map(r => (
              <div key={r.id} className={styles.card} onClick={() => handleSelectRubric(r)}>
                <div className={styles.cardIcon}>📊</div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>{r.name}</div>
                  <div className={styles.cardMeta}>
                    {r.rubricData.criteria.length} criterios · {r.rubricData.levels.length} niveles
                  </div>
                  <div className={styles.cardDate}>
                    {new Date(r.uploadedAt).toLocaleDateString('es-CL')}
                  </div>
                </div>
                <button
                  className={styles.deleteBtn}
                  title="Eliminar rúbrica"
                  aria-label="Eliminar rúbrica"
                  onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'rubric', item: r }); }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cursos recientes */}
      {courses.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cursos Recientes</h2>
          <div className={styles.grid}>
            {courses.slice(0, 6).map(c => (
              <div key={c.id} className={styles.card} onClick={() => handleSelectCourse(c)}>
                <div className={styles.cardIcon}>👥</div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>{c.name}</div>
                  <div className={styles.cardMeta}>{c.subject} · {c.period}</div>
                  <div className={styles.cardDate}>
                    {new Date(c.createdAt).toLocaleDateString('es-CL')}
                  </div>
                </div>
                <button
                  className={styles.deleteBtn}
                  title="Eliminar curso"
                  aria-label="Eliminar curso"
                  onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'course', item: c }); }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && rubrics.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🚀</div>
          <h3>¡Comienza aquí!</h3>
          <p>Sube tu primera rúbrica en formato Excel o CSV para comenzar a evaluar estudiantes con retroalimentación IA.</p>
          <Button onClick={() => setView('rubric-upload')} icon="📊">
            Cargar Primera Rúbrica
          </Button>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Confirmar eliminación"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="danger" loading={deleting} onClick={handleDeleteConfirm}>Sí, eliminar</Button>
          </>
        }
      >
        <div className={styles.deleteModalBody}>
          <div className={styles.deleteModalIcon}>⚠️</div>
          <p>
            ¿Estás seguro que deseas eliminar{' '}
            {deleteTarget?.type === 'rubric' ? 'la rúbrica' : 'el curso'}{' '}
            <strong>"{deleteLabel}"</strong>?
          </p>
          {deleteTarget?.type === 'rubric' && (
            <p className={styles.deleteModalWarning}>
              Esto eliminará también <strong>todos los cursos, alumnos y evaluaciones</strong> asociadas a esta rúbrica. Esta acción no se puede deshacer.
            </p>
          )}
          {deleteTarget?.type === 'course' && (
            <p className={styles.deleteModalWarning}>
              Esto eliminará todos los alumnos y evaluaciones del curso. Esta acción no se puede deshacer.
            </p>
          )}
        </div>
      </Modal>

      <TeacherProfileModal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
      />
    </div>
  );
}

const WORKFLOW_STEPS = [
  { icon: '📊', title: 'Rúbrica', desc: 'Carga tu Excel', view: 'rubric-upload' },
  { icon: '👥', title: 'Curso', desc: 'Smart Paste alumnos', view: 'course-setup' },
  { icon: '✏️', title: 'Evaluación', desc: 'Grilla dinámica', view: 'evaluation' },
  { icon: '🤖', title: 'Mega Prompt', desc: 'Copiar a IA', view: 'mega-prompt' },
  { icon: '📥', title: 'Importar IA', desc: 'Pegar JSON', view: 'json-ingestion' },
  { icon: '📄', title: 'Informes', desc: 'PDF y Word', view: 'reports' },
];
