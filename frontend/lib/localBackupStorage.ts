// Shared helper for downloading daily FleetCMD backups and saving to a local folder
// via File System Access API (Chrome/Edge) with automatic fallback to standard browser download.

const IDB_NAME = 'fleetcmd_local_backup';
const IDB_STORE = 'handles';
const IDB_KEY = 'backup_dir';

export interface DailyBackupDownloadResult {
  savedVia: 'directory' | 'browser-download';
  directoryName?: string;
  filename: string;
  sha256: string | null;
  encrypted: boolean;
  sizeBytes: number;
}

export function formatBackupBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB indisponibil'));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Eroare IndexedDB'));
  });
}

export async function getSavedBackupDirectoryHandle(): Promise<any | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveBackupDirectoryHandle(handle: any): Promise<void> {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(handle, IDB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Nu s-a putut salva folderul'));
  });
}

export async function clearSavedBackupDirectory(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function pickAndSaveBackupDirectory(): Promise<{ name: string } | null> {
  if (!isDirectoryPickerSupported()) return null;
  const handle = await (window as any).showDirectoryPicker({
    id: 'fleetcmd-daily-backups',
    mode: 'readwrite',
  });
  if (!handle) return null;
  await saveBackupDirectoryHandle(handle);
  return { name: handle.name || 'Folder selectat' };
}

function parseFilenameFromResponse(res: Response, fallbackDate?: string): string {
  const headerName = res.headers.get('X-Backup-Filename');
  if (headerName) return headerName;

  const disp = res.headers.get('Content-Disposition') || '';
  const match = disp.match(/filename="?([^"]+)"?/i);
  if (match && match[1]) return match[1];

  const today = fallbackDate || new Date().toISOString().slice(0, 10);
  const encrypted = res.headers.get('X-Backup-Encrypted') === 'true';
  return `fleetcmd_backup_${today}.${encrypted ? 'fleetbak' : 'zip'}`;
}

export async function downloadDailyBackupArchive(
  authFetch: (url: string, options?: RequestInit) => Promise<Response>,
  apiBaseUrl: string,
  date?: string,
): Promise<DailyBackupDownloadResult> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await authFetch(`${apiBaseUrl}/backup/daily-download${query}`);
  if (!res.ok) {
    let msg = 'Serverul a returnat o eroare la descărcarea backup-ului zilnic.';
    try {
      const errJson = await res.json();
      if (errJson?.message) msg = errJson.message;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(msg);
  }

  const filename = parseFilenameFromResponse(res, date);
  const sha256 = res.headers.get('X-Backup-Sha256');
  const encrypted = res.headers.get('X-Backup-Encrypted') === 'true';
  const blob = await res.blob();

  // Attempt direct save into pre-selected local folder (Chrome/Edge File System Access API)
  if (isDirectoryPickerSupported()) {
    const dirHandle = await getSavedBackupDirectoryHandle();
    if (dirHandle) {
      try {
        let perm = await dirHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          perm = await dirHandle.requestPermission({ mode: 'readwrite' });
        }
        if (perm === 'granted') {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return {
            savedVia: 'directory',
            directoryName: dirHandle.name,
            filename,
            sha256,
            encrypted,
            sizeBytes: blob.size,
          };
        }
      } catch {
        // Fall back to standard browser download if directory access fails
      }
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return {
    savedVia: 'browser-download',
    filename,
    sha256,
    encrypted,
    sizeBytes: blob.size,
  };
}
