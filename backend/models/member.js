import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const MemberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    profession: {
      type: String,
      required: true,
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    referral: {
      type: String,
      trim: true,
    },
    serviceArea: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    address: {
      type: String,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    linkedin: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    photoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Member =
  mongoose.models.Member || mongoose.model("Member", MemberSchema);

export default Member;