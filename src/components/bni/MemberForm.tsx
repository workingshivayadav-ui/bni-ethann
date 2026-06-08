import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Upload, Paperclip, X, CheckCircle2, Camera } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";

const fieldSchemas = {
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  profession: z.string().trim().min(1, "Professional category is required."),
  company: z.string().trim().min(1, "Company name is required."),
  mobile: z.string().trim().min(5, "Mobile number is required."),
  email: z.string().trim().email("Please enter a valid email address."),
};

type FormState = {
  firstName: string;
  lastName: string;
  profession: string;
  tagline: string;
  company: string;
  website: string;
  services: string[];
  referral: string;
  serviceArea: string;
  mobile: string;
  email: string;
  address: string;
  whatsapp: string;
  linkedin: string;
  notes: string;
};

type Attachment = { name: string; type: string; size: number; dataUrl: string };

const initial: FormState = {
  firstName: "",
  lastName: "",
  profession: "",
  tagline: "",
  company: "",
  website: "",
  services: [],
  referral: "",
  serviceArea: "",
  mobile: "",
  email: "",
  address: "",
  whatsapp: "",
  linkedin: "",
  notes: "",
};

const MAX_PHOTO = 5 * 1024 * 1024;
const MAX_ATTACH = 10 * 1024 * 1024;

function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

const STEPS = ["You", "Business", "Contact", "Files", "Review"];

