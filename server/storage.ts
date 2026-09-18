// Object storage helpers backed by any S3-compatible endpoint
// (Supabase Storage S3 gateway, AWS S3, Cloudflare R2, ...).
// Uploads use direct PUT; downloads return short-lived presigned GET URLs.

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Client(): { client: S3Client; bucket: string } {
  const { s3Endpoint, s3Bucket, s3AccessKeyId, s3SecretAccessKey } = ENV;
  if (!s3Endpoint || !s3Bucket || !s3AccessKeyId || !s3SecretAccessKey) {
    throw new Error(
      "Storage config missing: set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
    );
  }

  return {
    client: new S3Client({
      endpoint: s3Endpoint,
      region: s3RegionOrDefault(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
    }),
    bucket: s3Bucket,
  };
}

function s3RegionOrDefault() {
  // Supabase S3 gateway ignores region but the SDK requires a non-empty value.
  return ENV.s3Region || "us-east-1";
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { client, bucket } = getS3Client();
  const key = appendHashSuffix(normalizeKey(relKey));

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: typeof data === "string" ? Buffer.from(data, "utf-8") : data,
    ContentType: contentType,
  }));

  // Stored url is a stable reference; read paths refresh it with a presigned URL.
  return { key, url: key };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: key };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  // Storage not configured (local tooling / tests): fall back to the stable key reference.
  if (!ENV.s3Endpoint || !ENV.s3Bucket || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) return key;
  const { client, bucket } = getS3Client();

  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 60 * 60 * 24 * 7,
  });
}
