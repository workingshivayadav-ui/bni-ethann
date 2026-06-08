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
  const a = document.createElement("a");
  a.href = target;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
