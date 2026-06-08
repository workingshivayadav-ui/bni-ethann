import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
  documentDeliveryUrl,
  downloadDocumentItem,
  loadDocumentItemBlob,
  openDocumentItemInNewTab,
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

function PreviewOverlay({
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
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const href = item ? resolveDocumentHref(item) : null;
  const hasSource = Boolean(item && (item.dataUrl || item.url));

  useEffect(() => {
    if (!open || !item || !href) {
      setSrc(null);
      setError(false);
      return;
    }

    let blobUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(false);

    const load = async () => {
      try {
        const blob = await loadDocumentItemBlob(item);
        const typedBlob =
          isPdf && blob.type !== "application/pdf"
            ? new Blob([await blob.arrayBuffer()], { type: "application/pdf" })
            : blob;
        const url = URL.createObjectURL(typedBlob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        blobUrl = url;
        setSrc(url);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, item, href, isPdf]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-black/75 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[301] flex w-[95vw] max-w-4xl max-h-[92vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="bni-preview-header relative z-20 flex shrink-0 items-center justify-between gap-3">
            <DialogPrimitive.Title className="truncate text-sm font-semibold text-gray-900 pr-2">
              {item?.name ?? ""}
            </DialogPrimitive.Title>
            <div className="flex shrink-0 items-center gap-1.5">
              {item && hasSource && (
                <>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void openDocumentItemInNewTab(item).catch(() => {
                        toast.error("Could not open in new tab. Allow popups for this site.");
                      });
                    }}
                    className="bni-btn-outline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> New tab
                  </button>
                </>
              )}
              <DialogPrimitive.Close
                type="button"
                className="bni-btn-icon"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="relative z-0 flex min-h-[50vh] flex-1 flex-col bg-gray-50">
            {loading && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-gray-500">Loading preview…</p>
              </div>
            )}
            {error && (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-[var(--bni-red)]">Could not load preview.</p>
                {item && hasSource && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openDocumentItemInNewTab(item).catch(() => {
                        toast.error("Could not open in new tab. Allow popups for this site.");
                      });
                    }}
                    className="bni-btn-link mt-3 text-[var(--bni-navy)]"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in new tab
                  </button>
                )}
              </div>
            )}
            {!loading && !error && src && isImage && (
              <div className="flex flex-1 items-center justify-center overflow-auto p-4 scrollbar-hide">
                <img src={src} alt={item?.name ?? ""} className="max-h-[70vh] max-w-full object-contain" />
              </div>
            )}
            {!loading && !error && src && isPdf && (
              <iframe
                src={src}
                title={item?.name ?? ""}
                className="h-[70vh] w-full flex-1 border-0 bg-white"
              />
            )}
            {!loading && !error && src && !isImage && !isPdf && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Preview not available for this file type.</p>
                {item && hasSource && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openDocumentItemInNewTab(item).catch(() => {
                        toast.error("Could not open in new tab. Allow popups for this site.");
                      });
                    }}
                    className="bni-btn-link mt-3 text-[var(--bni-navy)]"
                  >
                    Open in new tab
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
  variant = "compact",
}: {
  items: DocumentItem[];
  status?: "ready" | "uploaded";
  onRemove?: (index: number) => void;
  columns?: 1 | 2;
  variant?: "compact" | "card";
}) {
  const [preview, setPreview] = useState<{
    item: DocumentItem;
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);

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

              <div className="bni-doc-actions flex flex-wrap items-center justify-end gap-1 shrink-0">
                {hasSource ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreview({ item, isPdf, isImage })}
                      className="bni-btn-navy"
                      title="View in app"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
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
                      title="Download file"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void openDocumentItemInNewTab(item).catch(() => {
                          toast.error("Could not open in new tab. Allow popups for this site.");
                        });
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

      <PreviewOverlay
        open={!!preview}
        onClose={() => setPreview(null)}
        item={preview?.item ?? null}
        isPdf={preview?.isPdf ?? false}
        isImage={preview?.isImage ?? false}
      />
    </>
  );
}
