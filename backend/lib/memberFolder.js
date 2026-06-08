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

/** Safe Cloudinary public_id from original filename (no extension). */
export function attachmentPublicId(fileName) {
  const base = String(fileName || "document").replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return safe || "document";
}
