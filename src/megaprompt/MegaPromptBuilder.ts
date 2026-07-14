import type { Evaluation, AIFeedback, Student, Rubric, Course } from '../db/db';
import type { TeacherProfile } from '../store/useStore';

export interface MegaPromptParams {
  rubric: Rubric;
  course: Course;
  students: Student[];
  evaluations: Evaluation[];
  teacher?: TeacherProfile;
}

/**
 * Genera el Mega Prompt completo en español chileno latinoamericano
 * listo para copiar y pegar en cualquier IA externa.
 */
export function buildMegaPrompt(params: MegaPromptParams): string {
  const { rubric, course, students, evaluations, teacher } = params;
  const { rubricData, rubricMeta, gradingConfig } = rubric;
  const teacherName = teacher?.name?.trim() || 'el/la docente';
  const teacherGenderWord = teacher?.sexo === 'M'
    ? { article: 'el', pronoun: 'él', adj: 'comprometido' }
    : teacher?.sexo === 'F'
      ? { article: 'la', pronoun: 'ella', adj: 'comprometida' }
      : { article: 'el/la', pronoun: 'él/ella', adj: 'comprometido/a' };

  // Mapear evaluaciones por studentId
  const evalMap: Record<string, Evaluation> = {};
  for (const ev of evaluations) evalMap[ev.studentId] = ev;

  const lines: string[] = [];

  lines.push('━'.repeat(60));
  lines.push('  ROL Y TAREA');
  lines.push('━'.repeat(60));

  if (teacher?.name && teacher?.sexo) {
    const genLabel = teacher.sexo === 'M' ? 'profesor' : 'profesora';
    lines.push(`Debes escribir el feedback EN PRIMERA PERSONA, como si fueras ${teacherGenderWord.article} docente`);
    lines.push(`${genLabel} ${teacherName}, hablándole DIRECTAMENTE al estudiante.`);
    lines.push(`El texto debe sonar como una nota escrita por ${teacherGenderWord.article} ${genLabel} para su alumno/a.`);
    lines.push('');
    lines.push(`CORRECTO:   "Confío en que puedes mejorar este aspecto."`);
    lines.push(`INCORRECTO: "El ${genLabel} ${teacherName} confía en que puedes mejorar este aspecto."`);
    lines.push('');
    lines.push(`Género del docente: ${teacher.sexo === 'M' ? 'Masculino' : 'Femenino'}.`);
    lines.push(`Usa concordancia de género correcta al hablar de ti mismo/a (ej: "${teacher.sexo === 'M' ? 'estoy comprometido' : 'estoy comprometida'} con tu aprendizaje").`);
  } else {
    lines.push('Debes escribir el feedback EN PRIMERA PERSONA, como si fueras el/la docente');
    lines.push('hablándole DIRECTAMENTE al estudiante.');
    lines.push('');
    lines.push('CORRECTO:   "Confío en que puedes mejorar este aspecto."');
    lines.push('INCORRECTO: "El docente confía en que puedes mejorar este aspecto."');
  }
  lines.push('');
  lines.push('Eres experto/a en evaluación formativa y retroalimentación educativa para el sistema escolar chileno.');
  lines.push('Tu tarea es analizar el desempeño de cada estudiante según la rúbrica y generar feedback personalizado,');
  lines.push('empático y orientado al crecimiento, siempre en primera persona.');
  lines.push('');


  lines.push('━'.repeat(60));
  lines.push(`  RÚBRICA: ${rubric.name}`);
  if (course.subject) lines.push(`  Asignatura: ${course.subject}`);
  if (course.name)    lines.push(`  Curso: ${course.name}`);
  if (course.period)  lines.push(`  Período: ${course.period}`);
  if (rubricMeta.objective) {
    lines.push(`  Objetivo: ${rubricMeta.objective}`);
  }
  lines.push('━'.repeat(60));
  lines.push('');

  lines.push('CRITERIOS Y NIVELES DE LOGRO:');
  lines.push('');

  rubricData.criteria.forEach((crit, ci) => {
    lines.push(`Criterio ${ci + 1}: "${crit.label}"`);
    rubricData.levels.forEach(level => {
      const desc = crit.descriptors[level.id] || '(sin descriptor)';
      lines.push(`  • ${level.label} (${level.maxScore} pts):`);
      lines.push(`    "${desc}"`);
    });
    lines.push('');
  });

  lines.push('━'.repeat(60));
  lines.push('  DESEMPEÑO DE LOS ESTUDIANTES');
  lines.push('━'.repeat(60));
  lines.push('');

  students.forEach((student, si) => {
    const ev = evalMap[student.id];
    if (!ev || ev.isPending) return;

    const sexoLabel = student.sexo === 'M' ? 'Masculino' : student.sexo === 'F' ? 'Femenino' : 'No especificado';
    const gradeStr = ev.calculatedGrade.toFixed(1);
    const pct = Math.round((ev.rawScore / ev.maxRawScore) * 100);

    lines.push(`ESTUDIANTE ${si + 1} [ID: "${student.id}"]`);
    lines.push(`Nombre: ${student.name} | Sexo: ${sexoLabel} | Nota: ${gradeStr} / ${gradingConfig.nmax.toFixed(1)} (${pct}%)`);
    if (ev.observations && ev.observations.trim().length > 0) {
      lines.push(`Contexto / Observaciones: "${ev.observations.trim()}"`);
    }
    lines.push('');

    rubricData.criteria.forEach(crit => {
      const score = ev.scores[crit.id];
      if (!score) return;
      const levelLabel = rubricData.levels.find(l => l.id === score.levelId)?.label ?? 'Desconocido';
      lines.push(`  · ${crit.label} → ${levelLabel} (${score.score} pts):`);
      lines.push(`    "${score.descriptor}"`);
    });
    lines.push('');
  });

  lines.push('━'.repeat(60));
  lines.push('  INSTRUCCIONES DE FORMATO DEL FEEDBACK');
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push('Para CADA estudiante genera EXACTAMENTE tres campos:');
  lines.push('');
  lines.push('1. "strength"   → Punto Fuerte (2-3 oraciones):');
  lines.push('   Destaca el criterio donde el estudiante demostró mayor logro.');
  lines.push('   Sé específico, referenciando los descriptores de la rúbrica.');
  lines.push('');
  lines.push('2. "challenge"  → Desafío Principal (2-3 oraciones):');
  lines.push('   Identifica el criterio de menor logro con lenguaje empático,');
  lines.push('   orientado al crecimiento, sin enjuiciar al estudiante.');
  lines.push('');
  lines.push('3. "suggestion" → Sugerencia Accionable (1-2 oraciones):');
  lines.push('   Un paso concreto y realizable para el próximo desafío.');
  lines.push('');
  lines.push('IMPORTANTE: Si el estudiante tiene "Contexto / Observaciones", DEBES incorporar esa');
  lines.push('información de forma empática en tu análisis (para entender o contextualizar su desempeño),');
  lines.push('pero manteniendo siempre la estructura de los 3 campos solicitados.');
  lines.push('');
  lines.push('Tono: profesional, empático, en español latinoamericano chileno.');
  lines.push('Usa "tú" (tuteo). NO uses jerga ni coloquialismos excesivos.');
  lines.push('Máximo 3 oraciones por sección.');
  lines.push('');

  lines.push('━'.repeat(60));
  lines.push('  ESQUEMA JSON EXACTO — RESPONDE SOLO CON ESTO');
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push('Responde ÚNICAMENTE con el siguiente JSON válido.');
  lines.push('Sin texto introductorio, sin explicaciones, sin bloques markdown.');
  lines.push('Solo el JSON puro:');
  lines.push('');

  // Generar el esquema JSON de ejemplo
  const schema: {
    courseId: string;
    generatedAt: string;
    feedbacks: Omit<AIFeedback, 'importedAt'>[];
  } = {
    courseId: course.id,
    generatedAt: '<ISO 8601 timestamp, ej: 2025-05-27T10:00:00Z>',
    feedbacks: students
      .filter(s => {
        const ev = evalMap[s.id];
        return ev && !ev.isPending;
      })
      .map(s => ({
        studentId: s.id,
        strength:   'Texto del punto fuerte aquí...',
        challenge:  'Texto del desafío principal aquí...',
        suggestion: 'Texto de la sugerencia accionable aquí...',
      } as Omit<AIFeedback, 'importedAt'> & { studentId: string })),
  };

  lines.push(JSON.stringify(schema, null, 2));
  lines.push('');

  return lines.join('\n');
}

