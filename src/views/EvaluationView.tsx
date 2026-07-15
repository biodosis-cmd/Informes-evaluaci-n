import { useState } from 'react';
import { db } from '../db/db';
import type { ScoreEntry } from '../db/db';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { calculateGrade, calcRawScore } from '../grading/GradingEngine';
import { buildSingleStudentPrompt } from '../megaprompt/MegaPromptBuilder';
import styles from './EvaluationView.module.css';

export function EvaluationView() {
  const { activeRubric, activeCourse, students, evaluations, setEvaluations, setView, teacher, addToast } = useStore();
  const [saving, setSaving] = useState<string | null>(null);
  const [obsModalId, setObsModalId] = useState<string | null>(null);
  const [obsText, setObsText] = useState('');

  if (!activeRubric || !activeCourse) {
    return (
      <div className={styles.container}>
        <div className="page-header"><h1>Evaluación</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon">✏️</div>
          <h3>Configura un curso primero</h3>
          <p>Necesitas cargar una rúbrica y crear un curso con estudiantes para evaluar.</p>
          <Button onClick={() => setView('course-setup')}>Configurar Curso</Button>
        </div>
      </div>
    );
  }

  const { levels, criteria } = activeRubric.rubricData;

  const getEval = (studentId: string) => evaluations.find(e => e.studentId === studentId);

  const handleScoreChange = async (studentId: string, criterionId: string, levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    const criterion = criteria.find(c => c.id === criterionId);
    if (!level || !criterion) return;

    const ev = getEval(studentId);
    if (!ev) return;

    const newScores: Record<string, ScoreEntry> = {
      ...ev.scores,
      [criterionId]: {
        levelId,
        score: level.maxScore,
        descriptor: criterion.descriptors[levelId] ?? '',
      },
    };

    const rawScore = calcRawScore(newScores);
    const calculatedGrade = calculateGrade(rawScore, activeRubric.gradingConfig);

    const updatedEv = { 
      ...ev, 
      scores: newScores, 
      rawScore, 
      calculatedGrade, 
      isPending: false,
      isDirectGrade: false // si usa rúbrica, quitamos la nota directa
    };

    setSaving(studentId);
    try {
      await db.evaluations.put(updatedEv);
      setEvaluations(evaluations.map(e => e.studentId === studentId ? updatedEv : e));
    } finally {
      setSaving(null);
    }
  };

  const handleDirectGradeToggle = async (studentId: string, currentEv: any) => {
    // Si no hay evaluación, no podemos hacer mucho aún, o creamos una pendiente
    if (!currentEv) return;

    const isDirectNow = !currentEv.isDirectGrade;
    const updatedEv = {
      ...currentEv,
      isDirectGrade: isDirectNow,
      isPending: false,
    };

    if (isDirectNow) {
      // Al activar, borramos puntajes y feedback
      updatedEv.scores = {};
      updatedEv.rawScore = 0;
      updatedEv.aiFeedback = null;
      // Mantenemos la nota que tenga o ponemos la mínima
      if (!updatedEv.calculatedGrade) updatedEv.calculatedGrade = activeRubric.gradingConfig.nmin;
    } else {
      // Al desactivar, recalculamos en base a los scores (que ahora están vacíos)
      updatedEv.isPending = true;
      updatedEv.calculatedGrade = 0;
    }

    setSaving(studentId);
    try {
      await db.evaluations.put(updatedEv);
      setEvaluations(evaluations.map(e => e.studentId === studentId ? updatedEv : e));
    } finally {
      setSaving(null);
    }
  };

  const handleDirectGradeChange = async (studentId: string, currentEv: any, newGrade: number) => {
    if (!currentEv) return;
    
    // Limitar la nota a los rangos permitidos
    const { nmin, nmax } = activeRubric.gradingConfig;
    const boundedGrade = Math.max(nmin, Math.min(nmax, newGrade));

    const updatedEv = {
      ...currentEv,
      calculatedGrade: boundedGrade
    };

    setSaving(studentId);
    try {
      await db.evaluations.put(updatedEv);
      setEvaluations(evaluations.map(e => e.studentId === studentId ? updatedEv : e));
    } finally {
      setSaving(null);
    }
  };

  const handleOpenObs = (studentId: string, currentObs?: string) => {
    setObsText(currentObs ?? '');
    setObsModalId(studentId);
  };

  const handleSaveObs = async () => {
    if (!obsModalId) return;
    const ev = getEval(obsModalId);
    if (!ev) return;

    const updatedEv = { ...ev, observations: obsText.trim() };
    setSaving(obsModalId);
    try {
      await db.evaluations.put(updatedEv);
      setEvaluations(evaluations.map(e => e.studentId === obsModalId ? updatedEv : e));
      setObsModalId(null);
    } finally {
      setSaving(null);
    }
  };

  const completedCount = evaluations.filter(ev => {
    if (ev.isPending) return false;
    const scoredCount = Object.keys(ev.scores).length;
    return scoredCount >= criteria.length;
  }).length;

  const validEvals = evaluations.filter(e => !e.isPending);
  const avgGrade = validEvals.length > 0
    ? (validEvals.reduce((s, e) => s + e.calculatedGrade, 0) / validEvals.length).toFixed(1)
    : '—';

  const validStudentsCount = students.length - evaluations.filter(e => e.isPending).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Grilla de Evaluación</h1>
          <p className={styles.subtitle}>
            {activeCourse.name} · {activeRubric.name}
          </p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statVal}>{completedCount}/{validStudentsCount}</span>
            <span className={styles.statLbl}>Completados</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statVal}>{avgGrade}</span>
            <span className={styles.statLbl}>Promedio</span>
          </div>
          <Button onClick={() => setView('mega-prompt')} icon="🤖">
            Generar Mega Prompt
          </Button>
        </div>
      </div>

      {/* Leyenda de niveles */}
      <div className={styles.legend}>
        {levels.map((level, i) => (
          <div key={level.id} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: LEVEL_COLORS[i % LEVEL_COLORS.length] }} />
            <span>{level.label}</span>
            <span className={styles.legendScore}>{level.maxScore} pts</span>
          </div>
        ))}
      </div>

      {/* Grilla */}
      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.thStudent}>Estudiante</th>
              {criteria.map(c => (
                <th key={c.id} className={styles.thCriterion} title={c.label}>
                  <div className={styles.thCritLabel}>{c.label}</div>
                </th>
              ))}
              <th className={styles.thObs}>Obs.</th>
              <th className={styles.thGrade}>Nota</th>
              <th className={styles.thFeedback}>Feedback IA</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const ev = getEval(student.id);
              const grade = ev?.calculatedGrade ?? 0;
              const config = activeRubric.gradingConfig;
              const approved = grade >= config.napr;
              const hasFeedback = !!ev?.aiFeedback;

              return (
                <tr key={student.id} className={styles.row}>
                  <td className={styles.tdStudent}>
                    <div className={styles.studentName}>{student.name}</div>
                    {student.sexo && (
                      <div className={styles.studentSexo}>{student.sexo === 'M' ? '♂' : '♀'}</div>
                    )}
                  </td>

                  {activeRubric.rubricData.criteria.map((crit) => {
                    const currentLevelId = ev?.scores[crit.id]?.levelId;
                    const isPendingCell = ev?.isPending;
                    const isDirect = ev?.isDirectGrade;

                    return (
                      <td key={crit.id} className={styles.tdCriterion}>
                        {isDirect ? (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                            Manual
                          </div>
                        ) : (
                          <div className={styles.levelButtons}>
                            {levels.map((level, li) => {
                              const isSelected = !isPendingCell && currentLevelId === level.id;
                              return (
                                <button
                                  key={level.id}
                                  className={`${styles.levelBtn} ${isSelected ? styles.levelBtnSelected : ''}`}
                                  style={isSelected ? { background: LEVEL_COLORS[li % LEVEL_COLORS.length] + '22', borderColor: LEVEL_COLORS[li % LEVEL_COLORS.length] } : {}}
                                  onClick={() => handleScoreChange(student.id, crit.id, level.id)}
                                  title={`${level.label}: ${crit.descriptors[level.id] ?? ''}`}
                                  aria-pressed={isSelected}
                                >
                                  {level.maxScore}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className={styles.tdObs}>
                    <button
                      className={`${styles.obsBtn} ${ev?.observations ? styles.obsBtnActive : ''}`}
                      onClick={() => handleOpenObs(student.id, ev?.observations)}
                      title={ev?.observations ? 'Editar observaciones' : 'Añadir observación'}
                      aria-label="Observaciones"
                    >
                      {ev?.observations ? '📝' : '💬'}
                    </button>
                  </td>

                  <td className={styles.tdGrade}>
                    <div className={styles.gradeContainer}>
                      {saving === student.id ? (
                        <span className={styles.savingIndicator}>...</span>
                      ) : ev?.isPending && !ev?.isDirectGrade ? (
                        <span className={styles.pendingBadge}>Pendiente</span>
                      ) : ev?.isDirectGrade ? (
                        <input
                          type="number"
                          className={styles.directGradeInput}
                          value={ev.calculatedGrade || ''}
                          min={config.nmin}
                          max={config.nmax}
                          step="0.1"
                          onChange={e => handleDirectGradeChange(student.id, ev, parseFloat(e.target.value))}
                          onBlur={e => {
                            if (isNaN(parseFloat(e.target.value))) {
                              handleDirectGradeChange(student.id, ev, config.nmin);
                            }
                          }}
                        />
                      ) : (
                        <span className={`${styles.grade} ${approved ? styles.approved : styles.failed}`}>
                          {ev ? grade.toFixed(1) : '—'}
                        </span>
                      )}
                      
                      {ev && (
                        <button 
                          className={`${styles.directGradeBtn} ${ev.isDirectGrade ? styles.directGradeBtnActive : ''}`}
                          onClick={() => handleDirectGradeToggle(student.id, ev)}
                          title={ev.isDirectGrade ? "Volver a Rúbrica" : "Ingresar Nota Directa"}
                        >
                          ✍️
                        </button>
                      )}
                    </div>
                  </td>

                  <td className={styles.tdFeedback}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                      {hasFeedback ? (
                        <span className={styles.feedbackDone} title="Feedback importado">✓</span>
                      ) : (
                        <span className={styles.feedbackPending}>—</span>
                      )}
                      {!ev?.isPending && ev && (
                        <button
                          className={styles.miniPromptBtn}
                          title="Generar prompt IA individual"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const prompt = buildSingleStudentPrompt(
                              { rubric: activeRubric, course: activeCourse, students, evaluations, teacher },
                              student.id
                            );
                            try {
                              await navigator.clipboard.writeText(prompt);
                              addToast({ type: 'success', message: `🤖 Prompt de ${student.name} copiado al portapapeles` });
                            } catch {
                              addToast({ type: 'error', message: 'No se pudo copiar.' });
                            }
                          }}
                        >
                          🤖
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.bottomBar}>
        <span className={styles.bottomInfo}>
          💡 Haz clic en el puntaje de cada nivel para seleccionarlo. Los cambios se guardan automáticamente.
        </span>
        <div className={styles.bottomActions}>
          <Button variant="secondary" onClick={() => setView('course-setup')} icon="←">Volver</Button>
          <Button onClick={() => setView('mega-prompt')} icon="🤖">Generar Mega Prompt</Button>
        </div>
      </div>

      <Modal
        isOpen={!!obsModalId}
        onClose={() => setObsModalId(null)}
        title="Contexto u Observaciones"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setObsModalId(null)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveObs}>Guardar</Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Escribe aquí cualquier situación particular (ej. "el estudiante estaba enfermo", "hubo un problema técnico")
          que deba considerarse para la retroalimentación pedagógica, sin afectar su nota.
        </p>
        <textarea
          className={styles.obsTextarea}
          value={obsText}
          onChange={e => setObsText(e.target.value)}
          placeholder="Escribe tus observaciones aquí..."
          rows={5}
        />
      </Modal>
    </div>
  );
}

const LEVEL_COLORS = [
  '#10b981', // verde - logrado
  '#3b6ef8', // azul - medianamente
  '#f59e0b', // ámbar - por lograr
  '#ef4444', // rojo - no observado
  '#8b5cf6', // violeta - nivel 5
];
