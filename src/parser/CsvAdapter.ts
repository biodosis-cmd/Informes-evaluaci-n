import Papa from 'papaparse';
import { parseRubricMatrix, type ParseOutput } from './RubricParser';

export function parseCsv(text: string): ParseOutput {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  });
  const matrix = result.data.map(row => row.map(cell => String(cell ?? '').trim()));
  return parseRubricMatrix(matrix);
}
