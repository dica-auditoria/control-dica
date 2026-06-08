import { S3Client } from "@aws-sdk/client-s3";

// Solo se usa en el servidor (server actions, API routes)
export const wasabiClient = new S3Client({
  region: process.env.WASABI_REGION!,
  endpoint: process.env.WASABI_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
});

export const WASABI_BUCKET = process.env.WASABI_BUCKET!;
export const WASABI_ENDPOINT = process.env.WASABI_ENDPOINT!;

export function getWasabiFileUrl(key: string): string {
  return `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET}/${key}`;
}
