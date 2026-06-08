import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  X,
} from "lucide-react";
import {
  documentDeliveryUrl,
  openDocumentInNewTab,
} from "@/lib/api/documentDelivery";

export type DocumentItem = {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  url?: string | null;
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

function previewHref(item: DocumentItem) {
  return item.url ?? item.dataUrl ?? null;
}

async function toBlobPreviewUrl(href: string): Promise<string> {
  if (href.startsWith("data:")) {
    const res = await fetch(href);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
  return href;
}

function PreviewOverlay({
  open,
  onClose,
  href,
  name,
  type,
  isPdf,
  isImage,
}: {
  open: boolean;
  onClose: () => void;
  href: string | null;
  name: string;
  type: string;
  isPdf: boolean;
  isImage: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const meta = { name, type };
  const deliveryHref = href ? documentDeliveryUrl(href, meta) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !href) {
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
        if (href.startsWith("data:") || href.startsWith("blob:")) {
          const url = await toBlobPreviewUrl(href);
          if (!cancelled) {
            blobUrl = url.startsWith("blob:") ? url : null;
            setSrc(url);
          }
          return;
        }

        if (isPdf) {
          if (!cancelled) setSrc(deliveryHref);
          return;
        }

        const res = await fetch(deliveryHref!);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
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
  }, [open, href, isPdf, deliveryHref]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${name}`}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          <div className="flex items-center gap-2 shrink-0">
            {href && deliveryHref && (
              <button
                type="button"
                onClick={() => openDocumentInNewTab(href, meta)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--bni-navy)] hover:text-[var(--bni-red)]"
              >
                <ExternalLink className="w-3.5 h-3.5" /> New tab
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center overflow-hidden">
          {loading && <p className="text-sm text-gray-500">Loading preview…</p>}
          {error && (
            <div className="text-center px-6">
              <p className="text-sm text-[var(--bni-red)]">Could not load preview.</p>
              {href && (
                <button
                  type="button"
                  onClick={() => openDocumentInNewTab(href, meta)}
                  className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-[var(--bni-navy)] hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> Open in new tab
                </button>
              )}
            </div>
          )}
          {!loading && !error && src && isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto scrollbar-hide">
              <img src={src} alt={name} className="max-h-[78vh] max-w-full object-contain" />
            </div>
          )}
          {!loading && !error && src && isPdf && (
            <iframe
              src={src}
              title={name}
              className="w-full h-[78vh] border-0 bg-white"
            />
          )}
          {!loading && !error && src && !isImage && !isPdf && (
            <div className="text-center p-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600 mt-2">Preview not available for this file type.</p>
              <button
                type="button"
                onClick={() => openDocumentInNewTab(href!, meta)}
                className="inline-flex mt-3 text-sm font-semibold text-[var(--bni-navy)] hover:underline"
              >
                Download / open file
              </button>
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
  variant = "compact",
}: {
  items: DocumentItem[];
  status?: "ready" | "uploaded";
  onRemove?: (index: number) => void;
  columns?: 1 | 2;
  variant?: "compact" | "card";
}) {
  const [preview, setPreview] = useState<{
    href: string;
    name: string;
    type: string;
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-1">No documents uploaded yet.</p>
    );
  }

  const badgeLabel = status === "uploaded" ? "Uploaded" : "Ready";
  const actionLabel = status === "uploaded" ? "Open" : "Preview";
  const ActionIcon = status === "uploaded" ? ExternalLink : Eye;

  function handleOpen(
    href: string,
    name: string,
    type: string,
    isPdf: boolean,
    isImage: boolean,
  ) {
    setPreview({ href, name, type, isPdf, isImage });
  }

  const rowClass =
    variant === "card"
      ? "flex items-center gap-2.5 rounded-md border border-gray-100 bg-white px-2.5 py-2"
      : "flex items-center gap-2.5 rounded-md border border-emerald-200/70 bg-white px-2.5 py-2 shadow-sm";

  return (
    <>
      <div className={variant === "card" ? "grid gap-1.5 sm:grid-cols-2" : "space-y-1.5"}>
        {items.map((item, i) => {
          const href = previewHref(item);
          const isImage = isImageDocument(item.type, item.name);
          const isPdf = isPdfDocument(item.type, item.name);

          return (
            <div key={`${item.name}-${i}`} className={rowClass}>
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

              <div className="flex items-center gap-1 shrink-0">
                {href ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpen(href, item.name, item.type, isPdf, isImage)
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-[var(--bni-navy)] hover:bg-[var(--bni-red)] rounded px-2 py-1 transition-colors"
                  >
                    <ActionIcon className="w-3 h-3" />
                    {actionLabel}
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-600">Unavailable</span>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="p-1 text-gray-400 hover:text-[var(--bni-red)]"
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
        href={preview?.href ?? null}
        name={preview?.name ?? ""}
        type={preview?.type ?? ""}
        isPdf={preview?.isPdf ?? false}
        isImage={preview?.isImage ?? false}
      />
    </>
  );
}
