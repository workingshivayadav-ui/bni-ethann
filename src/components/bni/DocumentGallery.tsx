import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  X,
} from "lucide-react";

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
  return item.url || item.dataUrl || null;
}

export function DocumentGallery({
  items,
  status = "uploaded",
  onRemove,
  columns = 2,
}: {
  items: DocumentItem[];
  status?: "ready" | "uploaded";
  onRemove?: (index: number) => void;
  columns?: 1 | 2;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-2">No documents uploaded.</p>
    );
  }

  const badgeLabel = status === "uploaded" ? "Uploaded" : "Ready";
  const gridClass =
    columns === 1 ? "grid gap-3 grid-cols-1" : "grid gap-3 grid-cols-1 sm:grid-cols-2";

  return (
    <div className={gridClass}>
      {items.map((item, i) => {
        const href = previewHref(item);
        const isImage = isImageDocument(item.type, item.name);
        const isPdf = isPdfDocument(item.type, item.name);

        return (
          <div
            key={`${item.name}-${i}`}
            className="rounded-xl border border-emerald-200/90 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {isImage && href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-[16/9] bg-gray-100 border-b border-gray-100"
              >
                <img
                  src={href}
                  alt={item.name}
                  className="w-full h-full object-contain bg-[var(--bni-navy-lt)]/30"
                />
              </a>
            ) : isPdf && href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-[16/9] items-center justify-center bg-red-50 border-b border-red-100"
              >
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto text-red-500" />
                  <span className="text-xs font-semibold text-red-700 mt-1 block">PDF document</span>
                </div>
              </a>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-[var(--bni-navy-lt)]/40 border-b border-gray-100">
                <FileText className="w-12 h-12 text-[var(--bni-navy)]/45" />
              </div>
            )}

            <div className="p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 break-words" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(item.size)}</p>
                  <span className="inline-flex mt-2 items-center text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    {badgeLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--bni-navy)] hover:bg-[var(--bni-red)] rounded-md px-2.5 py-1.5 transition-colors"
                  >
                    {status === "uploaded" ? (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" /> Open document
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </>
                    )}
                  </a>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">Link unavailable</span>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[var(--bni-red)] transition-colors ml-auto"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
