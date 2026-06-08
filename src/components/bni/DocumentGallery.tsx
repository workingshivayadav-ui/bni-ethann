import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

async function toPreviewUrl(href: string): Promise<string> {
  if (href.startsWith("data:")) {
    const res = await fetch(href);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
  return href;
}

function PreviewModal({
  open,
  onClose,
  href,
  name,
  isPdf,
  isImage,
}: {
  open: boolean;
  onClose: () => void;
  href: string | null;
  name: string;
  isPdf: boolean;
  isImage: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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

    toPreviewUrl(href)
      .then((url) => {
        if (cancelled) {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        blobUrl = url.startsWith("blob:") ? url : null;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, href]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold truncate pr-6">{name}</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-50 min-h-[50vh] max-h-[75vh] flex items-center justify-center">
          {loading && <p className="text-sm text-gray-500">Loading preview…</p>}
          {error && (
            <p className="text-sm text-[var(--bni-red)] px-4 text-center">
              Could not load preview. Try downloading the file instead.
            </p>
          )}
          {!loading && !error && src && isImage && (
            <img src={src} alt={name} className="max-h-[75vh] max-w-full object-contain" />
          )}
          {!loading && !error && src && isPdf && (
            <iframe
              src={src}
              title={name}
              className="w-full h-[75vh] border-0 bg-white"
            />
          )}
          {!loading && !error && src && !isImage && !isPdf && (
            <div className="text-center p-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600 mt-2">Preview not available for this file type.</p>
              <a
                href={src}
                download={name}
                className="inline-flex mt-3 text-sm font-semibold text-[var(--bni-navy)] hover:underline"
              >
                Download file
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Thumbnail({
  href,
  name,
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
        className="w-11 h-11 rounded-lg object-cover border border-gray-100 bg-white shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
        isPdf ? "bg-red-50 border-red-100" : "bg-[var(--bni-navy-lt)] border-gray-100"
      }`}
    >
      <FileText className={`w-5 h-5 ${isPdf ? "text-red-500" : "text-[var(--bni-navy)]/50"}`} />
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
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-1">No documents uploaded yet.</p>
    );
  }

  const badgeLabel = status === "uploaded" ? "Uploaded" : "Ready";

  function openPreview(href: string, name: string, isPdf: boolean, isImage: boolean) {
    setPreview({ href, name, isPdf, isImage });
  }

  function openExternal(href: string) {
    if (href.startsWith("data:")) {
      toPreviewUrl(href).then((url) => {
        window.open(url, "_blank", "noopener,noreferrer");
        if (url.startsWith("blob:")) {
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      });
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  if (variant === "card") {
    return (
      <>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item, i) => {
            const href = previewHref(item);
            const isImage = isImageDocument(item.type, item.name);
            const isPdf = isPdfDocument(item.type, item.name);
            return (
              <div
                key={`${item.name}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5"
              >
                <Thumbnail href={href} name={item.name} isImage={isImage} isPdf={isPdf} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-500">{formatFileSize(item.size)}</p>
                </div>
                {href && (
                  <button
                    type="button"
                    onClick={() =>
                      status === "uploaded"
                        ? openExternal(href)
                        : openPreview(href, item.name, isPdf, isImage)
                    }
                    className="text-xs font-semibold text-[var(--bni-navy)] hover:text-[var(--bni-red)] shrink-0"
                  >
                    {status === "uploaded" ? "Open" : "Preview"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <PreviewModal
          open={!!preview}
          onClose={() => setPreview(null)}
          href={preview?.href ?? null}
          name={preview?.name ?? ""}
          isPdf={preview?.isPdf ?? false}
          isImage={preview?.isImage ?? false}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item, i) => {
          const href = previewHref(item);
          const isImage = isImageDocument(item.type, item.name);
          const isPdf = isPdfDocument(item.type, item.name);

          return (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-emerald-200/80 bg-emerald-50/30 px-3 py-2.5"
            >
              <Thumbnail href={href} name={item.name} isImage={isImage} isPdf={isPdf} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-gray-900 truncate" title={item.name}>
                    {item.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-500">{formatFileSize(item.size)}</span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-1 py-px rounded">
                    {badgeLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {href && (
                  <button
                    type="button"
                    onClick={() =>
                      status === "uploaded"
                        ? openExternal(href)
                        : openPreview(href, item.name, isPdf, isImage)
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[var(--bni-navy)] hover:bg-[var(--bni-red)] rounded-md px-2 py-1 transition-colors"
                  >
                    {status === "uploaded" ? (
                      <>
                        <ExternalLink className="w-3 h-3" /> Open
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Preview
                      </>
                    )}
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="p-1 text-gray-400 hover:text-[var(--bni-red)] transition-colors"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        href={preview?.href ?? null}
        name={preview?.name ?? ""}
        isPdf={preview?.isPdf ?? false}
        isImage={preview?.isImage ?? false}
      />
    </>
  );
}
