import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Student, Evaluation, Rubric, Course } from '../../db/db';
import { calcPercentage } from '../../grading/GradingEngine';

/* ─── Paleta de colores ─────────────────────────────────────── */
const C = {
  navy:     '#0f1b35',
  navyMid:  '#1a2e55',
  blue:     '#2563eb',
  blueLight:'#dbeafe',
  green:    '#059669',
  greenBg:  '#d1fae5',
  amber:    '#d97706',
  amberBg:  '#fef3c7',
  red:      '#dc2626',
  slate:    '#475569',
  muted:    '#94a3b8',
  border:   '#e2e8f0',
  bgAlt:    '#f8fafc',
  white:    '#ffffff',
};

const LEVEL_COLORS = [
  { fill: C.green,    bg: C.greenBg },   // Logrado
  { fill: C.blue,     bg: C.blueLight }, // Med. Logrado
  { fill: C.amber,    bg: C.amberBg },   // Por Lograr
  { fill: C.red,      bg: '#fee2e2' },   // No Observado
  { fill: '#7c3aed', bg: '#ede9fe' },   // Nivel 5
];

/* ─── Estilos ──────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    backgroundColor: C.white,
    paddingBottom: 0,
  },

  /* Banda superior azul oscuro */
  topBand: {
    backgroundColor: C.navy,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topLeft: { flex: 1, paddingRight: 12 },
  platformLabel: {
    fontSize: 6.5,
    color: '#7c9dc9',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  studentNamePdf: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1.15,
    marginBottom: 3,
  },
  headerMeta: {
    fontSize: 7.5,
    color: '#a0bad8',
    lineHeight: 1.4,
  },
  teacherTag: {
    fontSize: 7.5,
    color: '#7c9dc9',
    marginTop: 4,
  },
  gradeBubble: {
    backgroundColor: C.blue,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  gradeNumber: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1,
  },
  gradeMax: { fontSize: 7, color: '#bfdbfe', marginTop: 2 },
  gradeStatus: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  /* Barra de progreso */
  progressWrap: {
    backgroundColor: C.navyMid,
    paddingHorizontal: 28,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: { fontSize: 7, color: '#7c9dc9', width: 60 },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
  },
  progressFill: { height: 5, borderRadius: 3 },
  progressPct: { fontSize: 7, color: C.muted, width: 28, textAlign: 'right' },

  /* Divider */
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 28, marginVertical: 8 },

  /* Contenido principal */
  body: { paddingHorizontal: 28, paddingTop: 10 },

  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },

  /* Tabla */
  table: { marginBottom: 10 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeadText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'flex-start',
  },
  tableRowAlt: { backgroundColor: C.bgAlt },
  colA: { flex: 2.5 },
  colB: { flex: 2 },
  colC: { flex: 0.7, alignItems: 'flex-end' },
  cellMain: { fontSize: 8, color: C.navy, fontFamily: 'Helvetica-Bold' },
  cellDesc: { fontSize: 7, color: C.slate, marginTop: 1, lineHeight: 1.3 },
  levelPill: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  levelPillText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  scoreText: { fontSize: 11, fontFamily: 'Helvetica-Bold' },

  /* Feedback */
  feedbackGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 0,
  },
  feedbackCard: {
    flex: 1,
    borderRadius: 5,
    padding: 8,
    borderTopWidth: 2,
  },
  feedbackCardLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  feedbackCardText: {
    fontSize: 7.5,
    lineHeight: 1.45,
  },

  /* Footer minimalista */
  footer: {
    paddingHorizontal: 28,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
  },
  footerText: { fontSize: 6.5, color: C.muted },
});

/* ─── Componente página individual ─────────────────────────── */
interface ReportPageProps {
  student: Student;
  evaluation: Evaluation;
  rubric: Rubric;
  course: Course;
  teacherName?: string;
}

