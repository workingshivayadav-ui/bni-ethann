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
  const link = document.createElement("a");
  link.href = target;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
