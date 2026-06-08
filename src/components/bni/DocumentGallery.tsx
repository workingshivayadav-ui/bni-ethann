import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-black/75 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[301] flex w-[95vw] max-w-4xl max-h-[92vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header — always above iframe */}
          <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
            <DialogPrimitive.Title className="truncate text-sm font-semibold text-gray-900 pr-2">
              {name}
            </DialogPrimitive.Title>
            <div className="flex shrink-0 items-center gap-2">
              {href && deliveryHref && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDocumentInNewTab(href, meta);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--bni-navy)]/20 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--bni-navy)] hover:bg-[var(--bni-navy-lt)]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> New tab
                </button>
              )}
              <DialogPrimitive.Close
                type="button"
                className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="relative z-0 flex min-h-[50vh] flex-1 flex-col bg-gray-50">
            {loading && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-gray-500">Loading preview…</p>
              </div>
            )}
            {error && (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-[var(--bni-red)]">Could not load preview.</p>
                {href && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDocumentInNewTab(href, meta);
                    }}
                    className="mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[var(--bni-navy)] hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in new tab
                  </button>
                )}
              </div>
            )}
            {!loading && !error && src && isImage && (
              <div className="flex flex-1 items-center justify-center overflow-auto p-4 scrollbar-hide">
                <img src={src} alt={name} className="max-h-[70vh] max-w-full object-contain" />
              </div>
            )}
            {!loading && !error && src && isPdf && (
              <iframe
                src={src}
                title={name}
                className="h-[70vh] w-full flex-1 border-0 bg-white"
              />
            )}
            {!loading && !error && src && !isImage && !isPdf && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Preview not available for this file type.</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDocumentInNewTab(href!, meta);
                  }}
                  className="mt-3 cursor-pointer text-sm font-semibold text-[var(--bni-navy)] hover:underline"
                >
                  Download / open file
                </button>
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
