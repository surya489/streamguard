import { S3Client } from "@aws-sdk/client-s3";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }

  return value.trim();
}

const region = process.env.AWS_REGION?.trim() || "eu-north-1";
const profile = process.env.AWS_PROFILE?.trim();
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
const hasStaticCredentials = Boolean(accessKeyId && secretAccessKey);

export const s3BucketName = getRequiredEnv("AWS_S3_BUCKET_NAME");

export const s3Client = new S3Client({
  region,
  credentials: profile
    ? defaultProvider({ profile })
    : hasStaticCredentials
      ? {
          accessKeyId: accessKeyId as string,
          secretAccessKey: secretAccessKey as string,
          sessionToken,
        }
      : defaultProvider(),
});

export function buildVideoObjectKey(userId: string, originalName: string): string {
  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `videos/${userId}/${Date.now()}-${sanitized}`;
}
