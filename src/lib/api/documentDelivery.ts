import { apiUrl } from "@/lib/api/client";

export type DocumentMeta = { name: string; type: string };

/** Proxy URL for viewing (inline) or downloading (attachment). */
export function documentDeliveryUrl(
  href: string,
  meta: DocumentMeta,
  disposition: "inline" | "attachment" = "inline",
): string {
  if (!href) return href;
  if (href.startsWith("data:") || href.startsWith("blob:")) return href;

  const params = new URLSearchParams({
    url: href,
    name: meta.name,
    type: meta.type,
    disposition,
  });
  return apiUrl(`/api/members/files/delivery?${params}`);
}

/** Open document in a new browser tab for viewing (does not leave current page). */
export function openDocumentInNewTab(href: string, meta: DocumentMeta) {
  const target = documentDeliveryUrl(href, meta, "inline");
  const link = document.createElement("a");
  link.href = target;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Save document to the user's device. */
export async function downloadDocument(href: string, meta: DocumentMeta) {
  if (href.startsWith("data:") || href.startsWith("blob:")) {
    const link = document.createElement("a");
    link.href = href;
    link.download = meta.name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const target = documentDeliveryUrl(href, meta, "attachment");
  const res = await fetch(target);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = meta.name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
