import Dexie, { type EntityTable } from 'dexie';

/* ── Tipos ── */

export interface RubricLevel {
  id: string;
  label: string;
  maxScore: number;
  order: number;
}

export interface RubricCriterion {
  id: string;
  label: string;
  weight: number;
  order: number;
  descriptors: Record<string, string>; // levelId → descriptor
}

export interface RubricData {
  levels: RubricLevel[];
  criteria: RubricCriterion[];
}

export interface GradingConfig {
  pmax: number;   // puntaje máximo (calculado de la rúbrica)
  exig: number;   // exigencia % (default 60)
  nmin: number;   // nota mínima (default 1.0)
  nmax: number;   // nota máxima (default 7.0)
  napr: number;   // nota de aprobación (default 4.0)
}

export interface RubricMeta {
  title?: string;
  course?: string;
  subject?: string;
  objective?: string;
  date?: string;
}

export interface Rubric {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: number;
  rubricMeta: RubricMeta;
  gradingConfig: GradingConfig;
  rubricData: RubricData;
}

export interface Course {
  id: string;
  rubricId: string;
  name: string;
  subject: string;
  period: string;
  fechaEvaluacion?: string;  // 'YYYY-MM-DD' – fecha en que se rindió la evaluación
  createdAt: number;
}

export type Sexo = 'M' | 'F' | '';

export interface Student {
  id: string;
  courseId: string;
  name: string;
  sexo: Sexo;
  order: number;
}

export interface ScoreEntry {
  levelId: string;
  score: number;
  descriptor: string; // snapshot del descriptor al momento de evaluar
}

export interface AIFeedback {
  strength: string;
  challenge: string;
  suggestion: string;
  importedAt: number;
}

export interface Evaluation {
  id: string;
  studentId: string;
  courseId: string;
  rubricId: string;
  completedAt: number;
  scores: Record<string, ScoreEntry>; // criterionId → ScoreEntry
  rawScore: number;
  maxRawScore: number;
  calculatedGrade: number;
  isPending?: boolean;
  aiFeedback: AIFeedback | null;
  observations?: string;
}

/* ── Base de Datos ── */

class InformeEvaluacionDB extends Dexie {
  rubrics!: EntityTable<Rubric, 'id'>;
  courses!: EntityTable<Course, 'id'>;
  students!: EntityTable<Student, 'id'>;
  evaluations!: EntityTable<Evaluation, 'id'>;

  constructor() {
    super('InformeEvaluacionDB');

    this.version(1).stores({
      rubrics:     'id, name, uploadedAt',
      courses:     'id, rubricId, name, createdAt',
      students:    'id, courseId, order',
      evaluations: 'id, studentId, courseId, rubricId, completedAt',
    });

    // v2: agrega fechaEvaluacion a courses (campo opcional, no indexado)
    this.version(2).stores({
      rubrics:     'id, name, uploadedAt',
      courses:     'id, rubricId, name, createdAt',
      students:    'id, courseId, order',
      evaluations: 'id, studentId, courseId, rubricId, completedAt',
    });
  }
}

export const db = new InformeEvaluacionDB();
