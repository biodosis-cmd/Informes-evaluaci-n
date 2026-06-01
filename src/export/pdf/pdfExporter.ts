import { pdf } from '@react-pdf/renderer';
import React from 'react';
import type { Student, Evaluation, Rubric, Course } from '../../db/db';
import { ReportDocument } from './ReportTemplate';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta todos los informes como un PDF multi-página.
 */
export async function exportPDFBatch(
  students: Student[],
  evaluations: Evaluation[],
  rubric: Rubric,
  course: Course,
  teacherName?: string,
) {
  const evalMap = new Map(evaluations.map(e => [e.studentId, e]));
  const dateStr = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');

  if (students.length === 1) {
    // Descargar PDF individual directamente
    const student = students[0];
    const ev = evalMap.get(student.id);
    if (!ev) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = React.createElement(ReportDocument as any, {
      students: [student],
      evaluations: [ev],
      rubric,
      course,
      teacherName,
    });
    const blob = await pdf(doc as any).toBlob();
    const safeName = student.name.replace(/[^a-z0-9à-üA-Z0-9 ]/g, '_');
    downloadBlob(blob, `informe_${safeName}_${dateStr}.pdf`);
    return;
  }

  // Batch: generar un PDF multi-página
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(ReportDocument as any, {
    students,
    evaluations,
    rubric,
    course,
    teacherName,
  });
  const blob = await pdf(doc as any).toBlob();
  const safeCourse = course.name.replace(/[^a-z0-9à-üA-Z0-9 ]/g, '_');
  downloadBlob(blob, `informes_${safeCourse}_${dateStr}.pdf`);
}
