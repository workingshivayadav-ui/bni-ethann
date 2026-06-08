import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  documentPreviewUrl,
  downloadDocumentItem,
  openDocumentItemInNewTab,
  openDocumentViaLink,
  resolveDocumentHref,
  type DocumentSource,
} from "@/lib/api/documentDelivery";

export type DocumentItem = DocumentSource & {
  size: number;
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageDocument(type: string, name?: string) {
  if (type.startsWith("image/")) return true;
  if (name && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return true;
  return false;
}

export function isPdfDocument(type: string, name?: string) {
  if (type === "application/pdf") return true;
  if (name && /\.pdf$/i.test(name)) return true;
  return false;
}

export type DocumentPreviewState = {
  item: DocumentItem;
  isPdf: boolean;
  isImage: boolean;
};

export function DocumentPreviewOverlay({
  open,
  onClose,
  item,
  isPdf,
  isImage,
}: {
  open: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  isPdf: boolean;
  isImage: boolean;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const hasSource = Boolean(item && (item.dataUrl || item.url));
  const previewSrc = item ? documentPreviewUrl(item) : null;

  useEffect(() => {
    if (!open) setPreviewFailed(false);
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Radix modal dialogs mark body portals as inert — keep preview interactive.
  useEffect(() => {
    if (!open) return;
    const root = document.querySelector<HTMLElement>("[data-document-preview]");
    if (!root) return;

    const enable = () => {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
      root.style.pointerEvents = "auto";
    };

    enable();
    const observer = new MutationObserver(enable);
    observer.observe(document.body, {
      subtree: true,
      attributeFilter: ["inert", "aria-hidden"],
    });
    return () => observer.disconnect();
  }, [open]);

  if (!open || !item) return null;

  const openInNewTab = () => {
    const href = resolveDocumentHref(item);
    if (!href) return;
    try {
      if (href.startsWith("data:") || href.startsWith("blob:")) {
        void openDocumentItemInNewTab(item).catch(() => {
          toast.error("Could not open in new tab.");
        });
      } else {
        openDocumentViaLink(href, { name: item.name, type: item.type });
      }
    } catch {
      toast.error("Could not open in new tab.");
    }
  };

  return createPortal(
    <div
      data-document-preview
      className="fixed inset-0 z-[300]"
      role="dialog"
      aria-modal="true"
      aria-label="Document preview"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/75"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[301] flex w-[95vw] max-w-4xl max-h-[92vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white shadow-2xl">
        <div className="bni-preview-header flex shrink-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-gray-900 pr-2">{item.name}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {hasSource && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadDocumentItem(item);
                    } catch {
                      toast.error("Could not download file");
                    }
                  }}
                  className="bni-btn-outline"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button type="button" onClick={openInNewTab} className="bni-btn-outline">
                  <ExternalLink className="w-3.5 h-3.5" /> New tab
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="bni-btn-icon" aria-label="Close preview">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[50vh] flex-1 flex-col bg-gray-50">
          {previewFailed && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-[var(--bni-red)]">Could not load preview.</p>
              {hasSource && (
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="bni-btn-link mt-3 text-[var(--bni-navy)]"
                >
                  <ExternalLink className="w-4 h-4" /> Open in new tab
                </button>
              )}
            </div>
          )}
          {!previewFailed && previewSrc && isImage && (
            <div className="flex flex-1 items-center justify-center overflow-auto p-4 scrollbar-hide">
              <img
                src={previewSrc}
                alt={item.name}
                className="max-h-[70vh] max-w-full object-contain"
                onError={() => setPreviewFailed(true)}
              />
            </div>
          )}
          {!previewFailed && previewSrc && isPdf && (
            <iframe
              src={previewSrc}
              title={item.name}
              className="h-[70vh] w-full flex-1 border-0 bg-white"
              onError={() => setPreviewFailed(true)}
            />
          )}
          {!previewFailed && previewSrc && !isImage && !isPdf && (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Preview not available for this file type.</p>
              {hasSource && (
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="bni-btn-link mt-3 text-[var(--bni-navy)]"
                >
                  Open in new tab
                </button>
              )}
            </div>
          )}
          {!previewFailed && !previewSrc && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-500">No preview available.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Thumbnail({
  href,
  isImage,
  isPdf,
}: {
  href: string | null;
  name: string;
  isImage: boolean;
  isPdf: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (href && isImage && !failed) {
    return (
      <img
        src={href}
        alt=""
        className="w-10 h-10 rounded-md object-cover border border-gray-100 bg-white shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border ${
        isPdf ? "bg-red-50 border-red-100" : "bg-white border-gray-100"
      }`}
    >
      <FileText className={`w-4 h-4 ${isPdf ? "text-red-500" : "text-[var(--bni-navy)]/45"}`} />
    </div>
  );
}

export function DocumentGallery({
  items,
  status = "uploaded",
  onRemove,
  onViewDocument,
  variant = "compact",
}: {
  items: DocumentItem[];
  status?: "ready" | "uploaded";
  onRemove?: (index: number) => void;
  /** When set, preview renders outside parent dialogs (avoids Radix inert trap). */
  onViewDocument?: (preview: DocumentPreviewState) => void;
  columns?: 1 | 2;
  variant?: "compact" | "card";
}) {
  const [preview, setPreview] = useState<DocumentPreviewState | null>(null);

  const openPreview = (state: DocumentPreviewState) => {
    if (onViewDocument) onViewDocument(state);
    else setPreview(state);
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-1">No documents uploaded yet.</p>
    );
  }

  const badgeLabel = status === "uploaded" ? "Uploaded" : "Ready";

  return (
    <>
      <div className={variant === "card" ? "grid gap-1.5 sm:grid-cols-2" : "space-y-1.5"}>
        {items.map((item, i) => {
          const href = resolveDocumentHref(item);
          const isImage = isImageDocument(item.type, item.name);
          const isPdf = isPdfDocument(item.type, item.name);
          const hasSource = Boolean(item.dataUrl || item.url);

          return (
            <div key={`${item.name}-${i}`} className="bni-doc-row">
              <Thumbnail href={href} name={item.name} isImage={isImage} isPdf={isPdf} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <p className="text-[13px] font-medium text-gray-900 truncate" title={item.name}>
                    {item.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-gray-500">{formatFileSize(item.size)}</span>
                  <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                    {badgeLabel}
                  </span>
                </div>
              </div>

              <div className="bni-doc-actions relative z-10 flex flex-wrap items-center justify-end gap-1 shrink-0">
                {hasSource ? (
                  <>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview({ item, isPdf, isImage });
                      }}
                      className="bni-btn-navy"
                      title="View in app"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await downloadDocumentItem(item);
                        } catch {
                          toast.error("Could not download file");
                        }
                      }}
                      className="bni-btn-outline"
                      title="Download file"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const h = resolveDocumentHref(item);
                        if (!h) return;
                        try {
                          if (h.startsWith("data:") || h.startsWith("blob:")) {
                            void openDocumentItemInNewTab(item).catch(() => {
                              toast.error("Could not open in new tab.");
                            });
                          } else {
                            openDocumentViaLink(h, { name: item.name, type: item.type });
                          }
                        } catch {
                          toast.error("Could not open in new tab.");
                        }
                      }}
                      className="bni-btn-outline"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden sm:inline">New tab</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-amber-600">Unavailable</span>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="bni-btn-icon"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!onViewDocument && (
        <DocumentPreviewOverlay
          open={!!preview}
          onClose={() => setPreview(null)}
          item={preview?.item ?? null}
          isPdf={preview?.isPdf ?? false}
          isImage={preview?.isImage ?? false}
        />
      )}
    </>
  );
}
