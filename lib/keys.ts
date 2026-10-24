const ROOM_RE = /^[a-z0-9]{10,32}$/;

export function validRoom(room: unknown): room is string {
  return typeof room === "string" && ROOM_RE.test(room);
}

/** Returns a clean relative path, or null if it is unsafe. */
export function cleanPath(path: unknown): string | null {
  if (typeof path !== "string" || path.length === 0 || path.length > 512) return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((p) => p === "." || p === ".." || p.includes("\0"))) return null;
  return parts.join("/");
}

export const roomPrefix = (room: string) => `rooms/${room}/`;
export const objectKey = (room: string, path: string) => `${roomPrefix(room)}${path}`;

/** Ensures a client-supplied key belongs to the given room. */
export function keyInRoom(room: string, key: unknown): key is string {
  return typeof key === "string" && key.startsWith(roomPrefix(room)) && !key.includes("..");
}
