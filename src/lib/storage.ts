import { randomUUID } from "node:crypto";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { imageSize } from "image-size";

const bucket = process.env.S3_BUCKET ?? "foodie-photos";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

export async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getObject(key: string) {
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    body: Buffer.concat(chunks),
    contentType: result.ContentType ?? "application/octet-stream",
  };
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

// Shared by both the direct upload route and the "use a Google Places
// photo" route — stores an image buffer as a new entry photo and returns
// what the Photo record needs.
export async function storeEntryPhoto(
  userId: string,
  buffer: Buffer,
  contentType: string,
) {
  let dimensions: { width?: number; height?: number } = {};
  try {
    const size = imageSize(buffer);
    dimensions = { width: size.width, height: size.height };
  } catch {
    // best-effort only
  }

  const extension = EXTENSION_BY_MIME[contentType] ?? "jpg";
  const storageKey = `entries/${userId}/${randomUUID()}.${extension}`;

  await ensureBucket();
  await putObject(storageKey, buffer, contentType);

  return { storageKey, ...dimensions };
}
