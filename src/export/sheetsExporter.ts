import type { Student, Evaluation, Rubric, Course } from '../db/db';

const API_URL = "https://script.google.com/macros/s/AKfycbzFcj0de624TVr-qJw2zl9HT0A0eYgz5FuJ7k1NBBrDtRO7sDmjfaygu0gyJE8zCxc/exec";

export async function publishToSheets(
  students: Student[],
  evaluations: Evaluation[],
  rubric: Rubric,
  course: Course
): Promise<any> {
  const payload = {
    action: 'publishToPortal',
    course,
    rubric,
    students,
    evaluations
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message || 'Error al publicar');
    }
    return result;
  } catch (err) {
    console.error('Error publishing to Sheets:', err);
    throw err;
  }
}
