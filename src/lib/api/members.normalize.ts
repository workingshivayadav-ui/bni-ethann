import type { MemberRow } from "@/lib/api/members.types";

const CLOUDINARY_CLOUD = "dk78j6zxp";

function sanitizeNamePart(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function memberAttachmentsFieldKey(firstName: string, lastName: string) {
  const first = sanitizeNamePart(firstName) || "member";
  const last = sanitizeNamePart(lastName) || "profile";
  return `${first}_${last}_attachments`;
}

type AttachmentItem = MemberRow["attachments"][number];

function readAttachmentsFromApi(
  member: Record<string, unknown>,
  firstName: string,
  lastName: string,
): AttachmentItem[] {
  const key = memberAttachmentsFieldKey(firstName, lastName);
  const fromKey = member[key];
  if (Array.isArray(fromKey)) return fromKey as AttachmentItem[];

  const legacy = member.attachments;
  if (Array.isArray(legacy)) return legacy as AttachmentItem[];

  for (const field of Object.keys(member)) {
    if (field.endsWith("_attachments") && Array.isArray(member[field])) {
      return member[field] as AttachmentItem[];
    }
  }

  return [];
}

function memberFolderSlug(firstName: string, lastName: string) {
  const slug = `${firstName || ""}-${lastName || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "member";
}

function attachmentPublicId(fileName: string) {
  const safe = String(fileName || "document")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
  return safe || "document";
}

function isPdfDocument(type: string, name?: string) {
  return type === "application/pdf" || /\.pdf$/i.test(name || "");
}

function buildCloudinaryUrl(
  storageFolder: string,
  attachment: { name: string; type: string },
) {
  const publicId = `${storageFolder}/${attachmentPublicId(attachment.name)}`;
  const resource = isImageDocument(attachment.type, attachment.name) ? "image" : "raw";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/${resource}/upload/${encodeURI(publicId)}`;
}

function isImageDocument(type: string, name?: string) {
  if (type.startsWith("image/")) return true;
  if (name && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return true;
  return false;
}

/** Ensure attachment URLs and storage folder are present for display. */
export function enrichMember(member: MemberRow): MemberRow {
  const storageFolder =
    member.storageFolder || `bni-ethan/${memberFolderSlug(member.firstName, member.lastName)}`;

  const raw = member as MemberRow & Record<string, unknown>;
  const attachmentList = readAttachmentsFromApi(
    raw,
    member.firstName,
    member.lastName,
  );

  return {
    ...member,
    storageFolder,
    attachments: attachmentList.map((attachment) => ({
      ...attachment,
      url:
        attachment.url ??
        (attachment.name ? buildCloudinaryUrl(storageFolder, attachment) : null),
    })),
  };
}

export function enrichMembers(members: MemberRow[]): MemberRow[] {
  return members.map(enrichMember);
}
