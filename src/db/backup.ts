import { db } from './db';

/**
 * Exporta todas las tablas de la base de datos Dexie a un archivo JSON y fuerza la descarga.
 */
export async function exportDBToFile() {
  try {
    const rubrics = await db.rubrics.toArray();
    const courses = await db.courses.toArray();
    const students = await db.students.toArray();
    const evaluations = await db.evaluations.toArray();

    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      rubrics,
      courses,
      students,
      evaluations
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `respaldo-efys-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    return true;
  } catch (error) {
    console.error('Error al exportar la base de datos:', error);
    throw new Error('No se pudo generar el archivo de respaldo.');
  }
}

/**
 * Lee un archivo JSON y restaura (hace merge) de los datos en la base de datos Dexie.
 * @param file El archivo JSON seleccionado por el usuario.
 */
export async function importDBFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) throw new Error('El archivo está vacío.');
        
        const data = JSON.parse(content);

        // Validación básica
        if (!data.rubrics || !data.courses || !data.students || !data.evaluations) {
          throw new Error('El archivo JSON no tiene el formato esperado.');
        }

        // Importación usando bulkPut (inserta nuevos y actualiza existentes por ID)
        await db.transaction('rw', db.rubrics, db.courses, db.students, db.evaluations, async () => {
          if (data.rubrics.length > 0) await db.rubrics.bulkPut(data.rubrics);
          if (data.courses.length > 0) await db.courses.bulkPut(data.courses);
          if (data.students.length > 0) await db.students.bulkPut(data.students);
          if (data.evaluations.length > 0) await db.evaluations.bulkPut(data.evaluations);
        });

        resolve();
      } catch (error: any) {
        console.error('Error al importar:', error);
        reject(new Error(error.message || 'Error al procesar el archivo.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo.'));
    };

    reader.readAsText(file);
  });
}
