// Saves the progress as a JSON file (export). Browser-only.
import { exportFileName, exportJson } from './progress';
import type { Progress } from './schema';

export function downloadProgress(progress: Progress): string {
  const name = exportFileName();
  const url = URL.createObjectURL(new Blob([exportJson(progress)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return name;
}
