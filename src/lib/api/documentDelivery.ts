export type DocumentMeta = { name: string; type: string };

export type DocumentSource = {
  name: string;
  type: string;
  dataUrl?: string;
  url?: string | null;
};

function isCloudinaryCdnUrl(href: string): boolean {
  return href.includes("res.cloudinary.com/");
}

export function resolveDocumentHref(item: DocumentSource): string | null {
  // Prefer stored CDN url (roster) over stale local dataUrl from form state.
  if (item.url && isCloudinaryCdnUrl(item.url)) return item.url;
  return item.url ?? item.dataUrl ?? null;
}

/** Same-origin proxy — fallback when direct CDN access fails. */
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
  return `/api/members/files/delivery?${params}`;
}

/** Best URL for view / open-in-tab — public Cloudinary links work directly in the browser. */
export function documentAccessUrl(
  href: string,
  meta: DocumentMeta,
  disposition: "inline" | "attachment" = "inline",
): string {
  if (!href || href.startsWith("data:") || href.startsWith("blob:")) return href;
  if (isCloudinaryCdnUrl(href)) return href;
  return documentDeliveryUrl(href, meta, disposition);
}

function asPdfBlob(blob: Blob, meta: DocumentMeta): Blob {
  const isPdf =
    meta.type === "application/pdf" || /\.pdf$/i.test(meta.name);
  if (isPdf && blob.type !== "application/pdf") {
    return new Blob([blob], { type: "application/pdf" });
  }
  return blob;
}

async function loadDocumentBlob(href: string, meta: DocumentMeta): Promise<Blob> {
  if (href.startsWith("blob:") || href.startsWith("data:")) {
    const res = await fetch(href);
    if (!res.ok) throw new Error("Could not load file");
    return asPdfBlob(await res.blob(), meta);
  }

  const targets = isCloudinaryCdnUrl(href)
    ? [href, documentDeliveryUrl(href, meta, "inline")]
    : [documentDeliveryUrl(href, meta, "inline"), href];

  let lastError: unknown;
  for (const target of targets) {
    try {
      const res = await fetch(target);
      if (!res.ok) continue;
      return asPdfBlob(await res.blob(), meta);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Could not load file");
}

function showLoadingTab(tab: Window, title: string) {
  try {
    tab.document.title = title;
    tab.document.body.style.margin = "0";
    tab.document.body.innerHTML =
      '<div style="font-family:system-ui,sans-serif;padding:2rem;color:#555">Loading document…</div>';
  } catch {
    // Some browsers restrict document access on about:blank; loading still continues.
  }
}

/** Open via anchor — avoids popup blockers inside nested modals. */
export function openDocumentViaLink(href: string, meta: DocumentMeta) {
  const url = documentAccessUrl(href, meta, "inline");

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Open document in a new browser tab for viewing (current page stays open). */
export async function openDocumentInNewTab(href: string, meta: DocumentMeta): Promise<void> {
  if (!href.startsWith("data:") && !href.startsWith("blob:")) {
    openDocumentViaLink(href, meta);
    return;
  }

  const tab = window.open("about:blank", "_blank");
  if (!tab) {
    throw new Error("Popup blocked");
  }

  tab.opener = null;
  showLoadingTab(tab, meta.name);

  try {
    const blob = await loadDocumentBlob(href, meta);
    const blobUrl = URL.createObjectURL(blob);
    tab.location.replace(blobUrl);
    tab.addEventListener(
      "load",
      () => {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      },
      { once: true },
    );
  } catch (error) {
    tab.close();
    throw error;
  }
}

async function loadWithFallback(item: DocumentSource): Promise<Blob> {
  const meta = { name: item.name, type: item.type };
  const sources = [item.url, item.dataUrl].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  let lastError: unknown;
  for (const href of sources) {
    try {
      return await loadDocumentBlob(href, meta);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Could not load file");
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

export async function loadDocumentItemBlob(item: DocumentSource): Promise<Blob> {
  return loadWithFallback(item);
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function downloadDocumentItem(item: DocumentSource) {
  const meta = { name: item.name, type: item.type };
  const href = resolveDocumentHref(item);
  if (!href) throw new Error("No file");

  if (href.startsWith("data:") || href.startsWith("blob:")) {
    return downloadDocument(href, meta);
  }

  if (isCloudinaryCdnUrl(href)) {
    try {
      const res = await fetch(href, { mode: "cors" });
      if (res.ok) {
        triggerBlobDownload(asPdfBlob(await res.blob(), meta), meta.name);
        return;
      }
    } catch {
      // Fall through to opening the CDN link.
    }
    openDocumentViaLink(href, meta);
    return;
  }

  const blob = await loadWithFallback(item);
  triggerBlobDownload(blob, meta.name);
}

export async function openDocumentItemInNewTab(item: DocumentSource): Promise<void> {
  const meta = { name: item.name, type: item.type };
  const href = item.url ?? item.dataUrl;
  if (href && !href.startsWith("data:") && !href.startsWith("blob:")) {
    openDocumentViaLink(href, meta);
    return;
  }

  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("Popup blocked");

  tab.opener = null;
  showLoadingTab(tab, item.name);

  try {
    const blob = await loadWithFallback(item);
    const blobUrl = URL.createObjectURL(blob);
    tab.location.href = blobUrl;
    tab.addEventListener(
      "load",
      () => {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      },
      { once: true },
    );
  } catch (error) {
    tab.close();
    throw error;
  }
}

/** Inline preview URL — direct Cloudinary CDN when available. */
export function documentPreviewUrl(item: DocumentSource): string | null {
  const href = resolveDocumentHref(item);
  if (!href) return null;
  return documentAccessUrl(href, { name: item.name, type: item.type }, "inline");
}
