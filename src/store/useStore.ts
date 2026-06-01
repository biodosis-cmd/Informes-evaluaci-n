import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Rubric, Course, Student, Evaluation } from '../db/db';
import type { RubricData, RubricMeta } from '../db/db';
export type AppView = 'dashboard' | 'rubric-upload' | 'course-setup' | 'evaluation' | 'mega-prompt' | 'json-ingestion' | 'reports';

export type RubricParseStatus = 'idle' | 'parsing' | 'confirming' | 'saving' | 'error';

export interface ParsePreview {
  rubricData: RubricData;
  rubricMeta: RubricMeta;
  suggestedName: string;
  maxScore: number;
  fileName: string;
  warnings: string[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface TeacherProfile {
  name: string;
  sexo: 'M' | 'F' | '';
}

const TEACHER_KEY = 'informe-evaluacion:teacher';

function loadTeacher(): TeacherProfile {
  try {
    const raw = localStorage.getItem(TEACHER_KEY);
    if (raw) return JSON.parse(raw) as TeacherProfile;
  } catch { /* ignore */ }
  return { name: '', sexo: '' };
}

function saveTeacher(profile: TeacherProfile) {
  localStorage.setItem(TEACHER_KEY, JSON.stringify(profile));
}

interface AppState {
  // ── UI ──
  activeView: AppView;
  setView: (view: AppView) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // ── Perfil Docente ──
  teacher: TeacherProfile;
  setTeacher: (profile: TeacherProfile) => void;

  // ── Rúbrica activa ──
  activeRubric: Rubric | null;
  setActiveRubric: (rubric: Rubric | null) => void;

  // ── Parsing state ──
  rubricParseStatus: RubricParseStatus;
  setRubricParseStatus: (status: RubricParseStatus) => void;
  parsePreview: ParsePreview | null;
  setParsePreview: (preview: ParsePreview | null) => void;

  // ── Curso activo ──
  activeCourse: Course | null;
  setActiveCourse: (course: Course | null) => void;

  // ── Estudiantes en memoria ──
  students: Student[];
  setStudents: (students: Student[]) => void;

  // ── Evaluaciones en memoria ──
  evaluations: Evaluation[];
  setEvaluations: (evaluations: Evaluation[]) => void;

  // ── Mega Prompt ──
  megaPrompt: string;
  setMegaPrompt: (prompt: string) => void;

  // ── JSON Ingestion ──
  jsonIngestionStatus: 'idle' | 'invalid' | 'partial' | 'valid';
  setJsonIngestionStatus: (status: 'idle' | 'invalid' | 'partial' | 'valid') => void;
}

export const useStore = create<AppState>()(devtools((set) => ({
  // ── UI ──
  activeView: 'dashboard',
  setView: (view) => set({ activeView: view }),
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Perfil Docente (persistido en localStorage) ──
  teacher: loadTeacher(),
  setTeacher: (profile) => {
    saveTeacher(profile);
    set({ teacher: profile });
  },

  // ── Rúbrica ──
  activeRubric: null,
  setActiveRubric: (rubric) => set({ activeRubric: rubric }),
  rubricParseStatus: 'idle',
  setRubricParseStatus: (status) => set({ rubricParseStatus: status }),
  parsePreview: null,
  setParsePreview: (preview) => set({ parsePreview: preview }),

  // ── Curso ──
  activeCourse: null,
  setActiveCourse: (course) => set({ activeCourse: course }),

  // ── Estudiantes ──
  students: [],
  setStudents: (students) => set({ students }),

  // ── Evaluaciones ──
  evaluations: [],
  setEvaluations: (evaluations) => set({ evaluations }),

  // ── Mega Prompt ──
  megaPrompt: '',
  setMegaPrompt: (prompt) => set({ megaPrompt: prompt }),

  // ── JSON ──
  jsonIngestionStatus: 'idle',
  setJsonIngestionStatus: (status) => set({ jsonIngestionStatus: status }),
}), { name: 'InformeEvaluacion' }));