export function ReportPage({ student, evaluation, rubric, course, teacherName }: ReportPageProps) {
  const { levels, criteria } = rubric.rubricData;
  const { gradingConfig } = rubric;
  const grade = evaluation.calculatedGrade;
  const approved = grade >= gradingConfig.napr;
  const pct = calcPercentage(evaluation.rawScore, evaluation.maxRawScore);

  return (
    <Page size="A4" style={s.page}>

      {/* ── Banda de cabecera ── */}
      <View style={s.topBand}>
        <View style={s.topLeft}>
          <Text style={s.platformLabel}>Informe de Evaluación</Text>
          <Text style={s.studentNamePdf}>{student.name}</Text>
          <Text style={s.headerMeta}>
            {course.name}{'  ·  '}{course.subject}{'  ·  '}{course.period}
          </Text>
          <Text style={s.headerMeta}>{rubric.name}</Text>
          {teacherName
            ? <Text style={s.teacherTag}>Docente: {teacherName}</Text>
            : null}
        </View>
        <View>
          <View style={[s.gradeBubble, { backgroundColor: approved ? C.green : C.red }]}>
            <Text style={s.gradeNumber}>{grade.toFixed(1)}</Text>
            <Text style={s.gradeMax}>de {gradingConfig.nmax.toFixed(1)}</Text>
          </View>
          <Text style={[s.gradeStatus, { color: approved ? C.green : C.red, textAlign: 'center', marginTop: 4 }]}>
            {approved ? 'APROBADO' : 'REPROBADO'}
          </Text>
        </View>
      </View>

      {/* ── Barra de progreso ── */}
      <View style={s.progressWrap}>
        <Text style={s.progressLabel}>{evaluation.rawScore} / {evaluation.maxRawScore} pts</Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: approved ? C.green : C.red }]} />
        </View>
        <Text style={s.progressPct}>{pct}%</Text>
      </View>

      {/* ── Cuerpo ── */}
      <View style={s.body}>

        {/* Tabla */}
        <Text style={s.sectionLabel}>Tabla de Desempeno</Text>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, s.colA]}>Criterio</Text>
            <Text style={[s.tableHeadText, s.colB]}>Nivel Alcanzado</Text>
            <Text style={[s.tableHeadText, s.colC]}>Pts</Text>
          </View>

          {criteria.map((crit, ci) => {
            const score = evaluation.scores[crit.id];
            const li = levels.findIndex(l => l.id === score?.levelId);
            const lc = LEVEL_COLORS[li] ?? LEVEL_COLORS[0];
            const levelLabel = levels.find(l => l.id === score?.levelId)?.label ?? '—';

            return (
              <View key={crit.id} style={[s.tableRow, ci % 2 === 1 ? s.tableRowAlt : {}]}>
                <View style={s.colA}>
                  <Text style={s.cellMain}>{crit.label}</Text>
                  {score?.descriptor
                    ? <Text style={s.cellDesc}>{score.descriptor}</Text>
                    : null}
                </View>
                <View style={s.colB}>
                  <View style={[s.levelPill, { backgroundColor: lc.bg }]}>
                    <Text style={[s.levelPillText, { color: lc.fill }]}>{levelLabel}</Text>
                  </View>
                </View>
                <View style={s.colC}>
                  <Text style={[s.scoreText, { color: lc.fill }]}>{score?.score ?? 0}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Feedback IA */}
        {evaluation.aiFeedback && (
          <View>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginTop: 4 }]}>Retroalimentacion Pedagogica</Text>
            <View style={s.feedbackGrid}>

              <View style={[s.feedbackCard, { backgroundColor: '#f0fdf4', borderTopColor: C.green }]}>
                <Text style={[s.feedbackCardLabel, { color: C.green }]}>Punto Fuerte</Text>
                <Text style={[s.feedbackCardText, { color: '#166534' }]}>{evaluation.aiFeedback.strength}</Text>
              </View>

              <View style={[s.feedbackCard, { backgroundColor: '#eff6ff', borderTopColor: C.blue }]}>
                <Text style={[s.feedbackCardLabel, { color: C.blue }]}>Desafio Principal</Text>
                <Text style={[s.feedbackCardText, { color: '#1e3a8a' }]}>{evaluation.aiFeedback.challenge}</Text>
              </View>

              <View style={[s.feedbackCard, { backgroundColor: '#fffbeb', borderTopColor: C.amber }]}>
                <Text style={[s.feedbackCardLabel, { color: C.amber }]}>Sugerencia</Text>
                <Text style={[s.feedbackCardText, { color: '#78350f' }]}>{evaluation.aiFeedback.suggestion}</Text>
              </View>

            </View>
          </View>
        )}
      </View>

      {/* ── Pie minimalista ── */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>
          {teacherName ? `Docente: ${teacherName}` : 'Informe Evaluacion'}
        </Text>
        <Text style={s.footerText}>
          {new Date().toLocaleDateString('es-CL')}
        </Text>
      </View>

    </Page>
  );
}

/* ─── Documento completo ────────────────────────────────────── */
export function ReportDocument({
  students, evaluations, rubric, course, teacherName,
}: {
  students: Student[];
  evaluations: Evaluation[];
  rubric: Rubric;
  course: Course;
  teacherName?: string;
}) {
  const evalMap = new Map(evaluations.map(e => [e.studentId, e]));
  return (
    <Document
      title={`Informes ${course.name} - ${rubric.name}`}
      author={teacherName ?? 'Informe Evaluacion'}
      subject={course.subject}
    >
      {students.map(student => {
        const ev = evalMap.get(student.id);
        if (!ev || ev.isPending) return null;
        return (
          <ReportPage
            key={student.id}
            student={student}
            evaluation={ev}
            rubric={rubric}
            course={course}
            teacherName={teacherName}
          />
        );
      })}
    </Document>
  );
}
