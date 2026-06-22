import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Rubric, Course, Student, Evaluation } from '../db/db';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TeacherProfileModal } from '../components/ui/TeacherProfileModal';
import styles from './DashboardView.module.css';

/** Estructura agrupada: un "curso" visual con sus evaluaciones (rúbricas) */
interface CourseGroup {
  courseName: string;
  subject: string;
  entries: {
    course: Course;
    rubric: Rubric | null;
    totalStudents: number;
    evaluatedStudents: number;
  }[];
}

export function DashboardView() {
  const { setView, setActiveRubric, setActiveCourse, addToast, teacher } = useStore();
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'rubric'; rubric: Rubric; course: Course }
    | { type: 'course-group'; courseName: string; courseIds: string[] }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [allRubrics, allCourses, allStudents, allEvals] = await Promise.all([
      db.rubrics.toArray(),
      db.courses.orderBy('createdAt').reverse().toArray(),
      db.students.toArray(),
      db.evaluations.toArray(),
    ]);

    // Crear un mapa rápido
    const rubricMap = new Map(allRubrics.map(r => [r.id, r]));
    const studentsByCourse = new Map<string, Student[]>();
    const evalsByCourse = new Map<string, Evaluation[]>();

    for (const s of allStudents) {
      if (!studentsByCourse.has(s.courseId)) studentsByCourse.set(s.courseId, []);
      studentsByCourse.get(s.courseId)!.push(s);
    }
    for (const e of allEvals) {
      if (!evalsByCourse.has(e.courseId)) evalsByCourse.set(e.courseId, []);
      evalsByCourse.get(e.courseId)!.push(e);
    }

    // Agrupar cursos por nombre (un mismo curso puede tener varias evaluaciones)
    const groupMap = new Map<string, CourseGroup>();

    for (const course of allCourses) {
      const key = course.name; // agrupamos por nombre de curso
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          courseName: course.name,
          subject: course.subject,
          entries: [],
        });
      }

      const students = studentsByCourse.get(course.id) ?? [];
      const evals = evalsByCourse.get(course.id) ?? [];
      const completedEvals = evals.filter(e => !e.isPending && e.completedAt > 0);

      groupMap.get(key)!.entries.push({
        course,
        rubric: rubricMap.get(course.rubricId) ?? null,
        totalStudents: students.length,
        evaluatedStudents: completedEvals.length,
      });
    }

    setGroups(Array.from(groupMap.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  /** Click en una evaluación dentro de la tarjeta → cargar contexto y navegar */
  const handleOpenEvaluation = async (course: Course, rubric: Rubric | null) => {
    if (!rubric) {
      addToast({ type: 'error', message: 'La rúbrica asociada ya no existe.' });
      return;
    }
    setActiveRubric(rubric);
    setActiveCourse(course);
    const students = await db.students.where('courseId').equals(course.id).sortBy('order');
    const evals = await db.evaluations.where('courseId').equals(course.id).toArray();
    useStore.getState().setStudents(students);
    useStore.getState().setEvaluations(evals);
    addToast({ type: 'success', message: `Evaluación "${rubric.name}" · ${course.name} cargada` });
    setView('evaluation');
  };

  /** Eliminar una evaluación individual (course + sus students + evals) */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'rubric') {
        const { course, rubric } = deleteTarget;
        await db.evaluations.where('courseId').equals(course.id).delete();
        await db.students.where('courseId').equals(course.id).delete();
        await db.courses.delete(course.id);
        // Si no hay más cursos usando esta rúbrica, eliminar la rúbrica también
        const remaining = await db.courses.where('rubricId').equals(rubric.id).count();
        if (remaining === 0) {
          await db.rubrics.delete(rubric.id);
        }
        // Limpiar estado si era el activo
        const state = useStore.getState();
        if (state.activeCourse?.id === course.id) {
          state.setActiveCourse(null);
          state.setStudents([]);
          state.setEvaluations([]);
        }
        if (state.activeRubric?.id === rubric.id && remaining === 0) {
          state.setActiveRubric(null);
        }
        addToast({ type: 'success', message: `Evaluación eliminada` });
      } else {
        // Eliminar todo el grupo de cursos
        for (const courseId of deleteTarget.courseIds) {
          const course = await db.courses.get(courseId);
          if (course) {
            await db.evaluations.where('courseId').equals(courseId).delete();
            await db.students.where('courseId').equals(courseId).delete();
            await db.courses.delete(courseId);
            const remaining = await db.courses.where('rubricId').equals(course.rubricId).count();
            if (remaining === 0) {
              await db.rubrics.delete(course.rubricId);
            }
          }
        }
        const state = useStore.getState();
        state.setActiveCourse(null);
        state.setActiveRubric(null);
        state.setStudents([]);
        state.setEvaluations([]);
        addToast({ type: 'success', message: `Curso "${deleteTarget.courseName}" eliminado con todas sus evaluaciones` });
      }
      setDeleteTarget(null);
      await load();
    } catch {
      addToast({ type: 'error', message: 'Error al eliminar. Intenta de nuevo.' });
    } finally {
      setDeleting(false);
    }
  };

  const getProgressPercent = (evaluated: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((evaluated / total) * 100);
  };

  const getStatusIcon = (evaluated: number, total: number) => {
    if (total === 0) return '⬜';
    if (evaluated >= total) return '✅';
    if (evaluated > 0) return '🟡';
    return '⬜';
  };

  return (
    <div className={styles.container}>
      {/* Header limpio */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Mis Evaluaciones</h1>
          <p className={styles.subtitle}>
            {groups.length === 0 && !loading
              ? 'Crea tu primera evaluación para comenzar'
              : `${groups.length} curso${groups.length !== 1 ? 's' : ''} activo${groups.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.teacherBtn}
            onClick={() => setShowTeacherModal(true)}
            title="Perfil docente"
          >
            {teacher.sexo === 'M' ? '👨‍🏫' : teacher.sexo === 'F' ? '👩‍🏫' : '🧑‍🏫'}
            {teacher.name ? ` ${teacher.name}` : ' Perfil'}
          </button>
          <Button onClick={() => setView('rubric-upload')} icon="📊">
            + Nueva Evaluación
          </Button>
        </div>
      </div>

      {/* Tarjetas de curso */}
      {loading ? (
        <div className={styles.loadingState}>Cargando...</div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3 className={styles.emptyTitle}>Sin evaluaciones aún</h3>
          <p className={styles.emptyDesc}>
            Sube una rúbrica en formato Excel o CSV y crea un curso con tus alumnos para empezar a evaluar.
          </p>
          <Button size="lg" onClick={() => setView('rubric-upload')} icon="📊">
            Crear Primera Evaluación
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {groups.map(group => (
            <div key={group.courseName} className={styles.card}>
              {/* Cabecera de la tarjeta */}
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleArea}>
                  <h2 className={styles.cardTitle}>{group.courseName}</h2>
                  <span className={styles.cardSubject}>{group.subject}</span>
                </div>
                <button
                  className={styles.cardMenuBtn}
                  title="Eliminar curso y todas sus evaluaciones"
                  onClick={() => setDeleteTarget({
                    type: 'course-group',
                    courseName: group.courseName,
                    courseIds: group.entries.map(e => e.course.id),
                  })}
                >
                  🗑
                </button>
              </div>

              {/* Lista de evaluaciones (rúbricas) dentro del curso */}
              <div className={styles.evalList}>
                {group.entries.map(entry => {
                  const pct = getProgressPercent(entry.evaluatedStudents, entry.totalStudents);
                  const statusIcon = getStatusIcon(entry.evaluatedStudents, entry.totalStudents);
                  return (
                    <button
                      key={entry.course.id}
                      className={styles.evalItem}
                      onClick={() => handleOpenEvaluation(entry.course, entry.rubric)}
                      title={`Abrir evaluación: ${entry.rubric?.name ?? 'Sin rúbrica'}`}
                    >
                      <div className={styles.evalInfo}>
                        <span className={styles.evalIcon}>{statusIcon}</span>
                        <div className={styles.evalText}>
                          <span className={styles.evalName}>
                            {entry.rubric?.name ?? 'Rúbrica eliminada'}
                          </span>
                          <span className={styles.evalProgress}>
                            {entry.totalStudents > 0
                              ? `${entry.evaluatedStudents}/${entry.totalStudents} evaluados`
                              : 'Sin alumnos'
                            }
                          </span>
                        </div>
                      </div>
                      <div className={styles.evalRight}>
                        {entry.totalStudents > 0 && (
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${pct}%` }}
                              data-complete={pct >= 100 ? 'true' : 'false'}
                            />
                          </div>
                        )}
                        <span className={styles.evalDate}>
                          {entry.course.fechaEvaluacion
                            ? new Date(entry.course.fechaEvaluacion + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
                            : ''
                          }
                        </span>
                        <button
                          className={styles.evalDeleteBtn}
                          title="Eliminar esta evaluación"
                          onClick={e => {
                            e.stopPropagation();
                            if (entry.rubric) {
                              setDeleteTarget({ type: 'rubric', rubric: entry.rubric, course: entry.course });
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pie de tarjeta */}
              <div className={styles.cardFooter}>
                <span className={styles.cardDate}>
                  Creado {new Date(group.entries[group.entries.length - 1].course.createdAt).toLocaleDateString('es-CL')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmar eliminación */}
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
          {deleteTarget?.type === 'rubric' && (
            <p>
              ¿Eliminar la evaluación <strong>"{deleteTarget.rubric.name}"</strong> del curso <strong>{deleteTarget.course.name}</strong>?
              <br /><small>Se eliminarán los alumnos y evaluaciones asociadas.</small>
            </p>
          )}
          {deleteTarget?.type === 'course-group' && (
            <p>
              ¿Eliminar el curso <strong>"{deleteTarget.courseName}"</strong> con <strong>todas sus evaluaciones</strong>?
              <br /><small>Esta acción no se puede deshacer.</small>
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
