
CREATE TABLE IF NOT EXISTS public.bni_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  profession text NOT NULL,
  tagline text,
  company text NOT NULL,
  website text,
  services text[] NOT NULL DEFAULT '{}',
  referral text,
  service_area text,
  mobile text NOT NULL,
  email text NOT NULL,
  address text,
  whatsapp text,
  linkedin text,
  notes text,
  photo_data_url text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS bni_members_created_at_idx ON public.bni_members (created_at DESC);