/**
 * Genera un Mega Prompt para UN SOLO estudiante.
 * Incluye la rúbrica completa pero solo los datos de ese alumno.
 */
export function buildSingleStudentPrompt(params: MegaPromptParams, studentId: string): string {
  const { rubric, course, students, evaluations, teacher } = params;
  const { rubricData, gradingConfig } = rubric;

  const student = students.find(s => s.id === studentId);
  if (!student) return 'Estudiante no encontrado.';

  const ev = evaluations.find(e => e.studentId === studentId);
  if (!ev || ev.isPending) return 'El estudiante no tiene evaluación completada.';

  const teacherName = teacher?.name?.trim() || 'el/la docente';
  const lines: string[] = [];

  // Rol
  lines.push('━'.repeat(60));
  lines.push('  ROL Y TAREA');
  lines.push('━'.repeat(60));

  if (teacher?.name && teacher?.sexo) {
    const genLabel = teacher.sexo === 'M' ? 'profesor' : 'profesora';
    lines.push(`Debes escribir el feedback EN PRIMERA PERSONA, como si fueras ${genLabel} ${teacherName}.`);
    lines.push(`Género del docente: ${teacher.sexo === 'M' ? 'Masculino' : 'Femenino'}.`);
  } else {
    lines.push('Debes escribir el feedback EN PRIMERA PERSONA, como si fueras el/la docente.');
  }
  lines.push('');
  lines.push('Eres experto/a en evaluación formativa para el sistema escolar chileno.');
  lines.push('Tu tarea es generar feedback personalizado, empático y orientado al crecimiento.');
  lines.push('');

  // Rúbrica
  lines.push('━'.repeat(60));
  lines.push(`  RÚBRICA: ${rubric.name}`);
  if (course.subject) lines.push(`  Asignatura: ${course.subject}`);
  if (course.name) lines.push(`  Curso: ${course.name}`);
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push('CRITERIOS Y NIVELES DE LOGRO:');
  lines.push('');

  rubricData.criteria.forEach((crit, ci) => {
    lines.push(`Criterio ${ci + 1}: "${crit.label}"`);
    rubricData.levels.forEach(level => {
      const desc = crit.descriptors[level.id] || '(sin descriptor)';
      lines.push(`  • ${level.label} (${level.maxScore} pts):`);
      lines.push(`    "${desc}"`);
    });
    lines.push('');
  });

  // Datos del estudiante
  lines.push('━'.repeat(60));
  lines.push('  DESEMPEÑO DEL ESTUDIANTE');
  lines.push('━'.repeat(60));
  lines.push('');

  const sexoLabel = student.sexo === 'M' ? 'Masculino' : student.sexo === 'F' ? 'Femenino' : 'No especificado';
  const gradeStr = ev.calculatedGrade.toFixed(1);
  const pct = Math.round((ev.rawScore / ev.maxRawScore) * 100);

  lines.push(`ESTUDIANTE [ID: "${student.id}"]`);
  lines.push(`Nombre: ${student.name} | Sexo: ${sexoLabel} | Nota: ${gradeStr} / ${gradingConfig.nmax.toFixed(1)} (${pct}%)`);
  if (ev.observations && ev.observations.trim().length > 0) {
    lines.push(`Contexto / Observaciones: "${ev.observations.trim()}"`);
  }
  lines.push('');

  rubricData.criteria.forEach(crit => {
    const score = ev.scores[crit.id];
    if (!score) return;
    const levelLabel = rubricData.levels.find(l => l.id === score.levelId)?.label ?? 'Desconocido';
    lines.push(`  · ${crit.label} → ${levelLabel} (${score.score} pts):`);
    lines.push(`    "${score.descriptor}"`);
  });
  lines.push('');

  // Instrucciones
  lines.push('━'.repeat(60));
  lines.push('  INSTRUCCIONES DE FORMATO');
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push('Genera EXACTAMENTE tres campos:');
  lines.push('1. "strength"   → Punto Fuerte (2-3 oraciones)');
  lines.push('2. "challenge"  → Desafío Principal (2-3 oraciones)');
  lines.push('3. "suggestion" → Sugerencia Accionable (1-2 oraciones)');
  lines.push('');
  lines.push('Tono: profesional, empático, español chileno. Usa "tú".');
  lines.push('');

  // JSON esperado
  lines.push('━'.repeat(60));
  lines.push('  RESPONDE SOLO CON ESTE JSON');
  lines.push('━'.repeat(60));
  lines.push('');

  const schema = {
    courseId: course.id,
    generatedAt: '<ISO 8601 timestamp>',
    feedbacks: [{
      studentId: student.id,
      strength: 'Texto del punto fuerte aquí...',
      challenge: 'Texto del desafío principal aquí...',
      suggestion: 'Texto de la sugerencia accionable aquí...',
    }]
  };

  lines.push(JSON.stringify(schema, null, 2));
  lines.push('');

  return lines.join('\n');
}

/* ── Tipos del JSON esperado ── */
export interface MegaPromptFeedbackItem {
  studentId: string;
  strength: string;
  challenge: string;
  suggestion: string;
}

export interface MegaPromptResponse {
  courseId: string;
  generatedAt: string;
  feedbacks: MegaPromptFeedbackItem[];
}

