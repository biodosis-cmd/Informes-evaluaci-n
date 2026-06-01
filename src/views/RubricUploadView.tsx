import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { Rubric, GradingConfig } from '../db/db';
import { parseXlsx, parseRubricMatrix } from '../parser/RubricParser';
import { parseCsv } from '../parser/CsvAdapter';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { DEFAULT_GRADING_CONFIG } from '../grading/GradingEngine';
import styles from './RubricUploadView.module.css';

type Step = 'upload' | 'confirm';

export function RubricUploadView() {
  const { setView, addToast, parsePreview, setParsePreview, setActiveRubric, setRubricParseStatus } = useStore();
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [rubricName, setRubricName] = useState('');
  const [config, setConfig] = useState<Omit<GradingConfig, 'pmax'>>(DEFAULT_GRADING_CONFIG);
  const [saving, setSaving] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setRubricParseStatus('parsing');
    try {
      let output;
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        output = parseCsv(text);
      } else {
        const buffer = await file.arrayBuffer();
        const matrix = parseXlsx(buffer);
        output = parseRubricMatrix(matrix);
      }

      if (output.errors.some(e => e.type === 'error')) {
        addToast({ type: 'error', message: output.errors.find(e => e.type === 'error')!.message });
        setRubricParseStatus('error');
        return;
      }

      if (output.result) {
        setParsePreview({
          ...output.result,
          fileName: file.name,
          warnings: output.errors.filter(e => e.type === 'warning').map(e => e.message),
        });
        setRubricName(output.result.suggestedName);
        setStep('confirm');
        setRubricParseStatus('confirming');
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Error al procesar el archivo. Verifica que sea un Excel o CSV válido.' });
      setRubricParseStatus('error');
    }
  }, [addToast, setParsePreview, setRubricParseStatus]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    if (!parsePreview || !rubricName.trim()) return;
    setSaving(true);
    try {
      const pmax = parsePreview.maxScore;
      const rubric: Rubric = {
        id: uuidv4(),
        name: rubricName.trim(),
        fileName: parsePreview.fileName,
        uploadedAt: Date.now(),
        rubricMeta: parsePreview.rubricMeta,
        gradingConfig: { ...config, pmax },
        rubricData: parsePreview.rubricData,
      };
      await db.rubrics.add(rubric);
      setActiveRubric(rubric);
      setRubricParseStatus('idle');
      setParsePreview(null);
      addToast({ type: 'success', message: `Rúbrica "${rubric.name}" guardada correctamente` });
      setView('course-setup');
    } catch (err) {
      addToast({ type: 'error', message: 'Error al guardar la rúbrica.' });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setStep('upload');
    setParsePreview(null);
    setRubricParseStatus('idle');
  };

  if (step === 'confirm' && parsePreview) {
    return (
      <div className={styles.container}>
        <div className="page-header">
          <h1>Confirmar Estructura de Rúbrica</h1>
          <p>Verifica que la inferencia sea correcta antes de guardar.</p>
        </div>

        {parsePreview.warnings.length > 0 && (
          <div className={styles.warnings}>
            {parsePreview.warnings.map((w, i) => (
              <div key={i} className={styles.warning}>⚠ {w}</div>
            ))}
          </div>
        )}

        {/* Nombre de la rúbrica */}
        <div className={styles.configSection}>
          <label className={styles.label} htmlFor="rubric-name">Nombre de la Rúbrica</label>
          <input
            id="rubric-name"
            className={styles.input}
            value={rubricName}
            onChange={e => setRubricName(e.target.value)}
            placeholder="Nombre de la rúbrica..."
          />
        </div>

        {/* Config de escala */}
        <div className={styles.configSection}>
          <h3 className={styles.configTitle}>Configuración de Escala de Notas</h3>
          <div className={styles.configGrid}>
            {([
              { key: 'exig', label: 'Exigencia (%)', min: 1, max: 100, step: 1 },
              { key: 'nmin', label: 'Nota mínima', min: 1, max: 7, step: 0.1 },
              { key: 'nmax', label: 'Nota máxima', min: 1, max: 10, step: 0.1 },
              { key: 'napr', label: 'Nota aprobación', min: 1, max: 7, step: 0.1 },
            ] as const).map(({ key, label, min, max, step }) => (
              <div key={key} className={styles.configField}>
                <label className={styles.fieldLabel}>{label}</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={config[key]}
                  min={min}
                  max={max}
                  step={step}
                  onChange={e => setConfig(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <div className={styles.pmaxInfo}>
            Puntaje máximo detectado: <strong>{parsePreview.maxScore} pts</strong>
            ({parsePreview.rubricData.criteria.length} criterios × {Math.max(...parsePreview.rubricData.levels.map(l => l.maxScore))} pts)
          </div>
        </div>

        {/* Preview de la tabla */}
        <div className={styles.configSection}>
          <h3 className={styles.configTitle}>
            Vista Previa — {parsePreview.rubricData.criteria.length} Criterios · {parsePreview.rubricData.levels.length} Niveles
          </h3>
          <div className={styles.tableWrap}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>Criterio</th>
                  {parsePreview.rubricData.levels.map(l => (
                    <th key={l.id}>
                      <div>{l.label}</div>
                      <div className={styles.levelScore}>{l.maxScore} pts</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsePreview.rubricData.criteria.map(c => (
                  <tr key={c.id}>
                    <td className={styles.criterionCell}>{c.label}</td>
                    {parsePreview.rubricData.levels.map(l => (
                      <td key={l.id} className={styles.descriptorCell}>
                        {c.descriptors[l.id] || <span className={styles.empty}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metadatos detectados */}
        {(parsePreview.rubricMeta.title || parsePreview.rubricMeta.course) && (
          <div className={styles.metaBox}>
            <div className={styles.metaTitle}>Metadatos detectados del archivo</div>
            {parsePreview.rubricMeta.title && <div><span className={styles.metaKey}>Título:</span> {parsePreview.rubricMeta.title}</div>}
            {parsePreview.rubricMeta.course && <div><span className={styles.metaKey}>Curso:</span> {parsePreview.rubricMeta.course}</div>}
            {parsePreview.rubricMeta.subject && <div><span className={styles.metaKey}>Asignatura:</span> {parsePreview.rubricMeta.subject}</div>}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleBack}>← Volver</Button>
          <Button onClick={handleSave} loading={saving} disabled={!rubricName.trim()}>Guardar Rúbrica</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="page-header">
        <h1>Cargar Rúbrica</h1>
        <p>Sube tu archivo Excel (.xlsx) o CSV (.csv). La app inferirá automáticamente criterios, niveles y descriptores.</p>
      </div>

      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de archivos"
        onKeyDown={e => e.key === 'Enter' && document.getElementById('file-input')?.click()}
      >
        <div className={styles.dropzoneIcon}>📊</div>
        <div className={styles.dropzoneTitle}>Arrastra tu archivo aquí</div>
        <div className={styles.dropzoneSub}>o</div>
        <label htmlFor="file-input" className={styles.fileLabel}>
          Seleccionar archivo
        </label>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          className={styles.fileInput}
          onChange={handleFileInput}
        />
        <div className={styles.dropzoneHint}>Soporta .xlsx, .xls y .csv</div>
      </div>

      {/* Formato esperado */}
      <div className={styles.formatGuide}>
        <h3 className={styles.formatTitle}>📋 Formato esperado del archivo</h3>
        <div className={styles.formatGrid}>
          <div className={styles.formatItem}>
            <div className={styles.formatLabel}>Fila 1 (encabezado)</div>
            <div className={styles.formatCode}>"Criterios de Evaluación" | Nivel 1 | Nivel 2 | ...</div>
          </div>
          <div className={styles.formatItem}>
            <div className={styles.formatLabel}>Fila 2+ (opcional)</div>
            <div className={styles.formatCode}>&lt;vacío&gt; | 4 | 3 | 2 | 1  ← puntajes</div>
          </div>
          <div className={styles.formatItem}>
            <div className={styles.formatLabel}>Resto de filas</div>
            <div className={styles.formatCode}>"Criterio" | "Descriptor..." | "Descriptor..."</div>
          </div>
        </div>
        <div className={styles.formatNote}>
          💡 Las filas de metadatos previas (título, curso, objetivo) son detectadas y extraídas automáticamente.
        </div>
      </div>
    </div>
  );
}
