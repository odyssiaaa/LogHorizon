import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { activeUser, jsonError } from "@/lib/http";

const bucket = "marketplace-images";
const maxFileSize = 4 * 1024 * 1024;
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function isSupportedContentType(value: string): value is keyof typeof extensions {
  return Object.hasOwn(extensions, value);
}

function hasValidSignature(contentType: keyof typeof extensions, bytes: Buffer) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengunggah gambar.", 401);

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return jsonError("Pilih file gambar terlebih dahulu.", 400);
  if (file.size < 1 || file.size > maxFileSize) return jsonError("Ukuran gambar maksimal 4 MB.", 400);
  if (!isSupportedContentType(file.type)) return jsonError("Format gambar yang didukung: JPG, PNG, atau WebP.", 400);

  const contentType = file.type;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(contentType, bytes)) return jsonError("Isi file tidak sesuai dengan format gambar.", 400);

  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !endpoint || !process.env.AWS_REGION) {
    return jsonError("Penyimpanan gambar belum dikonfigurasi untuk server ini.", 503);
  }

  const key = `listings/${user.id}/${crypto.randomUUID()}.${extensions[contentType]}`;
  try {
    const storage = new S3Client({ forcePathStyle: true });
    await storage.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      ContentDisposition: "inline",
      CacheControl: "public, max-age=31536000, immutable",
    }));

    return Response.json({ imageUrl: `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}` }, { status: 201 });
  } catch (error) {
    console.error("Marketplace image upload failed.", error instanceof Error ? error.message : "Unknown storage error");
    return jsonError("Gambar gagal diunggah. Silakan coba lagi.", 502);
  }
}
