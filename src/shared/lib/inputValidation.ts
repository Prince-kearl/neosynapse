import { z } from "zod";

const emailSyntaxSchema = z.string().trim().toLowerCase().email({ message: "Enter a valid email address" }).max(255);

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "fmail.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.om": "gmail.com",
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "googlemail.con": "googlemail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotnail.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
};

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
]);

const trimToNull = (value?: string | null) => {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed : null;
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function getEmailValidationError(value: string, options?: { required?: boolean }) {
  const required = options?.required ?? true;
  const email = normalizeEmail(value);

  if (!email) {
    return required ? "Email is required" : undefined;
  }

  const syntax = emailSyntaxSchema.safeParse(email);
  if (!syntax.success) {
    return syntax.error.errors[0]?.message || "Enter a valid email address";
  }

  const [localPart, domain = ""] = email.split("@");
  if (!localPart || !domain) return "Enter a valid email address";
  if (localPart.includes("..") || domain.includes("..")) return "Email cannot contain consecutive dots";
  if (domain.startsWith("-") || domain.endsWith("-")) return "Enter a valid email domain";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return "Enter a valid email domain";

  const suggestedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domain];
  if (suggestedDomain) {
    return `Email domain looks misspelled. Did you mean ${suggestedDomain}?`;
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return "Use a permanent email address, not a temporary mailbox";
  }

  return undefined;
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((value, ctx) => {
    const error = getEmailValidationError(value);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });

export const signInEmailSchema = emailSchema;

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(100, { message: "Password must be 100 characters or less" });

export const legacyPasswordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters" })
  .max(100, { message: "Password must be 100 characters or less" });

export const requiredNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(100, { message: "Name must be 100 characters or less" });

export function getPhoneValidationError(value?: string | null, options?: { required?: boolean }) {
  const required = options?.required ?? false;
  const phone = trimToNull(value);

  if (!phone) {
    return required ? "Phone number is required" : undefined;
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "Enter a valid phone number";
  if (!/^\+?[0-9\s().-]+$/.test(phone)) return "Enter a valid phone number";

  return undefined;
}

export const optionalPhoneSchema = z.string().optional().superRefine((value, ctx) => {
  const error = getPhoneValidationError(value);
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }
});

export const requiredPhoneSchema = z.string().superRefine((value, ctx) => {
  const error = getPhoneValidationError(value, { required: true });
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }
});

export function getDateOfBirthValidationError(value?: string | null) {
  const dateValue = trimToNull(value);
  if (!dateValue) return undefined;

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Enter a valid date of birth";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return "Date of birth cannot be in the future";

  const oldestAllowed = new Date(today);
  oldestAllowed.setFullYear(oldestAllowed.getFullYear() - 130);
  if (date < oldestAllowed) return "Enter a realistic date of birth";

  return undefined;
}

export function calculateAgeFromDateOfBirth(value?: string | null, referenceDate = new Date()): number | null {
  const dateValue = trimToNull(value);
  if (!dateValue || getDateOfBirthValidationError(dateValue)) return null;

  const dob = new Date(`${dateValue}T00:00:00`);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(dob.getTime()) || dob > today) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 && age <= 130 ? age : null;
}

export function getAgeValidationError(value?: string | null, options?: { required?: boolean }) {
  const required = options?.required ?? true;
  const ageText = trimToNull(value);

  if (!ageText) return required ? "Age is required" : undefined;
  if (!/^\d{1,3}$/.test(ageText)) return "Enter age as a whole number";

  const age = Number(ageText);
  if (!Number.isInteger(age) || age < 0 || age > 130) return "Enter a realistic age";

  return undefined;
}

export const optionalDateOfBirthSchema = z.string().optional().superRefine((value, ctx) => {
  const error = getDateOfBirthValidationError(value);
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }
});
