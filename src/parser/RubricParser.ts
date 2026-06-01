import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { RubricData, RubricLevel, RubricCriterion, RubricMeta } from '../db/db';

export interface ParseResult {
  rubricData: RubricData;
  rubricMeta: RubricMeta;
  suggestedName: string;
  maxScore: number;
}

export interface ParseError {
  type: 'error' | 'warning';
  message: string;
}

export interface ParseOutput {
  result?: ParseResult;
  errors: ParseError[];
}

/* ── XlsxAdapter ── */
export function parseXlsx(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // Expandir merge cells
  if (ws['!merges']) {
    for (const merge of ws['!merges']) {
      const topLeft = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      const topValue = ws[topLeft]?.v ?? '';
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          const cell = XLSX.utils.encode_cell({ r, c });
          if (!ws[cell]) ws[cell] = { v: topValue, t: 's' };
        }
      }
    }
  }
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  return raw.map(row => row.map(cell => String(cell ?? '').trim()));
}

/* ── Orquestador principal ── */
export function parseRubricMatrix(matrix: string[][]): ParseOutput {
  const errors: ParseError[] = [];

  // Eliminar filas y columnas completamente vacías al final
  let rows = matrix.filter(row => row.some(c => c !== ''));
  if (rows.length === 0) {
    return { errors: [{ type: 'error', message: 'El archivo está vacío.' }] };
  }

  // ── Detectar fila de cabecera ──
  // Es la primera fila donde col[0] no está vacío Y col[1..N] son todos no-vacíos y no puramente numéricos
  let headerRowIndex = -1;
  const metaLines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0] ?? '';
    const rest = row.slice(1).filter(c => c !== '');

    if (col0 === '' || rest.length === 0) {
      metaLines.push(col0);
      continue;
    }

    // Verificar si todos los valores de rest son NO numéricos
    const allNonNumeric = rest.every(c => isNaN(Number(c)));
    if (allNonNumeric && rest.length >= 1) {
      headerRowIndex = i;
      break;
    }
    metaLines.push(col0);
  }

  if (headerRowIndex === -1) {
    return { errors: [{ type: 'error', message: 'No se pudo detectar la fila de criterios y niveles. Verifica que la primera columna tenga etiquetas de criterios y las columnas siguientes tengan nombres de niveles.' }] };
  }

  const headerRow = rows[headerRowIndex];
  // Niveles: todas las columnas después de la primera que no estén vacías
  const levelLabels = headerRow.slice(1).filter(c => c !== '');
  if (levelLabels.length < 2) {
    errors.push({ type: 'warning', message: 'Se detectaron menos de 2 niveles de logro. Verifica la fila de encabezados.' });
  }

  // ── Detectar fila de puntajes (opcional) ──
  let scoreRowIndex = -1;
  const nextRow = rows[headerRowIndex + 1];
  if (nextRow) {
    const restOfNext = nextRow.slice(1).filter(c => c !== '');
    const allNumeric = restOfNext.length > 0 && restOfNext.every(c => !isNaN(Number(c)));
    if (allNumeric) scoreRowIndex = headerRowIndex + 1;
  }

  // ── Construir niveles ──
  let scores: number[];
  if (scoreRowIndex !== -1) {
    scores = rows[scoreRowIndex].slice(1)
      .filter(c => c !== '')
      .map(c => parseFloat(c));
  } else {
    // Fallback: puntajes descendentes N, N-1, ..., 1
    scores = levelLabels.map((_, i) => levelLabels.length - i);
  }

  const levels: RubricLevel[] = levelLabels.map((label, i) => ({
    id: uuidv4(),
    label,
    maxScore: scores[i] ?? (levelLabels.length - i),
    order: i,
  }));

  // ── Construir criterios ──
  const dataStartRow = scoreRowIndex !== -1 ? scoreRowIndex + 1 : headerRowIndex + 1;
  const criteria: RubricCriterion[] = [];

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const label = row[0] ?? '';
    if (!label) continue;

    const descriptors: Record<string, string> = {};
    levels.forEach((level, j) => {
      descriptors[level.id] = row[j + 1] ?? '';
    });

    criteria.push({
      id: uuidv4(),
      label,
      weight: 1,
      order: criteria.length,
      descriptors,
    });
  }

  if (criteria.length === 0) {
    return { errors: [{ type: 'error', message: 'No se encontraron criterios de evaluación. Verifica el formato del archivo.' }] };
  }

  // ── Extraer metadatos ──
  const rubricMeta: RubricMeta = extractMeta(rows.slice(0, headerRowIndex));

  // ── Calcular pmax ──
  const maxLevelScore = Math.max(...levels.map(l => l.maxScore));
  const maxScore = criteria.length * maxLevelScore;

  // ── Nombre sugerido ──
  const suggestedName = rubricMeta.title || `Rúbrica ${new Date().toLocaleDateString('es-CL')}`;

  return {
    result: {
      rubricData: { levels, criteria },
      rubricMeta,
      suggestedName,
      maxScore,
    },
    errors,
  };
}

function extractMeta(metaRows: string[][]): RubricMeta {
  const flat = metaRows.map(r => r.join(' ').trim()).filter(Boolean);
  const meta: RubricMeta = {};

  if (flat[0]) meta.title = flat[0].replace(/^[""]|[""]$/g, '').trim();
  for (const line of flat) {
    const lower = line.toLowerCase();
    if (!meta.course && (lower.includes('curso:') || lower.includes('curso '))) {
      meta.course = extractAfterColon(line, 'curso') ?? undefined;
    }
    if (!meta.subject && (lower.includes('asignatura:') || lower.includes('asignatura '))) {
      meta.subject = extractAfterColon(line, 'asignatura') ?? undefined;
    }
    if (!meta.objective && lower.includes('objetivo')) {
      meta.objective = line.replace(/^objetivo[^:]*:/i, '').replace(/^[""]|[""]$/g, '').trim() || undefined;
    }
  }
  return meta;
}

function extractAfterColon(text: string, key: string): string | null {
  const regex = new RegExp(`${key}\\s*:?\\s*(.+?)(?:\\s{2,}|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}
