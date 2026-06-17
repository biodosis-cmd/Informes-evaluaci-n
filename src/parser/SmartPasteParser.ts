import type { Sexo } from '../db/db';

export interface SmartPasteRow {
  rut: string;
  apellido_paterno: string;
  apellido_materno: string;
  name: string; // Nombres
  sexo: Sexo;
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

function formatRut(rawRut: string): string {
  // Limpia el RUT dejando solo números y la letra K
  const cleanRut = rawRut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleanRut.length < 2) return cleanRut;
  
  // Extrae el dígito verificador y el cuerpo del RUT
  const dv = cleanRut.slice(-1);
  const cuerpo = cleanRut.slice(0, -1);
  
  return `${cuerpo}-${dv}`;
}

/**
 * Parsea texto pegado desde Excel (TSV) con formato estricto:
 * RUT | Apellido Paterno | Apellido Materno | Nombres | Sexo | Indicador1 | Indicador2 | ...
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

    if (cells.length < 5) {
      warnings.push(`Fila ${lineNum}: ignorada (se esperan al menos 5 columnas: RUT, Paterno, Materno, Nombres, Sexo)`);
      continue;
    }

    // RUT (Columna 0)
    const rutCell = cells[0];
    const rut = formatRut(rutCell);
    if (!rut) {
      warnings.push(`Fila ${lineNum}: RUT inválido o vacío, ignorada`);
      continue;
    }

    // Paterno (Columna 1)
    const apellido_paterno = cells[1]?.trim() ?? '';
    // Materno (Columna 2)
    const apellido_materno = cells[2]?.trim() ?? '';
    
    // Nombres (Columna 3)
    const name = cells[3]?.trim() ?? '';
    if (!name && !apellido_paterno) {
      warnings.push(`Fila ${lineNum}: nombre y apellido vacíos, ignorada`);
      continue;
    }

    // Sexo (Columna 4)
    let sexo: Sexo = '';
    const sexoCell = cells[4].toLowerCase();
    if (SEXO_MAP[sexoCell] !== undefined) {
      sexo = SEXO_MAP[sexoCell];
    } else {
      warnings.push(`Fila ${lineNum}: sexo no reconocido ("${cells[4]}"), se dejará en blanco.`);
    }

    // Scores numéricos (desde la columna 5 en adelante)
    const scoreStrings = cells.slice(5);
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
      rut,
      apellido_paterno,
      apellido_materno,
      name,
      sexo,
      scores: isPending ? new Array(expectedCriteriaCount).fill(0) : scores.slice(0, expectedCriteriaCount),
      isPending,
    });
  }

  if (rows.length === 0) {
    errors.push('No se pudieron extraer filas válidas del texto pegado.');
  }

  return { rows, errors, warnings };
}

