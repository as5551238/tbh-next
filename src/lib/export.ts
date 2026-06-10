/**
 * Data export utilities — CSV and JSON export for core entities
 */

export function exportToCSV(headers: string[], rows: Record<string, unknown>[], filename: string) {
  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map(escapeCSV).join(','));
  // Data rows
  for (const row of rows) {
    csvRows.push(headers.map((h) => escapeCSV(String(row[h] ?? ''))).join(','));
  }
  downloadFile(csvRows.join('\n'), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON(data: unknown, filename: string) {
  downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a Date or date string for export */
export function formatDateForExport(d: Date | string | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date instanceof Date && !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}
