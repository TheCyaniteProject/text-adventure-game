import { watch } from 'node:fs';
import { extname } from 'node:path';

// Watch the directory rather than individual files so atomic editor saves work.
export function watchUI(directory, reload) {
  let timer;
  const watcher = watch(directory, { recursive: true }, (_event, filename) => {
    if (filename && !['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.webp'].includes(extname(String(filename)))) return;
    clearTimeout(timer);
    timer = setTimeout(reload, 150);
  });
  watcher.on('error', error => console.error('UI reload watcher:', error.message));
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}
