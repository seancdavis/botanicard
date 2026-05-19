import { getStore } from "@netlify/blobs";
import { ValidationError } from "../errors";

export async function uploadPhotoBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<string> {
  const store = getStore("photos");
  const key = `${crypto.randomUUID()}-${filename}`;
  await store.set(key, bytes, { metadata: { contentType: mimeType } });
  return key;
}

export async function uploadPhoto(file: File | null): Promise<string> {
  if (!file) {
    throw new ValidationError("No file provided");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return uploadPhotoBytes(bytes, file.name, file.type);
}

export async function getPhoto(
  key: string,
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const store = getStore("photos");

  try {
    const blob = await store.get(key, { type: "arrayBuffer" });
    if (!blob) return null;

    const meta = await store.getMetadata(key);
    const contentType =
      (meta?.metadata as Record<string, string>)?.contentType || "image/jpeg";

    return { data: blob, contentType };
  } catch {
    return null;
  }
}