export function MemberForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [attachError, setAttachError] = useState<string | undefined>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await apiFetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setSubmitted(true);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message || 'Submission failed.'),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(n: number): boolean {
    const next: typeof errors = {};
    const check = (k: keyof typeof fieldSchemas) => {
      const r = fieldSchemas[k].safeParse(form[k] as string);
      if (!r.success) next[k] = r.error.issues[0].message;
    };
    if (n === 1) {
      check("firstName");
      check("lastName");
      check("profession");
      if (!photoDataUrl) {
        setPhotoError("Profile photo is required.");
      } else {
        setPhotoError(undefined);
      }
    } else if (n === 2) {
      check("company");
      if (form.services.length === 0) next.services = "Please add at least one service.";
    } else if (n === 3) {
      check("mobile");
      check("email");
    } else if (n === 4) {
      if (attachments.length === 0) {
        setAttachError("At least one document is required.");
      } else {
        setAttachError(undefined);
      }
    }
    setErrors(next);
    const photoMissing = n === 1 && !photoDataUrl;
    const attachMissing = n === 4 && attachments.length === 0;
    return Object.keys(next).length === 0 && !photoMissing && !attachMissing;
  }

  function nx() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function pv() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO) {
      toast.error("Photo must be under 5 MB.");
      return;
    }
    const url = await readFile(file);
    setPhotoDataUrl(url);
    setPhotoError(undefined);
  }

  async function onAttach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added: Attachment[] = [];
    for (const f of files) {
      if (f.size > MAX_ATTACH) {
        toast.error(`${f.name} exceeds 10 MB.`);
        continue;
      }
      const url = await readFile(f);
      added.push({ name: f.name, type: f.type, size: f.size, dataUrl: url });
    }
    setAttachments((a) => [...a, ...added]);
    if (added.length > 0) setAttachError(undefined);
    if (attachRef.current) attachRef.current.value = "";
  }

  function addService(raw: string) {
    const v = raw.trim().replace(/,$/, "");
    if (!v) return;
    if (form.services.includes(v) || form.services.length >= 12) return;
    update("services", [...form.services, v]);
    setServiceInput("");
  }

  function onServiceKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addService(serviceInput);
    } else if (e.key === "Backspace" && !serviceInput && form.services.length) {
      update("services", form.services.slice(0, -1));
    }
  }

  function submit() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      if (!photoDataUrl) {
        setPhotoError("Profile photo is required.");
        setStep(1);
        toast.error("Please upload your profile photo before submitting.");
      } else if (attachments.length === 0) {
        setAttachError("At least one document is required.");
        setStep(4);
        toast.error("Please attach at least one document before submitting.");
      } else {
        toast.error("Please fix highlighted fields.");
      }
      return;
    }
    mutation.mutate({
      ...form,
      photoDataUrl,
      attachments,
    });
  }

  function reset() {
    setForm(initial);
    setPhotoDataUrl(null);
    setPhotoError(undefined);
    setAttachError(undefined);
    setAttachments([]);
    setErrors({});
    setStep(1);
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--bni-red-lt)] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-[var(--bni-red)]" strokeWidth={2} />
        </div>
        <h2 className="font-display font-black text-3xl text-gray-900">Submission received</h2>
        <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
          Your profile has been added to the BNI Ethan 2026 roster.
        </p>
        <div className="bg-[var(--bni-navy)] rounded-xl px-5 py-4 text-left max-w-sm mx-auto my-6">
          <div className="text-[10px] tracking-[2px] uppercase text-white/50 font-semibold">
            Now on the roster
          </div>
          <div className="font-display font-bold text-xl text-white mt-1">
            {form.firstName} {form.lastName}
          </div>
          <div className="text-sm text-white/65">{form.company}</div>
        </div>
        <button
          onClick={reset}
          className="text-sm font-semibold text-[var(--bni-red)] hover:underline"
        >
          Submit another profile
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 shadow-sm">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((_, i) => {
            const n = i + 1;
            const active = step >= n;
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    active
                      ? "bg-[var(--bni-red)] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {n}
                </div>
                {n < STEPS.length && (
                  <div className="flex-1 h-0.5 mx-1.5 bg-gray-100 relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--bni-red)] transition-all"
                      style={{ width: step > n ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          {STEPS.map((l) => (
            <span key={l} className="flex-1 text-center first:text-left last:text-right">
              {l}
            </span>
          ))}
        </div>
      </div>

      {step === 1 && (
        <Step title="About You" badge={1} desc="Your name and professional identity as it will appear on the roster card.">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Profile photo<span className="text-[var(--bni-red)] ml-0.5">*</span>
            </label>
            <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-[var(--bni-navy-lt)] hover:border-[var(--bni-red)] transition ${
                photoError ? "border-[var(--bni-red)]" : "border-gray-200"
              }`}
            >
              {photoDataUrl ? (
                <img src={photoDataUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <Camera className="w-8 h-8 text-[var(--bni-navy)]/40" />
              )}
            </button>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="inline-flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" /> Choose Photo
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhoto}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">Required · JPG or PNG · Max 5 MB · Square crop recommended</p>
            </div>
          </div>
          {photoError && (
            <div className="text-xs text-[var(--bni-red)] font-medium -mt-2">{photoError}</div>
          )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="First name" required error={errors.firstName}>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="e.g. Himanshu"
                className={inputCls(errors.firstName)}
              />
            </Field>
            <Field label="Last name" required error={errors.lastName}>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="e.g. Sharma"
                className={inputCls(errors.lastName)}
              />
            </Field>
          </div>
          <Field
            label="Professional category"
            required
            error={errors.profession}
            hint="e.g. AI & Software Development · IT Consulting · SaaS"
          >
            <input
              type="text"
              value={form.profession}
              onChange={(e) => update("profession", e.target.value)}
              placeholder="e.g. AI-Powered Software Development"
              className={inputCls(errors.profession)}
            />
          </Field>
          <Field label="Your tagline / USP" hint="One memorable line — appears at the bottom of your card.">
            <input
              type="text"
              maxLength={120}
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="e.g. I don't build products. I build infrastructure for a smarter Bharat."
              className={inputCls()}
            />
            <Counter v={form.tagline.length} max={120} />
          </Field>

          <Nav onNext={nx} nextLabel="Next — Business" />
        </Step>
      )}

      {step === 2 && (
        <Step title="Your Business" badge={2} desc="Company details and the services you want featured on your card.">
          <Field label="Company Name" required error={errors.company}>
            <input
              type="text"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="e.g. Shunyity Tech Solutions"
              className={inputCls(errors.company)}
            />
          </Field>
          <Field label="Website URL" hint="Include https:// — will be hyperlinked in the digital PDF">
            <input
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="e.g. https://www.shunyitytechsolutions.com/"
              className={inputCls()}
            />
          </Field>
          <Field
            label="Services you offer"
            required
            error={errors.services}
            hint="Type a service and press Enter or comma. Add 3–6 services."
          >
            <div
              onClick={() => (document.getElementById("svc-input") as HTMLInputElement)?.focus()}
              className={`min-h-[44px] border rounded-md px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text ${
                errors.services ? "border-[var(--bni-red)]" : "border-gray-200"
              } focus-within:border-[var(--bni-red)]`}
            >
              {form.services.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 bg-[var(--bni-navy-lt)] text-[var(--bni-navy)] text-xs font-semibold rounded-full px-2.5 py-1"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => update("services", form.services.filter((x) => x !== s))}
                    className="text-[var(--bni-navy)]/60 hover:text-[var(--bni-red)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                id="svc-input"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={onServiceKey}
                onBlur={() => addService(serviceInput)}
                placeholder={form.services.length ? "" : "e.g. AI Development, CRM Solutions…"}
                className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1"
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">{form.services.length} services added</div>
          </Field>
          <Field label="Ideal referral for you" hint="Who should chapter members refer to you?">
            <textarea
              rows={3}
              maxLength={400}
              value={form.referral}
              onChange={(e) => update("referral", e.target.value)}
              placeholder="e.g. Business owners with 50+ employees who want to automate operations…"
              className={inputCls()}
            />
            <Counter v={form.referral.length} max={400} />
          </Field>
          <Field label="Service area" hint="City or region you primarily serve">
            <input
              type="text"
              value={form.serviceArea}
              onChange={(e) => update("serviceArea", e.target.value)}
              placeholder="e.g. Navi Mumbai, Thane, Mumbai — Pan India"
              className={inputCls()}
            />
          </Field>
          <Nav onBack={pv} onNext={nx} nextLabel="Next — Contact" />
        </Step>
      )}

      {step === 3 && (
        <Step title="Contact Details" badge={3} desc="Printed on your card. Members will call and email these — double-check carefully.">
          <Field label="Mobile number" required error={errors.mobile} hint="Shown prominently — tap-to-call in the digital PDF">
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
              placeholder="e.g. 8090446627"
              className={inputCls(errors.mobile)}
            />
          </Field>
          <Field label="Email address" required error={errors.email} hint="Business email preferred">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="e.g. you@company.com"
              className={inputCls(errors.email)}
            />
          </Field>
          <Field label="Office address" hint="Full address shown on your card">
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="e.g. 1005, Casa Foresta D, Palava City, Thane — 421204"
              className={inputCls()}
            />
          </Field>
          <Divider>Optional but recommended</Divider>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="WhatsApp number">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
                placeholder="e.g. 9235947272"
                className={inputCls()}
              />
            </Field>
            <Field label="LinkedIn URL">
              <input
                type="url"
                value={form.linkedin}
                onChange={(e) => update("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/…"
                className={inputCls()}
              />
            </Field>
          </div>
          <Nav onBack={pv} onNext={nx} nextLabel="Next — Attachments" />
        </Step>
      )}

      {step === 4 && (
        <Step title="Documents" badge={4} desc="Required — upload at least one document (brochure, logo, business card, PDF, etc.). Files are stored under your name.">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Documents<span className="text-[var(--bni-red)] ml-0.5">*</span>
            </label>
          <button
            type="button"
            onClick={() => attachRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-8 text-center hover:border-[var(--bni-red)] hover:bg-[var(--bni-red-lt)]/40 transition ${
              attachError ? "border-[var(--bni-red)]" : "border-gray-200"
            }`}
          >
            <Paperclip className="w-8 h-8 mx-auto text-gray-400" />
            <div className="mt-2 font-semibold text-gray-700">Click to attach files</div>
            <div className="text-xs text-gray-500 mt-1">
              Required · JPG · PNG · PDF · DOCX · up to 10 MB each
            </div>
          </button>
          {attachError && (
            <div className="text-xs text-[var(--bni-red)] font-medium">{attachError}</div>
          )}
          </div>
          <input
            ref={attachRef}
            type="file"
            multiple
            accept="image/*,.pdf,.svg,.doc,.docx,.ppt,.pptx"
            onChange={onAttach}
            className="hidden"
          />
          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-600">
                {attachments.length} file{attachments.length === 1 ? "" : "s"} attached
              </div>
              {attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-[var(--bni-red)] shrink-0" />
                    <span className="text-sm truncate">{a.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(a.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachments((all) => all.filter((_, j) => j !== i));
                      setAttachError(undefined);
                    }}
                    className="text-gray-400 hover:text-[var(--bni-red)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Divider>Notes for designer</Divider>
          <Field label="Any special instructions" hint="Prefix (Dr./Prof./Adv.), product names, design preferences, corrections">
            <textarea
              rows={3}
              maxLength={600}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="e.g. Please list my products. Use Shunyity Tech Solutions as primary company name."
              className={inputCls()}
            />
            <Counter v={form.notes.length} max={600} />
          </Field>
          <Nav onBack={pv} onNext={nx} nextLabel="Review & Submit" />
        </Step>
      )}

      {step === 5 && (
        <Step title="Review & Submit" badge={5} desc="One last look before sending to the chapter roster designer.">
          <div className="bg-[var(--bni-navy)] rounded-xl p-5 text-white">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 shrink-0 flex items-center justify-center font-display font-black text-xl">
                {photoDataUrl ? (
                  <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (form.firstName[0] || "?") + (form.lastName[0] || "")
                )}
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-xl">
                  {form.firstName} {form.lastName}
                </div>
                <div className="text-sm text-white/70">{form.profession}</div>
                <div className="text-sm font-semibold text-[var(--bni-gold-lt)] mt-1">
                  {form.company}
                </div>
              </div>
            </div>
            {form.tagline && (
              <p className="text-sm italic text-white/80 mt-3 border-t border-white/10 pt-3">
                "{form.tagline}"
              </p>
            )}
          </div>

          <ReviewRow label="Services" value={form.services.join(" · ") || "—"} />
          <ReviewRow label="Mobile" value={form.mobile} />
          <ReviewRow label="Email" value={form.email} />
          {form.website && <ReviewRow label="Website" value={form.website} />}
          {form.address && <ReviewRow label="Address" value={form.address} />}
          {form.serviceArea && <ReviewRow label="Service area" value={form.serviceArea} />}
          {form.referral && <ReviewRow label="Ideal referral" value={form.referral} />}
          {attachments.length > 0 && (
            <ReviewRow label="Attachments" value={`${attachments.length} file(s)`} />
          )}

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={pv}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 bg-[var(--bni-red)] hover:bg-[var(--bni-red-dk)] text-white font-semibold text-sm rounded-md px-5 py-2.5 disabled:opacity-60"
            >
              {mutation.isPending ? "Submitting…" : "Submit profile"}
            </button>
          </div>
        </Step>
      )}
    </div>
  );
}

function Step({
  title,
  badge,
  desc,
  children,
}: {
  title: string;
  badge: number;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-[var(--bni-red)] text-white text-xs font-bold rounded-md px-2 py-0.5">
            Step {badge}
          </span>
          <h2 className="font-display font-bold text-2xl text-gray-900">{title}</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700 flex flex-wrap items-baseline gap-2">
        <span>
          {label}
          {required && <span className="text-[var(--bni-red)] ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
      {error && <div className="text-xs text-[var(--bni-red)] font-medium">{error}</div>}
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--bni-red)] transition ${
    error ? "border-[var(--bni-red)]" : "border-gray-200"
  }`;
}

function Counter({ v, max }: { v: number; max: number }) {
  return (
    <div className="text-[11px] text-gray-400 text-right">
      {v} / {max}
    </div>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px bg-gray-100 flex-1" />
      <span className="text-[10px] uppercase tracking-[2px] font-semibold text-gray-400">
        {children}
      </span>
      <div className="h-px bg-gray-100 flex-1" />
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center justify-between pt-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center gap-2 bg-[var(--bni-red)] hover:bg-[var(--bni-red-dk)] text-white font-semibold text-sm rounded-md px-5 py-2.5"
      >
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 font-medium shrink-0">{label}</span>
      <span className="text-gray-900 text-right break-words">{value}</span>
    </div>
  );
}
