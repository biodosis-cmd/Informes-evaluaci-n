import { useState, useCallback } from 'react';
import { db } from '../db/db';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { validateJsonIngestion, type ValidationStatus } from '../megaprompt/JsonIngestionValidator';
import styles from './JsonIngestionView.module.css';

const STATUS_CONFIG: Record<ValidationStatus, { label: string; cls: string; icon: string }> = {
  empty:   { label: 'Esperando JSON...', cls: 'empty',   icon: '⬜' },
  invalid: { label: '',                  cls: 'invalid',  icon: '🔴' },
  partial: { label: '',                  cls: 'partial',  icon: '🟡' },
  valid:   { label: '',                  cls: 'valid',    icon: '🟢' },
};

export function JsonIngestionView() {
  const { activeCourse, students, evaluations, setEvaluations, setView, addToast } = useStore();
  const [rawJson, setRawJson] = useState('');
  const [importing, setImporting] = useState(false);

  const expectedIds = students
    .filter(s => !evaluations.find(e => e.studentId === s.id)?.isPending)
    .map(s => s.id);
  const validation = validateJsonIngestion(rawJson, expectedIds);

  const handleImport = useCallback(async () => {
    if (!validation.data || (validation.status !== 'valid' && validation.status !== 'partial')) return;
    setImporting(true);
    try {
      const feedbackMap = new Map(validation.data.feedbacks.map(f => [f.studentId, f]));
      const now = Date.now();

      const updatedEvals = evaluations.map(ev => {
        const fb = feedbackMap.get(ev.studentId);
        if (!fb) return ev;
        return {
          ...ev,
          aiFeedback: {
            strength: fb.strength,
            challenge: fb.challenge,
            suggestion: fb.suggestion,
            importedAt: now,
          },
        };
      });

      await db.evaluations.bulkPut(updatedEvals);
      setEvaluations(updatedEvals);
      addToast({ type: 'success', message: `✓ ${validation.data.feedbacks.length} feedbacks importados correctamente` });
      setView('reports');
    } catch (err) {
      addToast({ type: 'error', message: 'Error al importar el feedback.' });
    } finally {
      setImporting(false);
    }
  }, [validation, evaluations, setEvaluations, addToast, setView]);

  if (!activeCourse) {
    return (
      <div className={styles.container}>
        <div className="page-header"><h1>Importar Feedback IA</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon">📥</div>
          <h3>No hay curso activo</h3>
          <p>Primero debes generar el Mega Prompt y enviarlo a una IA.</p>
          <Button onClick={() => setView('mega-prompt')}>Ir a Mega Prompt</Button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[validation.status];
  const studentsWithFeedback = evaluations.filter(e => e.aiFeedback !== null).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📥 Importar Respuesta IA</h1>
          <p className={styles.subtitle}>
            Pega aquí el JSON que generó la IA al procesar el Mega Prompt. El validador verificará el formato en tiempo real.
          </p>
        </div>
      </div>

      {/* Estado actual */}
      {studentsWithFeedback > 0 && (
        <div className={styles.existingFeedback}>
          ✓ Ya tienes feedback importado para <strong>{studentsWithFeedback}</strong> de {students.length} estudiantes.
          Puedes reemplazarlo pegando un nuevo JSON.
        </div>
      )}

      {/* Área de ingesta */}
      <div className={styles.panelWrapper}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>
            <span className={styles.dot} />
            <span className={styles.dot} style={{ background: '#f59e0b' }} />
            <span className={styles.dot} style={{ background: '#10b981' }} />
            Respuesta JSON de la IA
          </span>
          <div className={`${styles.statusChip} ${styles[statusCfg.cls]}`}>
            <span>{statusCfg.icon}</span>
            <span>
              {validation.status === 'empty' ? statusCfg.label : validation.message}
            </span>
          </div>
        </div>

        <textarea
          id="json-ingestion-textarea"
          className={`${styles.jsonArea} ${styles[`border_${statusCfg.cls}`]}`}
          value={rawJson}
          onChange={e => setRawJson(e.target.value)}
          placeholder={'Pega aquí el JSON de la IA...\n\nEjemplo:\n{\n  "courseId": "...",\n  "feedbacks": [\n    {\n      "studentId": "...",\n      "strength": "...",\n      "challenge": "...",\n      "suggestion": "..."\n    }\n  ]\n}'}
          spellCheck={false}
          rows={20}
          aria-label="Área de ingesta de JSON de IA"
          aria-describedby="validation-status"
        />

        {/* Detalles del error o estado */}
        {validation.status === 'partial' && validation.missingStudentIds && (
          <div className={styles.partialDetail}>
            <strong>Estudiantes sin feedback:</strong>
            <ul>
              {validation.missingStudentIds.map(id => {
                const student = students.find(s => s.id === id);
                return <li key={id}>{student?.name ?? id}</li>;
              })}
            </ul>
          </div>
        )}

        {validation.status === 'valid' && validation.data && (
          <div className={styles.validDetail}>
            ✓ JSON válido con <strong>{validation.data.feedbacks.length} feedbacks</strong>.
            Los datos son correctos y están listos para importar.
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomLeft}>
          <Button variant="ghost" onClick={() => setRawJson('')}>Limpiar</Button>
          <Button variant="secondary" onClick={() => setView('mega-prompt')} icon="←">Volver a Mega Prompt</Button>
        </div>
        <Button
          id="import-feedback-btn"
          onClick={handleImport}
          loading={importing}
          disabled={validation.status !== 'valid' && validation.status !== 'partial'}
          size="lg"
          icon="📥"
          variant={validation.status === 'valid' ? 'success' : 'primary'}
        >
          Importar Feedback ({validation.data?.feedbacks.length ?? 0})
        </Button>
      </div>
    </div>
  );
}
