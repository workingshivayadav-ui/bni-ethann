export type MemberRow = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  profession: string;
  tagline: string | null;
  company: string;
  website: string | null;
  services: string[];
  referral: string | null;
  serviceArea: string | null;
  mobile: string;
  email: string;
  address: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  notes: string | null;
  photoDataUrl: string | null;
  storageFolder: string | null;
  attachments: Array<{ name: string; type: string; size: number; url: string | null }>;
};

export type MembersResponse = {
  success: boolean;
  members: MemberRow[];
};
