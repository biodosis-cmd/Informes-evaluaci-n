import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { buildMegaPrompt } from '../megaprompt/MegaPromptBuilder';
import styles from './MegaPromptView.module.css';

export function MegaPromptView() {
  const { activeRubric, activeCourse, students, evaluations, teacher, setView, megaPrompt, setMegaPrompt, addToast } = useStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeRubric || !activeCourse || students.length === 0) return;
    const prompt = buildMegaPrompt({ rubric: activeRubric, course: activeCourse, students, evaluations, teacher });
    setMegaPrompt(prompt);
  }, [activeRubric, activeCourse, students, evaluations, teacher]);

  if (!activeRubric || !activeCourse) {
    return (
      <div className={styles.container}>
        <div className="page-header"><h1>Mega Prompt</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <h3>Primero completa la evaluación</h3>
          <p>Necesitas cargar una rúbrica y evaluar a los estudiantes del curso.</p>
          <Button onClick={() => setView('evaluation')}>Ir a Evaluación</Button>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(megaPrompt);
      setCopied(true);
      addToast({ type: 'success', message: '¡Mega Prompt copiado al portapapeles!' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast({ type: 'error', message: 'No se pudo copiar. Selecciona el texto manualmente.' });
    }
  };

  const charCount = megaPrompt.length;
  const wordsEstimate = Math.round(charCount / 5);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🤖 Mega Prompt</h1>
          <p className={styles.subtitle}>
            Copia este prompt y pégalo en ChatGPT, Gemini, Claude u otra IA.
            La IA generará el feedback para todos los estudiantes en el JSON especificado.
          </p>
        </div>
      </div>

      {/* Info bar */}
      <div className={styles.infoBar}>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>👥</span>
          <span><strong>{students.length}</strong> estudiantes</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>📊</span>
          <span><strong>{activeRubric.rubricData.criteria.length}</strong> criterios</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>📝</span>
          <span>~{wordsEstimate.toLocaleString('es-CL')} palabras</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>🔤</span>
          <span>{charCount.toLocaleString('es-CL')} caracteres</span>
        </div>
      </div>

      {/* Instrucciones de uso */}
      <div className={styles.instructions}>
        <div className={styles.step}>
          <div className={styles.stepNum}>1</div>
          <div className={styles.stepText}>Copia el prompt con el botón de abajo</div>
        </div>
        <div className={styles.stepArrow}>→</div>
        <div className={styles.step}>
          <div className={styles.stepNum}>2</div>
          <div className={styles.stepText}>Pégalo en ChatGPT, Gemini o Claude</div>
        </div>
        <div className={styles.stepArrow}>→</div>
        <div className={styles.step}>
          <div className={styles.stepNum}>3</div>
          <div className={styles.stepText}>Copia la respuesta JSON de la IA</div>
        </div>
        <div className={styles.stepArrow}>→</div>
        <div className={styles.step}>
          <div className={styles.stepNum}>4</div>
          <div className={styles.stepText}>Ve a "Importar IA" y pégala allí</div>
        </div>
      </div>

      {/* Bloque del prompt */}
      <div className={styles.promptWrapper}>
        <div className={styles.promptHeader}>
          <span className={styles.promptLabel}>
            <span className={styles.dot} />
            <span className={styles.dot} style={{ background: '#f59e0b' }} />
            <span className={styles.dot} style={{ background: '#10b981' }} />
            Mega Prompt — Listo para copiar
          </span>
          <button
            id="copy-megaprompt-btn"
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ ¡Copiado!' : '📋 Copiar Mega Prompt'}
          </button>
        </div>
        <textarea
          className={styles.promptTextarea}
          value={megaPrompt}
          readOnly
          spellCheck={false}
          aria-label="Mega Prompt para copiar a IA externa"
          onClick={e => (e.target as HTMLTextAreaElement).select()}
        />
      </div>

      <div className={styles.bottomBar}>
        <Button variant="secondary" onClick={() => setView('evaluation')} icon="←">Volver a Evaluación</Button>
        <Button onClick={handleCopy} icon={copied ? '✓' : '📋'} variant={copied ? 'success' : 'primary'} size="lg">
          {copied ? '¡Copiado!' : 'Copiar Mega Prompt'}
        </Button>
        <Button variant="ghost" onClick={() => setView('json-ingestion')} icon="→" iconPosition="right">
          Importar Respuesta IA
        </Button>
      </div>
    </div>
  );
}
