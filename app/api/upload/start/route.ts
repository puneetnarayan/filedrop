import { NextResponse } from "next/server";
import { CreateMultipartUploadCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX_FILE_BYTES, MULTIPART_THRESHOLD, PART_SIZE, SIGNED_URL_TTL, bucket, r2 } from "@/lib/r2";
import { cleanPath, objectKey, validRoom } from "@/lib/keys";

export async function POST(req: Request) {
  const { room, path, size, type } = await req.json().catch(() => ({}));
  const clean = cleanPath(path);
  if (!validRoom(room) || !clean) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (typeof size !== "number" || size < 0 || size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "file too large" }, { status: 413 });

  const key = objectKey(room, clean);
  const contentType = typeof type === "string" && type ? type : "application/octet-stream";

  if (size <= MULTIPART_THRESHOLD) {
    const url = await getSignedUrl(
      r2(),
      new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
      { expiresIn: SIGNED_URL_TTL },
    );
    return NextResponse.json({ mode: "single", key, url, contentType });
  }

  const { UploadId } = await r2().send(
    new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
  );
  return NextResponse.json({ mode: "multipart", key, uploadId: UploadId, partSize: PART_SIZE });
}
