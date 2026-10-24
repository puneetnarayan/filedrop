import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_TTL, bucket, r2 } from "@/lib/r2";
import { cleanPath, objectKey, validRoom } from "@/lib/keys";

export const dynamic = "force-dynamic";

/** Redirects to a short-lived signed R2 URL. Pass inline=1 for fetch() use. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const room = sp.get("room");
  const path = cleanPath(sp.get("path"));
  if (!validRoom(room) || !path) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const filename = path.split("/").pop()!;
  const url = await getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: objectKey(room, path),
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: SIGNED_URL_TTL },
  );
  if (sp.get("json") === "1") return NextResponse.json({ url });
  return NextResponse.redirect(url, 302);
}
