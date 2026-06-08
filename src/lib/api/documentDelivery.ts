import { apiUrl } from "@/lib/api/client";

/** Same-origin proxy URL so PDFs open in iframe and new tabs reliably. */
export function documentDeliveryUrl(
  href: string,
  meta: { name: string; type: string },
): string {
  if (!href) return href;
  if (href.startsWith("data:") || href.startsWith("blob:")) return href;

  const params = new URLSearchParams({
    url: href,
    name: meta.name,
    type: meta.type,
  });
  return apiUrl(`/api/members/files/delivery?${params}`);
}

export function openDocumentInNewTab(
  href: string,
  meta: { name: string; type: string },
) {
  const target = documentDeliveryUrl(href, meta);
  const opened = window.open(target, "_blank", "noopener,noreferrer");
  if (!opened) {
    // Popup blocked — fall back to same-tab navigation
    window.location.assign(target);
  }
}
