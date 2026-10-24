export type DropFile = { path: string; file: File };

type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (ok: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: FsEntry[]) => void, err: (e: unknown) => void) => void };
};

const readFile = (e: FsEntry) => new Promise<File>((ok, err) => e.file!(ok, err));

async function readAll(dir: FsEntry): Promise<FsEntry[]> {
  const reader = dir.createReader!();
  const out: FsEntry[] = [];
  // readEntries returns results in batches; keep reading until empty.
  for (;;) {
    const batch = await new Promise<FsEntry[]>((ok, err) => reader.readEntries(ok, err));
    if (batch.length === 0) return out;
    out.push(...batch);
  }
}

async function walk(entry: FsEntry, base: string, out: DropFile[]) {
  if (entry.isFile) {
    out.push({ path: base + entry.name, file: await readFile(entry) });
  } else if (entry.isDirectory) {
    for (const child of await readAll(entry)) await walk(child, `${base}${entry.name}/`, out);
  }
}

/** Collects files (with folder structure) from a drop event's DataTransfer. */
export async function collectDropped(dt: DataTransfer): Promise<DropFile[]> {
  // Entries must be grabbed synchronously, before any await.
  const entries: FsEntry[] = [];
  for (const item of Array.from(dt.items)) {
    if (item.kind !== "file") continue;
    const entry = (item as unknown as { webkitGetAsEntry(): FsEntry | null }).webkitGetAsEntry();
    if (entry) entries.push(entry);
  }
  const out: DropFile[] = [];
  if (entries.length === 0) {
    for (const f of Array.from(dt.files)) out.push({ path: f.name, file: f });
    return out;
  }
  for (const e of entries) await walk(e, "", out);
  return out;
}
