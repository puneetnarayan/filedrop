import { NextResponse } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_TTL, bucket, r2 } from "@/lib/r2";
import { keyInRoom, validRoom } from "@/lib/keys";

export async function POST(req: Request) {
  const { room, key, uploadId, partNumber } = await req.json().catch(() => ({}));
  if (!validRoom(room) || !keyInRoom(room, key) || typeof uploadId !== "string")
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000)
    return NextResponse.json({ error: "bad part number" }, { status: 400 });

  const url = await getSignedUrl(
    r2(),
    new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: SIGNED_URL_TTL },
  );
  return NextResponse.json({ url });
}
