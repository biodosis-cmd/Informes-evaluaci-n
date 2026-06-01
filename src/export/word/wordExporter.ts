import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, convertInchesToTwip,
} from 'docx';
import type { Student, Evaluation, Rubric, Course } from '../../db/db';
import { calcPercentage } from '../../grading/GradingEngine';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LEVEL_COLORS = ['00C49A', '4D7FFF', 'F59E0B', 'EF4444', '8B5CF6'];

function buildStudentSection(student: Student, evaluation: Evaluation, rubric: Rubric, course: Course, teacherName?: string): Paragraph[] {
  const { levels, criteria } = rubric.rubricData;
  const grade = evaluation.calculatedGrade;
  const approved = grade >= rubric.gradingConfig.napr;
  const pct = calcPercentage(evaluation.rawScore, evaluation.maxRawScore);
  const paragraphs: Paragraph[] = [];

  // Título de la rúbrica (encabezado del informe)
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: rubric.name, bold: true, size: 22, color: '2563eb', allCaps: true })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 0, after: 60 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '2563eb', space: 4 },
      },
    }),
  );

  // Nombre del estudiante
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: student.name, bold: true, size: 32, color: '1a1a2e' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
    }),
  );

  // Info del estudiante (curso · asignatura · fecha)
  const fechaStr = course.fechaEvaluacion
    ? new Date(course.fechaEvaluacion + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${course.name} · ${course.subject} · ${course.period}`, color: '6b7280', size: 18 }),
        ...(fechaStr ? [new TextRun({ text: `   |   Fecha: ${fechaStr}`, color: '6b7280', size: 18 })] : []),
        new TextRun({ text: '   |   ', color: 'd1d5db', size: 18 }),
        new TextRun({ text: `Nota: ${grade.toFixed(1)} / ${rubric.gradingConfig.nmax.toFixed(1)}`, bold: true, size: 20, color: approved ? '059669' : 'dc2626' }),
        new TextRun({ text: `   (${pct}% · ${approved ? 'APROBADO' : 'REPROBADO'})`, size: 18, color: approved ? '059669' : 'dc2626' }),
      ],
      spacing: { after: teacherName ? 80 : 200 },
    }),
  );

  // Docente
  if (teacherName) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Docente: ', size: 17, color: '9ca3af' }),
          new TextRun({ text: teacherName, bold: true, size: 17, color: '374151' }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  // Título tabla
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'TABLA DE DESEMPEÑO', bold: true, size: 18, color: '6b7280', allCaps: true })],
      spacing: { after: 100 },
    }),
  );

  // Tabla de criterios
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Criterio', bold: true, size: 18, color: 'ffffff' })] })],
          shading: { fill: '1a1a2e', type: ShadingType.CLEAR },
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Nivel Alcanzado', bold: true, size: 18, color: 'ffffff' })] })],
          shading: { fill: '1a1a2e', type: ShadingType.CLEAR },
          width: { size: 35, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Puntaje', bold: true, size: 18, color: 'ffffff' })] })],
          shading: { fill: '1a1a2e', type: ShadingType.CLEAR },
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...criteria.map((crit, ci) => {
      const score = evaluation.scores[crit.id];
      const levelIdx = levels.findIndex(l => l.id === score?.levelId);
      const levelColor = LEVEL_COLORS[levelIdx] ?? LEVEL_COLORS[0];
      const levelLabel = levels.find(l => l.id === score?.levelId)?.label ?? '—';
      const fill = ci % 2 === 0 ? 'f9fafb' : 'ffffff';

      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: crit.label, bold: true, size: 18 })] }),
              score?.descriptor
                ? new Paragraph({ children: [new TextRun({ text: score.descriptor, size: 16, color: '6b7280', italics: true })], spacing: { before: 40 } })
                : new Paragraph({ children: [] }),
            ],
            shading: { fill, type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: levelLabel, bold: true, size: 18, color: levelColor })] })],
            shading: { fill, type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: String(score?.score ?? 0), bold: true, size: 20, color: levelColor })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { fill, type: ShadingType.CLEAR },
          }),
        ],
      });
    }),
  ];

  paragraphs.push(new Paragraph({ children: [] })); // spacer
  // La tabla se agrega como elemento separado, no como Paragraph
  // Docx requiere que las tablas se agreguen al nivel de section
  // Guardamos referencia via texto especial — en realidad las retornamos aparte
  // NOTA: retornamos un array con párrafos más tabla. La tabla se procesa en buildDoc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (paragraphs as any).__table = new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' }, insideVertical: { style: BorderStyle.NONE } } });

  // Feedback IA
  if (evaluation.aiFeedback) {
    paragraphs.push(
      new Paragraph({ spacing: { before: 300, after: 100 } }),
      new Paragraph({
        children: [new TextRun({ text: 'RETROALIMENTACIÓN PEDAGÓGICA', bold: true, size: 18, color: '6b7280', allCaps: true })],
        spacing: { after: 120 },
      }),
    );

    const sections = [
      { icon: '💪', title: 'Punto Fuerte', text: evaluation.aiFeedback.strength, color: '059669', fill: 'ecfdf5' },
      { icon: '🎯', title: 'Desafío Principal', text: evaluation.aiFeedback.challenge, color: '2d5be0', fill: 'eff6ff' },
      { icon: '💡', title: 'Sugerencia Accionable', text: evaluation.aiFeedback.suggestion, color: 'd97706', fill: 'fffbeb' },
    ];

    for (const s of sections) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `${s.icon} ${s.title}`, bold: true, size: 20, color: s.color })],
          shading: { fill: s.fill, type: ShadingType.CLEAR },
          spacing: { before: 120, after: 60 },
          indent: { left: convertInchesToTwip(0.2) },
        }),
        new Paragraph({
          children: [new TextRun({ text: s.text, size: 18, color: '374151' })],
          shading: { fill: s.fill, type: ShadingType.CLEAR },
          spacing: { after: 100 },
          indent: { left: convertInchesToTwip(0.2) },
        }),
      );
    }
  }

  return paragraphs;
}

export async function exportWordBatch(
  students: Student[],
  evaluations: Evaluation[],
  rubric: Rubric,
  course: Course,
  teacherName?: string,
) {
  const evalMap = new Map(evaluations.map(e => [e.studentId, e]));
  const dateStr = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSections: any[] = [];

  students.forEach((student, si) => {
    const ev = evalMap.get(student.id);
    if (!ev || ev.isPending) return;
    const paras = buildStudentSection(student, ev, rubric, course, teacherName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (paras as any).__table;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionChildren: any[] = [
      ...paras,
    ];

    // Insertar tabla después del título "TABLA DE DESEMPEÑO"
    // Orden: [0]=rubricTitle, [1]=studentName, [2]=info, [3]=docente(opcional), [4 o 3]=sectionTitle
    // Con teacherName → sectionTitle en índice 4 → tabla en 5
    // Sin teacherName → sectionTitle en índice 3 → tabla en 4
    const tableInsertIdx = teacherName ? 5 : 4;
    sectionChildren.splice(tableInsertIdx, 0, table);

    if (si < students.length - 1) {
      sectionChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    allSections.push(...sectionChildren);
  });

  const doc = new Document({
    creator: teacherName ?? 'Informe Evaluación',
    title: `Informes ${course.name} - ${rubric.name}`,
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: allSections,
    }],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const safeCourse = course.name.replace(/[^a-z0-9à-üA-Z0-9 ]/g, '_');
  downloadBlob(blob, `informes_${safeCourse}_${dateStr}.docx`);
}
