/** Cloudinary folder slug: bni-ethan/john-doe */
export function memberFolderSlug(firstName, lastName) {
  const slug = `${firstName || ""}-${lastName || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "member";
}

export function memberStorageFolder(firstName, lastName) {
  return `bni-ethan/${memberFolderSlug(firstName, lastName)}`;
}

/** Safe Cloudinary public_id from filename — keeps extension so files are visible in the dashboard. */
export function attachmentPublicId(fileName) {
  const safe = String(fileName || "document")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
  return safe || "document";
}

export function attachmentResourceType(type, name) {
  if (type?.startsWith("image/")) return "image";
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name || "")) return "image";
  if (type === "application/pdf" || /\.pdf$/i.test(name || "")) return "raw";
  return "raw";
}
