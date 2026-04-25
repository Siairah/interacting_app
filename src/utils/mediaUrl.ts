import { getBackendUrl } from "@/utils/apiUtils";

/**
 * Turn stored media paths into browser-loadable URLs.
 * Cloudinary `https://…` is unchanged; relative `/uploads/…` is prefixed with the backend origin.
 */
export function resolveMediaFileUrl(file: string | undefined | null): string {
  if (file == null || typeof file !== "string") return "";
  const t = file.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/")) {
    if (typeof window !== "undefined") {
      const base = getBackendUrl().replace(/\/$/, "");
      return `${base}${t}`;
    }
  }
  return t;
}
