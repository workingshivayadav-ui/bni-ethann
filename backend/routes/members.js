import express from "express";
import mongoose from "mongoose";
import Member from "../models/member.js";
import uploadOnCloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import {
  attachmentPublicId,
  attachmentResourceType,
  memberAttachmentsFieldKey,
  memberStorageFolder,
  readMemberAttachments,
} from "../lib/memberFolder.js";
import {
  getAuthenticatedDownloadUrl,
  isPdfAttachment,
} from "../lib/cloudinaryUrls.js";

const router = express.Router();

// In-memory fallback
let inMemoryStore = { members: [] };

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACH_BYTES = 30 * 1024 * 1024;

const makeId = () => Math.random().toString(36).substring(2, 10);

const estimateBytesFromDataUrl = (dataUrl) => {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
};

/** Stable CDN URL stored in MongoDB — do not replace with expiring signed URLs. */
const resolveAttachmentUrl = (doc, attachment) => {
  if (attachment.url?.includes("res.cloudinary.com")) {
    return attachment.url;
  }

  const folder =
    doc.storageFolder || memberStorageFolder(doc.firstName, doc.lastName);
  if (!folder || !attachment.name) return attachment.url || null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dk78j6zxp";
  const publicId = `${folder}/${attachmentPublicId(attachment.name)}`;
  const resource = attachmentResourceType(attachment.type, attachment.name);

  return `https://res.cloudinary.com/${cloudName}/${resource}/upload/${publicId}`;
};

/** Normalize Mongo/in-memory docs to the shape the frontend expects. */
const formatMember = (doc) => {
  const id = doc._id ? String(doc._id) : doc.id;
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : doc.createdAt || new Date().toISOString();

  return {
    id,
    createdAt,
    firstName: doc.firstName,
    lastName: doc.lastName,
    profession: doc.profession,
    tagline: doc.tagline || null,
    company: doc.company,
    website: doc.website || null,
    services: doc.services || [],
    referral: doc.referral || null,
    serviceArea: doc.serviceArea || null,
    mobile: doc.mobile,
    email: doc.email,
    address: doc.address || null,
    whatsapp: doc.whatsapp || null,
    linkedin: doc.linkedin || null,
    notes: doc.notes || null,
    photoDataUrl: doc.photoUrl || doc.photoDataUrl || null,
    storageFolder:
      doc.storageFolder || memberStorageFolder(doc.firstName, doc.lastName),
    attachments: readMemberAttachments(doc).map((a) => ({
      name: a.name,
      type: a.type,
      size: a.size,
      url: resolveAttachmentUrl(doc, a),
    })),
  };
};

// GET MEMBERS
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        members: inMemoryStore.members.map(formatMember),
      });
    }

    const members = await Member.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      members: members.map(formatMember),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch members",
    });
  }
});

