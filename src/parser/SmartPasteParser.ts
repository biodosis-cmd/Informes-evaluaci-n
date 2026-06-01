import type { Sexo } from '../db/db';

export interface SmartPasteRow {
  sexo: Sexo;
  name: string;
  scores: number[]; // un valor por criterio, en orden
  isPending: boolean;
}

export interface SmartPasteResult {
  rows: SmartPasteRow[];
  errors: string[];
  warnings: string[];
}

const SEXO_MAP: Record<string, Sexo> = {
  h: 'M', m: 'F', f: 'F',
  hombre: 'M', mujer: 'F',
  masculino: 'M', femenino: 'F',
  male: 'M', female: 'F',
  '1': 'M', '2': 'F',
};

/**
 * Parsea texto pegado desde Excel (TSV) con formato:
 * Sexo | Nombre | Indicador1 | Indicador2 | ... | IndicadorN
 */
export function parseSmartPaste(rawText: string, expectedCriteriaCount: number): SmartPasteResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: SmartPasteRow[] = [];

  const lines = rawText.trim().split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) {
    return { rows, errors: ['No se encontraron filas de datos.'], warnings };
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const cells = lines[i].split('\t').map(c => c.trim());

    if (cells.length < 2) {
      warnings.push(`Fila ${lineNum}: ignorada (menos de 2 columnas)`);
      continue;
    }

    // Detectar si tiene columna de sexo
    let sexo: Sexo = '';
    let nameColIndex = 0;
    let scoresStartIndex = 1;

    const firstCell = cells[0].toLowerCase();
    if (SEXO_MAP[firstCell] !== undefined) {
      sexo = SEXO_MAP[firstCell];
      nameColIndex = 1;
      scoresStartIndex = 2;
    } else if (!isNaN(Number(cells[0])) && cells.length > 2) {
      // Podría ser nombre en col[1], scores desde col[2]
      // Pero también podría ser nombre en col[0] sin sexo
      // Heurística: si col[0] es número puro pequeño (<= 2), tratar como sexo
      const n = Number(cells[0]);
      if (n === 1 || n === 2) {
        sexo = n === 1 ? 'M' : 'F';
        nameColIndex = 1;
        scoresStartIndex = 2;
      }
    }

    const name = cells[nameColIndex] ?? '';
    if (!name) {
      warnings.push(`Fila ${lineNum}: nombre vacío, ignorada`);
      continue;
    }

    // Scores numéricos
    const scoreStrings = cells.slice(scoresStartIndex);
    const scores: number[] = [];

    for (const s of scoreStrings) {
      const n = parseFloat(s.replace(',', '.'));
      if (!isNaN(n)) scores.push(n);
    }

    if (scores.length === 0) {
      warnings.push(`Fila ${lineNum} (${name}): no se encontraron puntajes numéricos. Se marcará como pendiente.`);
    }

    if (scores.length > expectedCriteriaCount) {
      warnings.push(`Fila ${lineNum} (${name}): se encontraron ${scores.length} puntajes pero la rúbrica tiene ${expectedCriteriaCount} criterios. Se usarán los primeros ${expectedCriteriaCount}.`);
    }

    if (scores.length < expectedCriteriaCount && scores.length > 0) {
      warnings.push(`Fila ${lineNum} (${name}): se encontraron ${scores.length} puntajes pero la rúbrica tiene ${expectedCriteriaCount} criterios. Los faltantes quedarán en 0.`);
      while (scores.length < expectedCriteriaCount) scores.push(0);
    }

    const isPending = scores.length === 0 || scores.every(s => s === 0);

    rows.push({
      sexo,
      name,
      scores: isPending ? new Array(expectedCriteriaCount).fill(0) : scores.slice(0, expectedCriteriaCount),
      isPending,
    });
  }

  if (rows.length === 0) {
    errors.push('No se pudieron extraer filas válidas del texto pegado.');
  }

  return { rows, errors, warnings };
}
