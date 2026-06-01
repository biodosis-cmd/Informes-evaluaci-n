import type { GradingConfig } from '../db/db';

/**
 * Calcula la nota final usando la fórmula exacta de escaladenotas.cl
 * Modelo lineal por tramos (estándar MINEDUC Chile)
 *
 * Tramo 1 (reprobado): [0, pmax*exig/100] → [nmin, napr]
 * Tramo 2 (aprobado):  [pmax*exig/100, pmax] → [napr, nmax]
 */
export function calculateGrade(rawScore: number, config: GradingConfig): number {
  const { pmax, exig, nmin, nmax, napr } = config;

  if (pmax <= 0) return nmin;

  const puntajeCorte = pmax * (exig / 100);
  let nota: number;

  if (rawScore <= puntajeCorte) {
    // Tramo inferior: desde nmin hasta napr
    nota = nmin + (napr - nmin) * (rawScore / puntajeCorte);
  } else {
    // Tramo superior: desde napr hasta nmax
    nota = napr + (nmax - napr) * ((rawScore - puntajeCorte) / (pmax - puntajeCorte));
  }

  // Redondear a 1 decimal y clampear
  nota = Math.round(nota * 10) / 10;
  return Math.max(nmin, Math.min(nmax, nota));
}

/**
 * Calcula el puntaje máximo total de una rúbrica
 * (suma de los puntajes máximos de cada nivel, por el mayor nivel de cada criterio)
 */
export function calcMaxRawScore(
  criteria: { id: string }[],
  levels: { id: string; maxScore: number }[]
): number {
  if (levels.length === 0 || criteria.length === 0) return 0;
  const maxLevelScore = Math.max(...levels.map(l => l.maxScore));
  return criteria.length * maxLevelScore;
}

/**
 * Calcula el puntaje obtenido sumando los scores de cada criterio
 */
export function calcRawScore(scores: Record<string, { score: number }>): number {
  return Object.values(scores).reduce((sum, s) => sum + s.score, 0);
}

/**
 * Devuelve el porcentaje de logro (0-100)
 */
export function calcPercentage(rawScore: number, maxRawScore: number): number {
  if (maxRawScore <= 0) return 0;
  return Math.round((rawScore / maxRawScore) * 1000) / 10;
}

/**
 * Config por defecto (escala chilena)
 */
export const DEFAULT_GRADING_CONFIG: Omit<GradingConfig, 'pmax'> = {
  exig: 60,
  nmin: 1.0,
  nmax: 7.0,
  napr: 4.0,
};
