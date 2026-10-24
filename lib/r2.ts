import { S3Client } from "@aws-sdk/client-s3";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

let client: S3Client | null = null;

export function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export const bucket = () => env("R2_BUCKET");

export const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES ?? 5 * 1024 ** 3);
// Files above this size use multipart upload.
export const MULTIPART_THRESHOLD = 100 * 1024 ** 2;
export const PART_SIZE = 16 * 1024 ** 2;
export const SIGNED_URL_TTL = 60 * 60; // seconds
