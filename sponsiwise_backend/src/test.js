import { S3Client, ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  credentials: {
    accessKeyId: "admin",
    secretAccessKey: "Sudha@7250",
  },
  forcePathStyle: true, // IMPORTANT for MinIO
});

async function testMinio() {
  try {
    // 1️⃣ List buckets
    const buckets = await s3.send(new ListBucketsCommand({}));
    console.log("✅ Connected successfully!");
    console.log("Buckets:", buckets.Buckets);

    // 2️⃣ Upload test file
    await s3.send(
      new PutObjectCommand({
        Bucket: "sponsiwise",
        Key: "test.txt",
        Body: "MinIO is working 🚀",
        ContentType: "text/plain",
      })
    );

    console.log("✅ File uploaded successfully!");
  } catch (error) {
    console.error("❌ Error connecting to MinIO:", error);
  }
}

testMinio();