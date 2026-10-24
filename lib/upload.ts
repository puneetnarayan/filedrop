function putWithProgress(
  url: string,
  body: Blob,
  contentType: string | null,
  onProgress: (loaded: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.getResponseHeader("ETag"))
        : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("network error (check R2 CORS)"));
    xhr.send(body);
  });
}

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `request failed (${res.status})`);
  return res.json();
}

export async function uploadFile(
  room: string,
  path: string,
  file: File,
  onProgress: (fraction: number) => void,
) {
  const type = file.type || "application/octet-stream";
  const start = await api<
    | { mode: "single"; url: string; contentType: string }
    | { mode: "multipart"; key: string; uploadId: string; partSize: number }
  >("/api/upload/start", { room, path, size: file.size, type });

  if (start.mode === "single") {
    // Content-Type must match what was signed.
    await putWithProgress(start.url, file, start.contentType, (l) => onProgress(l / Math.max(file.size, 1)));
    onProgress(1);
    return;
  }

  const parts: { partNumber: number; etag: string }[] = [];
  const total = Math.ceil(file.size / start.partSize);
  for (let n = 1; n <= total; n++) {
    const blob = file.slice((n - 1) * start.partSize, n * start.partSize);
    const { url } = await api<{ url: string }>("/api/upload/part", {
      room, key: start.key, uploadId: start.uploadId, partNumber: n,
    });
    const etag = await putWithProgress(url, blob, null, (l) =>
      onProgress(((n - 1) * start.partSize + l) / file.size),
    );
    if (!etag) throw new Error("missing ETag (R2 CORS must expose ETag)");
    parts.push({ partNumber: n, etag });
  }
  await api("/api/upload/complete", { room, key: start.key, uploadId: start.uploadId, parts });
  onProgress(1);
}
