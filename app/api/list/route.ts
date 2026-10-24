import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { bucket, r2 } from "@/lib/r2";
import { roomPrefix, validRoom } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const room = new URL(req.url).searchParams.get("room");
  if (!validRoom(room)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const prefix = roomPrefix(room);
  const files: { path: string; size: number; modified: string | null }[] = [];
  let token: string | undefined;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of res.Contents ?? []) {
      if (!o.Key) continue;
      files.push({
        path: o.Key.slice(prefix.length),
        size: o.Size ?? 0,
        modified: o.LastModified?.toISOString() ?? null,
      });
    }
    token = res.NextContinuationToken;
  } while (token);

  return NextResponse.json({ files }, { headers: { "Cache-Control": "no-store" } });
}
