import { getStore } from "@netlify/blobs";
import { ValidationError } from "../errors";

export async function uploadPhoto(file: File | null): Promise<string> {
  if (!file) {
    throw new ValidationError("No file provided");
  }

  const store = getStore("photos");
  const key = `${crypto.randomUUID()}-${file.name}`;
  const buffer = await file.arrayBuffer();
  await store.set(key, new Uint8Array(buffer), {
    metadata: { contentType: file.type },
  });

  return key;
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
