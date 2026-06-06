import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pool } from "@/lib/lovable/database";
import type { MemberRow } from "@/lib/api/members.types";

export type { MemberRow } from "@/lib/api/members.types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACH_BYTES = 30 * 1024 * 1024;

const attachmentSchema = z.object({
  name: z.string().max(200),
  type: z.string().max(120),
  size: z.number().nonnegative(),
  dataUrl: z.string().startsWith("data:"),
});

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  profession: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().min(1).max(160),
  website: z.string().trim().max(300).optional().default(""),
  services: z.array(z.string().trim().min(1).max(60)).min(1).max(12),
  referral: z.string().trim().max(400).optional().default(""),
  serviceArea: z.string().trim().max(160).optional().default(""),
  mobile: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(160),
  address: z.string().trim().max(400).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  linkedin: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(600).optional().default(""),
  photoDataUrl: z.string().startsWith("data:").optional().nullable(),
  attachments: z.array(attachmentSchema).max(20).optional().default([]),
});

function estimateBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function mapRow(r: Record<string, unknown>): MemberRow {
  return {
    id: r.id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    firstName: r.first_name,
    lastName: r.last_name,
    profession: r.profession,
    tagline: r.tagline,
    company: r.company,
    website: r.website,
    services: r.services ?? [],
    referral: r.referral,
    serviceArea: r.service_area,
    mobile: r.mobile,
    email: r.email,
    address: r.address,
    whatsapp: r.whatsapp,
    linkedin: r.linkedin,
    notes: r.notes,
    photoDataUrl: r.photo_data_url,
    attachments: Array.isArray(r.attachments)
      ? r.attachments.map((a: any) => ({ name: a.name, type: a.type, size: a.size }))
      : [],
  };
}

export const listMembers = createServerFn({ method: "GET" }).handler(async () => {
  const { rows } = await pool.query(
    `SELECT id, created_at, first_name, last_name, profession, tagline, company,
            website, services, referral, service_area, mobile, email, address,
            whatsapp, linkedin, notes, photo_data_url, attachments
     FROM public.bni_members
     ORDER BY created_at DESC`
  );
  return { members: rows.map(mapRow) };
});

export const createMember = createServerFn({ method: "POST" })
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.photoDataUrl && estimateBytes(data.photoDataUrl) > MAX_PHOTO_BYTES) {
      throw new Error("Profile photo exceeds 5 MB limit.");
    }
    let total = 0;
    const cleanAttachments = (data.attachments ?? []).map((a) => {
      const bytes = estimateBytes(a.dataUrl);
      if (bytes > MAX_ATTACHMENT_BYTES) {
        throw new Error(`Attachment "${a.name}" exceeds 10 MB limit.`);
      }
      total += bytes;
      return { ...a, size: a.size || bytes };
    });
    if (total > MAX_TOTAL_ATTACH_BYTES) {
      throw new Error("Total attachments exceed 30 MB. Please reduce file count or size.");
    }

    const { rows } = await pool.query(
      `INSERT INTO public.bni_members
       (first_name, last_name, profession, tagline, company, website, services,
        referral, service_area, mobile, email, address, whatsapp, linkedin,
        notes, photo_data_url, attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
       RETURNING id, created_at`,
      [
        data.firstName,
        data.lastName,
        data.profession,
        data.tagline || null,
        data.company,
        data.website || null,
        data.services,
        data.referral || null,
        data.serviceArea || null,
        data.mobile,
        data.email,
        data.address || null,
        data.whatsapp || null,
        data.linkedin || null,
        data.notes || null,
        data.photoDataUrl || null,
        JSON.stringify(cleanAttachments),
      ]
    );
    return { id: rows[0].id as string, createdAt: String(rows[0].created_at) };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await pool.query(`DELETE FROM public.bni_members WHERE id = $1`, [data.id]);
    return { ok: true };
  });
