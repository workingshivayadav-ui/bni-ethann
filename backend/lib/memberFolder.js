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
