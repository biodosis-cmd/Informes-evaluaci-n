import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { Course, Student, Evaluation, ScoreEntry } from '../db/db';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { parseSmartPaste } from '../parser/SmartPasteParser';
import { calculateGrade, calcRawScore, calcMaxRawScore } from '../grading/GradingEngine';
import styles from './CourseSetupView.module.css';

export function CourseSetupView() {
  const { activeRubric, activeCourse, setActiveCourse, setStudents, setEvaluations, setView, addToast } = useStore();
  const [courseName, setCourseName] = useState(activeCourse?.name ?? '');
  const [subject, setSubject] = useState(activeCourse?.subject ?? activeRubric?.rubricMeta?.subject ?? '');
  const [period, setPeriod] = useState(activeCourse?.period ?? '');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(
    activeCourse?.fechaEvaluacion ?? new Date().toISOString().slice(0, 10)
  );
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<ReturnType<typeof parseSmartPaste>['rows']>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!activeRubric) {
    return (
      <div className={styles.container}>
        <div className="page-header"><h1>Configurar Curso</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Primero carga una rúbrica</h3>
          <p>Necesitas cargar una rúbrica antes de crear un curso.</p>
          <Button onClick={() => setView('rubric-upload')}>Cargar Rúbrica</Button>
        </div>
      </div>
    );
  }

  const handleParse = () => {
    if (!pasteText.trim()) return;
    const result = parseSmartPaste(pasteText, activeRubric.rubricData.criteria.length);
    if (result.errors.length) {
      result.errors.forEach(e => addToast({ type: 'error', message: e }));
      return;
    }
    setParsedRows(result.rows);
    setParseWarnings(result.warnings);
    if (result.warnings.length) {
      addToast({ type: 'warning', message: `${result.warnings.length} advertencia(s) al procesar el pegado` });
    }
    addToast({ type: 'success', message: `${result.rows.length} estudiantes detectados` });
  };

  const handleSave = async () => {
    if (!courseName.trim() || parsedRows.length === 0) return;
    setSaving(true);
    try {
      const courseId = uuidv4();
      const course: Course = {
        id: courseId,
        rubricId: activeRubric.id,
        name: courseName.trim(),
        subject: subject.trim(),
        period: period.trim(),
        fechaEvaluacion: fechaEvaluacion || undefined,
        createdAt: Date.now(),
      };
      await db.courses.add(course);

      const students: Student[] = parsedRows.map((row, i) => ({
        id: uuidv4(),
        courseId,
        rut: row.rut,
        name: row.name,
        sexo: row.sexo,
        order: i,
      }));
      await db.students.bulkAdd(students);

      // Crear evaluaciones con los scores del Smart Paste
      const levels = activeRubric.rubricData.levels;
      const criteria = activeRubric.rubricData.criteria;
      const maxRawScore = calcMaxRawScore(criteria, levels);

      const evaluations: Evaluation[] = students.map((student, si) => {
        const row = parsedRows[si];
        const scores: Record<string, ScoreEntry> = {};

        criteria.forEach((crit, ci) => {
          const pastedScore = row.scores[ci] ?? 0;
          // Encontrar el nivel más cercano al puntaje pegado
          const sortedLevels = [...levels].sort((a, b) => b.maxScore - a.maxScore);
          const matchedLevel = sortedLevels.find(l => l.maxScore <= pastedScore) ?? sortedLevels[sortedLevels.length - 1];
          scores[crit.id] = {
            levelId: matchedLevel.id,
            score: pastedScore,
            descriptor: crit.descriptors[matchedLevel.id] ?? '',
          };
        });

        const rawScore = calcRawScore(scores);
        const calculatedGrade = calculateGrade(rawScore, activeRubric.gradingConfig);

        return {
          id: uuidv4(),
          studentId: student.id,
          courseId,
          rubricId: activeRubric.id,
          completedAt: Date.now(),
          scores,
          rawScore,
          maxRawScore,
          calculatedGrade,
          isPending: row.isPending,
          aiFeedback: null,
        };
      });

      await db.evaluations.bulkAdd(evaluations);

      setActiveCourse(course);
      setStudents(students);
      setEvaluations(evaluations);
      addToast({ type: 'success', message: `Curso "${course.name}" creado con ${students.length} estudiantes` });
      setView('evaluation');
    } catch (err) {
      addToast({ type: 'error', message: 'Error al guardar el curso.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className="page-header">
        <h1>Configurar Curso</h1>
        <p>Ingresa los datos del curso y pega la lista de estudiantes desde Excel.</p>
      </div>

      <div className={styles.rubricBadge}>
        <span className={styles.rubricBadgeIcon}>📊</span>
        <span>Rúbrica activa: <strong>{activeRubric.name}</strong></span>
        <span className={styles.rubricBadgeMeta}>
          {activeRubric.rubricData.criteria.length} criterios · {activeRubric.rubricData.levels.length} niveles
        </span>
      </div>

      {/* Datos del curso */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Datos del Curso</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="course-name">Nombre del Curso *</label>
            <input id="course-name" className={styles.input} value={courseName}
              onChange={e => setCourseName(e.target.value)} placeholder="Ej: 8vo Básico A" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="subject">Asignatura</label>
            <input id="subject" className={styles.input} value={subject}
              onChange={e => setSubject(e.target.value)} placeholder="Ej: Ed. Física y Salud" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="period">Período</label>
            <input id="period" className={styles.input} value={period}
              onChange={e => setPeriod(e.target.value)} placeholder="Ej: 2025-1" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fecha-evaluacion">Fecha de Evaluación</label>
            <input
              id="fecha-evaluacion"
              type="date"
              className={styles.input}
              value={fechaEvaluacion}
              onChange={e => setFechaEvaluacion(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Smart Paste */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Smart Paste de Estudiantes</h2>
        <div className={styles.pasteGuide}>
          <strong>Formato esperado:</strong> Copia desde Excel con columnas: <code>RUT | Sexo | Nombre | Indicador 1 | Indicador 2 | ...</code>
          <br /><small>Sexo: H/M, Hombre/Mujer o Masculino/Femenino</small>
        </div>
        <textarea
          ref={textareaRef}
          className={styles.pasteArea}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          onPaste={e => {
            const pasted = e.clipboardData.getData('text');
            setTimeout(() => { setPasteText(pasted); handleParse(); }, 50);
          }}
          placeholder="Pega aquí directamente desde Excel (Ctrl+V)..."
          rows={8}
          spellCheck={false}
        />
        <div className={styles.pasteActions}>
          <Button variant="secondary" onClick={() => { setPasteText(''); setParsedRows([]); }}>Limpiar</Button>
          <Button onClick={handleParse} icon="⚡" disabled={!pasteText.trim()}>Procesar Pegado</Button>
        </div>

        {parseWarnings.length > 0 && (
          <div className={styles.warnings}>
            {parseWarnings.map((w, i) => <div key={i} className={styles.warning}>⚠ {w}</div>)}
          </div>
        )}

        {/* Preview de la tabla */}
        {parsedRows.length > 0 && (
          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <strong>{parsedRows.length} estudiantes detectados</strong>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>RUT</th>
                    <th>Sexo</th>
                    <th>Nombre</th>
                    {activeRubric.rubricData.criteria.map((c, i) => (
                      <th key={c.id} title={c.label}>Ind. {i + 1}</th>
                    ))}
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => {
                    const scoreMap: Record<string, { score: number }> = {};
                    activeRubric.rubricData.criteria.forEach((c, ci) => {
                      scoreMap[c.id] = { score: row.scores[ci] ?? 0 };
                    });
                    const rawScore = calcRawScore(scoreMap);
                    const nota = calculateGrade(rawScore, activeRubric.gradingConfig);
                    const approved = nota >= activeRubric.gradingConfig.napr;
                    return (
                      <tr key={i}>
                        <td className={styles.indexCell}>{i + 1}</td>
                        <td className={styles.nameCell}>{row.rut}</td>
                        <td className={styles.sexoCell}>{row.sexo || '—'}</td>
                        <td className={styles.nameCell}>{row.name}</td>
                        {row.scores.map((s, si) => <td key={si} className={styles.scoreCell}>{row.isPending ? '—' : s}</td>)}
                        {row.isPending ? (
                          <td className={styles.gradeCell}>
                            <span className={styles.pendingBadge}>Pendiente</span>
                          </td>
                        ) : (
                          <td className={`${styles.gradeCell} ${approved ? styles.approved : styles.failed}`}>
                            {nota.toFixed(1)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className={styles.saveBar}>
        <div className={styles.saveInfo}>
          {parsedRows.length > 0 ? `${parsedRows.length} estudiantes listos para guardar` : 'Pega los estudiantes para continuar'}
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!courseName.trim() || parsedRows.length === 0}
          size="lg"
          icon="💾"
        >
          Guardar Curso y Continuar
        </Button>
      </div>
    </div>
  );
}
