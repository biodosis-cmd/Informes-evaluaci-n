import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { calcPercentage } from '../grading/GradingEngine';
import styles from './ReportsView.module.css';

export function ReportsView() {
  const { activeRubric, activeCourse, students, evaluations, teacher, setView } = useStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<'pdf' | 'word' | null>(null);

  if (!activeRubric || !activeCourse || students.length === 0) {
    return (
      <div className={styles.container}>
        <div className="page-header"><h1>Informes</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No hay datos para exportar</h3>
          <p>Primero completa la evaluación e importa el feedback de la IA.</p>
          <Button onClick={() => setView('evaluation')}>Ir a Evaluación</Button>
        </div>
      </div>
    );
  }

  const evalMap = new Map(evaluations.map(e => [e.studentId, e]));
  const withFeedback = evaluations.filter(e => e.aiFeedback !== null).length;
  const allSelected = selectedIds.size === students.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map(s => s.id)));
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportTargets = selectedIds.size > 0
    ? students.filter(s => selectedIds.has(s.id))
    : students;

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const { exportPDFBatch } = await import('../export/pdf/pdfExporter');
      const evals = exportTargets.map(s => evalMap.get(s.id)!).filter(Boolean);
      await exportPDFBatch(exportTargets, evals, activeRubric, activeCourse, teacher.name || undefined);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportWord = async () => {
    setExporting('word');
    try {
      const { exportWordBatch } = await import('../export/word/wordExporter');
      const evals = exportTargets.map(s => evalMap.get(s.id)!).filter(Boolean);
      await exportWordBatch(exportTargets, evals, activeRubric, activeCourse, teacher.name || undefined);
    } catch (err) {
      console.error('Word export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const avg = evaluations.length > 0
    ? (evaluations.reduce((s, e) => s + e.calculatedGrade, 0) / evaluations.length)
    : 0;

  const approved = evaluations.filter(e => e.calculatedGrade >= activeRubric.gradingConfig.napr).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📄 Informes</h1>
          <p className={styles.subtitle}>
            {activeCourse.name} · {activeRubric.name}
          </p>
        </div>
        <div className={styles.exportActions}>
          <Button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            loading={exporting === 'pdf'}
            disabled={exporting !== null}
            icon="📄"
          >
            Descargar PDF
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ` (${students.length})`}
          </Button>
          <Button
            id="export-word-btn"
            onClick={handleExportWord}
            loading={exporting === 'word'}
            disabled={exporting !== null}
            variant="secondary"
            icon="📝"
          >
            Descargar Word
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ` (${students.length})`}
          </Button>
        </div>
      </div>

      {/* Resumen del curso */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryVal}>{students.length}</div>
          <div className={styles.summaryLbl}>Estudiantes</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryVal}>{avg.toFixed(1)}</div>
          <div className={styles.summaryLbl}>Promedio</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={`${styles.summaryVal} ${styles.successVal}`}>{approved}</div>
          <div className={styles.summaryLbl}>Aprobados</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={`${styles.summaryVal} ${styles.failVal}`}>{students.length - approved}</div>
          <div className={styles.summaryLbl}>Reprobados</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryVal}>{withFeedback}</div>
          <div className={styles.summaryLbl}>Con Feedback IA</div>
        </div>
      </div>

      {/* Advertencia si faltan feedbacks */}
      {withFeedback < students.length && (
        <div className={styles.warningBar}>
          ⚠ {students.length - withFeedback} estudiantes no tienen feedback de IA. Los informes se generarán sin sección de retroalimentación.
          <button className={styles.warningLink} onClick={() => setView('json-ingestion')}>
            Importar ahora →
          </button>
        </div>
      )}

      {/* Lista de estudiantes */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              id="select-all-students"
            />
            Seleccionar todos
          </label>
          <span className={styles.selectionInfo}>
            {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Todos (sin selección)'}
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thCheck}></th>
                <th>Nombre</th>
                <th className={styles.thCenter}>Sexo</th>
                <th className={styles.thCenter}>Puntaje</th>
                <th className={styles.thCenter}>%</th>
                <th className={styles.thCenter}>Nota</th>
                <th className={styles.thCenter}>Estado</th>
                <th className={styles.thCenter}>Feedback IA</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const ev = evalMap.get(student.id);
                const grade = ev?.calculatedGrade ?? 0;
                const approved = grade >= activeRubric.gradingConfig.napr;
                const pct = ev ? calcPercentage(ev.rawScore, ev.maxRawScore) : 0;
                const hasFeedback = !!ev?.aiFeedback;
                const isSelected = selectedIds.has(student.id);

                return (
                  <tr
                    key={student.id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <td className={styles.tdCheck}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(student.id)}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Seleccionar ${student.name}`}
                      />
                    </td>
                    <td className={styles.tdName}>
                      <span className={styles.nameText}>{student.name}</span>
                    </td>
                    <td className={styles.tdCenter}>{student.sexo || '—'}</td>
                    <td className={styles.tdCenter}>
                      <span className={styles.monoText}>{ev ? `${ev.rawScore}/${ev.maxRawScore}` : '—'}</span>
                    </td>
                    <td className={styles.tdCenter}>
                      <div className={styles.pctBar}>
                        <div className={styles.pctFill} style={{ width: `${pct}%`, background: approved ? 'var(--color-success-500)' : 'var(--color-danger-500)' }} />
                        <span className={styles.pctLabel}>{pct}%</span>
                      </div>
                    </td>
                    <td className={styles.tdCenter}>
                      <span className={`${styles.grade} ${approved ? styles.approved : styles.failed}`}>
                        {ev ? grade.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className={styles.tdCenter}>
                      <span className={`${styles.statusPill} ${approved ? styles.pillApproved : styles.pillFailed}`}>
                        {approved ? 'Aprobado' : 'Reprobado'}
                      </span>
                    </td>
                    <td className={styles.tdCenter}>
                      {hasFeedback ? (
                        <span className={styles.feedbackOk} title="Tiene feedback de IA">✓</span>
                      ) : (
                        <span className={styles.feedbackNo}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
