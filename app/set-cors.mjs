import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "us-central-1",
  endpoint: "https://s3.us-central-1.wasabisys.com",
  credentials: {
    accessKeyId: "3BDXX4WLBWOBXBSAMJQ3",
    secretAccessKey: "lmLfQnS0bNKD42HieANKec0PaWB6jUSsItBBViHz",
  },
  forcePathStyle: false,
});

const command = new PutBucketCorsCommand({
  Bucket: "control-dica-docs",
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: ["http://localhost:3000", "https://*"],
        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  },
});

try {
  await client.send(command);
  console.log("CORS configurado correctamente en control-dica-docs");
} catch (err) {
  console.error("Error al aplicar CORS:", err.message);
}
