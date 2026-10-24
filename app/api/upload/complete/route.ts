import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { bucket, r2 } from "@/lib/r2";
import { keyInRoom, validRoom } from "@/lib/keys";

export async function POST(req: Request) {
  const { room, key, uploadId, parts } = await req.json().catch(() => ({}));
  if (!validRoom(room) || !keyInRoom(room, key) || typeof uploadId !== "string" || !Array.isArray(parts))
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  await r2().send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p: { partNumber: number; etag: string }) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    }),
  );
  return NextResponse.json({ ok: true });
}