// CREATE MEMBER
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const requiredFields = [
      "firstName",
      "lastName",
      "profession",
      "company",
      "mobile",
      "email",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        const msg = `${field} is required`;
        return res.status(400).json({
          success: false,
          message: msg,
          error: msg,
        });
      }
    }

    // Photo validation — required
    if (
      !data.photoDataUrl ||
      typeof data.photoDataUrl !== "string" ||
      !data.photoDataUrl.startsWith("data:image/")
    ) {
      const msg = "Profile photo is required";
      return res.status(400).json({
        success: false,
        message: msg,
        error: msg,
      });
    }

    if (estimateBytesFromDataUrl(data.photoDataUrl) > MAX_PHOTO_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Profile photo exceeds 5 MB limit",
        error: "Profile photo exceeds 5 MB limit",
      });
    }

    // Attachment validation — at least one document required
    const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
    if (rawAttachments.length === 0) {
      const msg = "At least one document is required";
      return res.status(400).json({
        success: false,
        message: msg,
        error: msg,
      });
    }

    let totalSize = 0;
    const attachments = [];

    for (const file of rawAttachments) {
      if (!file?.dataUrl || typeof file.dataUrl !== "string") {
        const msg = "Each document must include file data";
        return res.status(400).json({
          success: false,
          message: msg,
          error: msg,
        });
      }

      const size = estimateBytesFromDataUrl(file.dataUrl);

      if (size > MAX_ATTACHMENT_BYTES) {
        return res.status(400).json({
          success: false,
          message: `${file.name} exceeds 10 MB limit`,
          error: `${file.name} exceeds 10 MB limit`,
        });
      }

      totalSize += size;

      attachments.push({
        name: file.name,
        type: file.type,
        size,
        dataUrl: file.dataUrl,
      });
    }

    if (totalSize > MAX_TOTAL_ATTACH_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Total attachment size exceeds 30 MB",
      });
    }

    if (!isCloudinaryConfigured()) {
      const msg =
        "File storage is not configured on the server. Please contact the administrator.";
      return res.status(503).json({ success: false, message: msg, error: msg });
    }

    const storageFolder = memberStorageFolder(data.firstName, data.lastName);

    // Upload photo to member folder: bni-ethan/first-last/profile-photo
    const photoUrl = await uploadOnCloudinary(data.photoDataUrl, {
      folder: storageFolder,
      public_id: "profile-photo",
      resource_type: "image",
      format: "png",
    });

    if (!photoUrl) {
      const msg = "Profile photo upload failed. Please try again.";
      return res.status(400).json({
        success: false,
        message: msg,
        error: msg,
      });
    }

    // Upload attachments into the same member folder
    const uploadedAttachments = [];

    for (const file of attachments) {
      const resourceType = attachmentResourceType(file.type, file.name);
      const url = await uploadOnCloudinary(file.dataUrl, {
        folder: storageFolder,
        public_id: attachmentPublicId(file.name),
        resource_type: resourceType,
      });

      if (!url) {
        const msg = `Failed to upload document "${file.name}". Please try again.`;
        return res.status(400).json({
          success: false,
          message: msg,
          error: msg,
        });
      }

      uploadedAttachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url,
      });
    }

    const attachmentsField = memberAttachmentsFieldKey(
      data.firstName,
      data.lastName,
    );

    // Fallback if MongoDB not connected
    if (mongoose.connection.readyState !== 1) {
      const { photoDataUrl: _photo, attachments: _attachments, ...fields } = data;

      const member = formatMember({
        id: makeId(),
        createdAt: new Date().toISOString(),
        ...fields,
        photoUrl,
        storageFolder,
        [attachmentsField]: uploadedAttachments,
      });

      inMemoryStore.members.unshift(member);

      return res.status(201).json({
        success: true,
        member,
      });
    }

    const member = await Member.create({
      firstName: data.firstName,
      lastName: data.lastName,
      profession: data.profession,
      tagline: data.tagline,
      company: data.company,
      website: data.website,
      services: data.services || [],
      referral: data.referral,
      serviceArea: data.serviceArea,
      mobile: data.mobile,
      email: data.email,
      address: data.address,
      whatsapp: data.whatsapp,
      linkedin: data.linkedin,
      notes: data.notes,
      photoUrl,
      storageFolder,
      [attachmentsField]: uploadedAttachments,
    });

    return res.status(201).json({
      success: true,
      member: formatMember(member.toObject()),
    });
  } catch (error) {
    console.error("Create Member Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      error: error.message || "Internal Server Error",
    });
  }
});

// Stream a stored attachment (fixes Cloudinary PDF 401 / iframe issues)
router.get("/files/delivery", async (req, res) => {
  try {
    const storedUrl = req.query.url;
    const name = typeof req.query.name === "string" ? req.query.name : "document";
    const type = typeof req.query.type === "string" ? req.query.type : "";

    if (
      typeof storedUrl !== "string" ||
      (!storedUrl.includes("res.cloudinary.com") &&
        !storedUrl.includes("api.cloudinary.com"))
    ) {
      return res.status(400).json({ success: false, message: "Invalid file url" });
    }

    // Public Cloudinary assets load from the stored CDN URL; signed URLs are fallback only.
    let upstream = await fetch(storedUrl);
    if (!upstream.ok && storedUrl.includes("res.cloudinary.com")) {
      const signedUrl = getAuthenticatedDownloadUrl(storedUrl, { type, name });
      if (signedUrl !== storedUrl) {
        upstream = await fetch(signedUrl);
      }
    }

    if (!upstream.ok) {
      console.error("File delivery failed:", upstream.status, storedUrl);
      return res.status(upstream.status).json({
        success: false,
        message: "Could not fetch file from storage",
      });
    }

    const contentType =
      upstream.headers.get("content-type") ||
      (isPdfAttachment(type, name) ? "application/pdf" : "application/octet-stream");

    const disposition =
      req.query.disposition === "attachment" ? "attachment" : "inline";
    const safeName = name.replace(/"/g, "");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
    res.setHeader("Cache-Control", "private, max-age=300");

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error("File delivery error:", error);
    return res.status(500).json({ success: false, message: "File delivery failed" });
  }
});

// DELETE MEMBER
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState !== 1) {
      inMemoryStore.members = inMemoryStore.members.filter(
        (m) => m.id !== id
      );

      return res.json({
        success: true,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member id",
      });
    }

    const deleted = await Member.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete member",
    });
  }
});

export default router;