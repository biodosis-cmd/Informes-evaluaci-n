import type { MegaPromptFeedbackItem, MegaPromptResponse } from './MegaPromptBuilder';

export type ValidationStatus = 'empty' | 'invalid' | 'partial' | 'valid';

export interface ValidationResult {
  status: ValidationStatus;
  message: string;
  data?: MegaPromptResponse;
  missingStudentIds?: string[];
  unknownStudentIds?: string[];
}

/**
 * Valida el JSON pegado por el usuario en 3 capas:
 * 1. Sintáctica: JSON.parse válido
 * 2. Estructural: campos requeridos presentes
 * 3. Integridad: todos los studentIds del curso están cubiertos
 */
export function validateJsonIngestion(
  rawText: string,
  expectedStudentIds: string[],
): ValidationResult {
  // ── Vacío ──
  if (!rawText.trim()) {
    return { status: 'empty', message: '' };
  }

  // ── Capa 1: Sintáctica ──
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch (e: unknown) {
    const msg = e instanceof SyntaxError ? e.message : 'JSON inválido';
    return {
      status: 'invalid',
      message: `JSON inválido: ${msg}`,
    };
  }

  // ── Capa 2: Estructural ──
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'invalid', message: 'El JSON debe ser un objeto, no un array ni un valor primitivo.' };
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.feedbacks)) {
    return { status: 'invalid', message: 'Falta el campo "feedbacks" (debe ser un array).' };
  }

  const feedbacks = obj.feedbacks as unknown[];
  if (feedbacks.length === 0) {
    return { status: 'invalid', message: 'El array "feedbacks" está vacío.' };
  }

  // Validar estructura de cada item
  const requiredFields = ['studentId', 'strength', 'challenge', 'suggestion'] as const;
  for (let i = 0; i < feedbacks.length; i++) {
    const item = feedbacks[i] as Record<string, unknown>;
    for (const field of requiredFields) {
      if (typeof item[field] !== 'string') {
        return {
          status: 'invalid',
          message: `Error en feedback[${i}]: el campo "${field}" falta o no es texto.`,
        };
      }
      if ((item[field] as string).trim() === '') {
        return {
          status: 'invalid',
          message: `Error en feedback[${i}]: el campo "${field}" está vacío.`,
        };
      }
    }
  }

  // ── Capa 3: Integridad ──
  const parsedItems = feedbacks as MegaPromptFeedbackItem[];
  const receivedIds = new Set(parsedItems.map(f => f.studentId));
  const expectedSet = new Set(expectedStudentIds);

  const unknownStudentIds = [...receivedIds].filter(id => !expectedSet.has(id));
  const missingStudentIds = [...expectedSet].filter(id => !receivedIds.has(id));

  if (unknownStudentIds.length > 0) {
    return {
      status: 'invalid',
      message: `IDs de estudiante no reconocidos: ${unknownStudentIds.length} ID(s) no corresponden a este curso.`,
      unknownStudentIds,
    };
  }

  const data: MegaPromptResponse = {
    courseId: (obj.courseId as string) ?? '',
    generatedAt: (obj.generatedAt as string) ?? '',
    feedbacks: parsedItems,
  };

  if (missingStudentIds.length > 0) {
    return {
      status: 'partial',
      message: `Faltan ${missingStudentIds.length} de ${expectedStudentIds.length} estudiantes.`,
      data,
      missingStudentIds,
    };
  }

  return {
    status: 'valid',
    message: `✓ ${parsedItems.length} feedback${parsedItems.length !== 1 ? 's' : ''} validado${parsedItems.length !== 1 ? 's' : ''} correctamente`,
    data,
  };
}
