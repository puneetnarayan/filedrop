"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { downloadZip } from "client-zip";
import { collectDropped } from "@/lib/drop";
import { uploadFile } from "@/lib/upload";

type RemoteFile = { path: string; size: number; modified: string | null };
type Job = { path: string; progress: number; error?: string };

const CONCURRENCY = 3;

const fmt = (n: number) => {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

export default function Room({ room }: { room: string }) {
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/list?room=${room}`, { cache: "no-store" });
      if (res.ok) setFiles((await res.json()).files);
    } catch {}
  }, [room]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const upload = useCallback(
    async (items: { path: string; file: File }[]) => {
      const queue = [...items];
      const setJob = (path: string, patch: Partial<Job>) =>
        setJobs((j) => ({ ...j, [path]: { progress: 0, ...patch, path } }));
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          for (let it = queue.shift(); it; it = queue.shift()) {
            setJob(it.path, { progress: 0, error: undefined });
            try {
              await uploadFile(room, it.path, it.file, (p) => setJob(it.path, { progress: p }));
              setJobs((j) => { const { [it.path]: _, ...rest } = j; return rest; });
              refresh();
            } catch (e) {
              setJob(it.path, { error: e instanceof Error ? e.message : "failed" });
            }
          }
        }),
      );
    },
    [room, refresh],
  );

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    upload(await collectDropped(e.dataTransfer));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    upload(list.map((f) => ({ path: f.webkitRelativePath || f.name, file: f })));
    e.target.value = "";
  };

  const signed = async (path: string) => {
    const res = await fetch(`/api/download?room=${room}&path=${encodeURIComponent(path)}&json=1`);
    return (await res.json()).url as string;
  };

  const downloadFolder = async (folder: string) => {
    const inside = files.filter((f) => f.path.startsWith(folder + "/"));
    const inputs = await Promise.all(
      inside.map(async (f) => ({ name: f.path, input: await fetch(await signed(f.path)) })),
    );
    const blob = await downloadZip(inputs).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${folder}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Group by top-level folder; loose files stay as-is.
  const folders = new Map<string, RemoteFile[]>();
  const loose: RemoteFile[] = [];
  for (const f of files) {
    const [top, ...rest] = f.path.split("/");
    if (rest.length) folders.set(top, [...(folders.get(top) ?? []), f]);
    else loose.push(f);
  }

  return (
    <main>
      <header>
        <h1>filedrop</h1>
        <button onClick={copyLink}>{copied ? "Copied!" : "Copy room link"}</button>
      </header>

      <div
        className={`drop ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <p>Drag files or folders here</p>
        <div>
          <button onClick={() => inputRef.current?.click()}>Choose files</button>{" "}
          <button onClick={() => dirRef.current?.click()}>Choose folder</button>
        </div>
        <input ref={inputRef} type="file" multiple hidden onChange={onPick} />
        <input
          ref={dirRef}
          type="file"
          hidden
          onChange={onPick}
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        />
      </div>

      {Object.values(jobs).map((j) => (
        <div key={j.path} className="job">
          <span>{j.path}</span>
          {j.error ? <em className="err">{j.error}</em> : <progress value={j.progress} max={1} />}
        </div>
      ))}

      <h2>In this room</h2>
      {files.length === 0 && <p className="muted">Nothing here yet. Anyone with this link sees what you drop.</p>}
      <ul>
        {[...folders.entries()].map(([name, items]) => (
          <li key={name}>
            <details>
              <summary>
                📁 {name} <span className="muted">({items.length} files, {fmt(items.reduce((s, f) => s + f.size, 0))})</span>
                <button onClick={(e) => { e.preventDefault(); downloadFolder(name); }}>Download .zip</button>
              </summary>
              <ul>
                {items.map((f) => (
                  <li key={f.path}>
                    <a href={`/api/download?room=${room}&path=${encodeURIComponent(f.path)}`}>
                      {f.path.slice(name.length + 1)}
                    </a>{" "}
                    <span className="muted">{fmt(f.size)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
        {loose.map((f) => (
          <li key={f.path}>
            <a href={`/api/download?room=${room}&path=${encodeURIComponent(f.path)}`}>{f.path}</a>{" "}
            <span className="muted">{fmt(f.size)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
