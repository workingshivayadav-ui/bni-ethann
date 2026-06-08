import { v2 as cloudinary } from "cloudinary";

export function parseCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(
    /res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+?)(?:\?.*)?$/,
  );
  if (!match) return null;
  return {
    resource_type: match[1],
    public_id: decodeURIComponent(match[2]),
  };
}

export function isPdfAttachment(type, name) {
  return type === "application/pdf" || /\.pdf$/i.test(name || "");
}

/** Authenticated Cloudinary URL that works when public PDF delivery is restricted. */
export function getAuthenticatedDownloadUrl(storedUrl, { type, name } = {}) {
  if (!storedUrl?.includes("res.cloudinary.com")) return storedUrl;

  const parsed = parseCloudinaryUrl(storedUrl);
  if (!parsed) return storedUrl;

  if (isPdfAttachment(type, name)) {
    const ext = (parsed.public_id.match(/\.([^.]+)$/)?.[1] || "pdf").toLowerCase();
    const publicId = parsed.public_id.replace(/\.[^.]+$/, "");

    return cloudinary.utils.private_download_url(publicId, ext, {
      resource_type: parsed.resource_type,
      type: "upload",
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    });
  }

  return cloudinary.url(parsed.public_id, {
    resource_type: parsed.resource_type,
    type: "upload",
    sign_url: true,
    secure: true,
  });
}
