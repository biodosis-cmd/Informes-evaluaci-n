import type { Student, Evaluation, Rubric, Course } from '../db/db';

const API_URL = "https://script.google.com/macros/s/AKfycbx6qHkRSE1l3_k-rP_3a3k4cbba37QI1CIzXIcN5zHM0tFIPQW74Akc8qgzhiOXyEjQ/exec";

// 🔐 Obtener la clave secreta desde la sesión (entregada por el login docente)
function _getApiKey(): string {
  return sessionStorage.getItem('ef_api_key') || '';
}

export async function publishToSheets(
  students: Student[],
  evaluations: Evaluation[],
  rubric: Rubric,
  course: Course
): Promise<any> {
  const apiKey = _getApiKey();
  if (!apiKey) {
    throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
  }

  const payload = {
    action: 'publishToPortal',
    api_key: apiKey,
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

// 🔐 Verificar contraseña de docente contra el backend
export async function verifyDocentePassword(password: string): Promise<string> {
  const url = `${API_URL}?action=verifyDocente&password=${encodeURIComponent(password)}`;
  const response = await fetch(url);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Contraseña incorrecta.');
  }

  const apiKey = result.data.api_key;
  sessionStorage.setItem('ef_api_key', apiKey);
  return apiKey;
}

// 🔐 Cerrar sesión docente
export function logoutDocente() {
  sessionStorage.removeItem('ef_api_key');
}

// 🔐 Verificar si hay sesión activa
export function isDocenteLoggedIn(): boolean {
  return !!sessionStorage.getItem('ef_api_key');
}
