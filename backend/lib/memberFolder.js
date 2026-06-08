function sanitizeNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** MongoDB field: SHIVA_YADAV_attachments */
export function memberAttachmentsFieldKey(firstName, lastName) {
  const first = sanitizeNamePart(firstName) || "member";
  const last = sanitizeNamePart(lastName) || "profile";
  return `${first}_${last}_attachments`;
}

/** Read attachment array from dynamic or legacy `attachments` field. */
export function readMemberAttachments(doc) {
  if (!doc) return [];

  const key = memberAttachmentsFieldKey(doc.firstName, doc.lastName);
  const fromKey = doc[key];
  if (Array.isArray(fromKey)) return fromKey;

  if (Array.isArray(doc.attachments)) return doc.attachments;

  for (const field of Object.keys(doc)) {
    if (field.endsWith("_attachments") && Array.isArray(doc[field])) {
      return doc[field];
    }
  }

  return [];
}

/** Build MongoDB document — never includes legacy `attachments` key. */
export function buildMemberMongoDocument(
  fields,
  { photoUrl, storageFolder, uploadedAttachments },
) {
  const attachmentsField = memberAttachmentsFieldKey(
    fields.firstName,
    fields.lastName,
  );
  const now = new Date();

  return {
    firstName: fields.firstName,
    lastName: fields.lastName,
    profession: fields.profession,
    tagline: fields.tagline,
    company: fields.company,
    website: fields.website,
    services: fields.services || [],
    referral: fields.referral,
    serviceArea: fields.serviceArea,
    mobile: fields.mobile,
    email: fields.email,
    address: fields.address,
    whatsapp: fields.whatsapp,
    linkedin: fields.linkedin,
    notes: fields.notes,
    photoUrl,
    storageFolder,
    [attachmentsField]: uploadedAttachments,
    createdAt: now,
    updatedAt: now,
  };
}

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

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
]);

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;

const MIME_EXT = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/x-rar-compressed": "rar",
  "application/json": "json",
};

/** File extension for Cloudinary raw delivery (required for PDF/docs in dashboard). */
export function attachmentFileExtension(type, name) {
  const fromName = String(name || "").match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  if (type && MIME_EXT[type]) return MIME_EXT[type];
  if (type === "application/octet-stream") return "bin";
  return "bin";
}

/** Safe Cloudinary public_id — always includes extension for raw files. */
export function attachmentPublicId(fileName, type) {
  const base = String(fileName || "document")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 90);
  const ext = attachmentFileExtension(type, fileName);
  const id = base || "document";
  return `${id}.${ext}`;
}

/** Images → image; PDFs, Office, archives, and everything else → raw. */
export function attachmentResourceType(type, name) {
  const mime = String(type || "").toLowerCase();
  const fileName = String(name || "");

  if (mime === "application/pdf" || /\.pdf$/i.test(fileName)) return "raw";
  if (IMAGE_MIME.has(mime) && IMAGE_EXT.test(fileName)) return "image";
  if (!mime && IMAGE_EXT.test(fileName)) return "image";
  return "raw";
}

/** Rebuild a stable Cloudinary CDN URL when resource type or path was wrong. */
export function buildAttachmentCdnUrl(cloudName, attachment, storageFolder) {
  const resource = attachment.resourceType || attachmentResourceType(attachment.type, attachment.name);
  const publicId = `${storageFolder}/${attachmentPublicId(attachment.name, attachment.type)}`;
  return `https://res.cloudinary.com/${cloudName}/${resource}/upload/${encodeURI(publicId)}`;
}
