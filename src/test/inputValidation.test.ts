import { describe, expect, it } from "vitest";
import {
  emailSchema,
  getDateOfBirthValidationError,
  getEmailValidationError,
  getPhoneValidationError,
  normalizeEmail,
} from "@/shared/lib/inputValidation";

describe("input validation", () => {
  it("normalizes email addresses before auth calls", () => {
    expect(normalizeEmail("  USER@GMAIL.COM ")).toBe("user@gmail.com");
  });

  it("rejects malformed and known typo email domains", () => {
    expect(getEmailValidationError("not-an-email")).toBe("Enter a valid email address");
    expect(getEmailValidationError("davidtabi1998@fmail.com")).toContain("gmail.com");
    expect(emailSchema.safeParse("davidtabi1998@fmail.com").success).toBe(false);
  });

  it("accepts valid permanent email domains", () => {
    expect(getEmailValidationError("patient@gmail.com")).toBeUndefined();
    expect(getEmailValidationError("doctor@clinic.org")).toBeUndefined();
  });

  it("blocks temporary mailbox domains", () => {
    expect(getEmailValidationError("person@mailinator.com")).toBe("Use a permanent email address, not a temporary mailbox");
  });

  it("validates optional and required phone numbers", () => {
    expect(getPhoneValidationError("")).toBeUndefined();
    expect(getPhoneValidationError("", { required: true })).toBe("Phone number is required");
    expect(getPhoneValidationError("+233 24 123 4567")).toBeUndefined();
    expect(getPhoneValidationError("call me")).toBe("Enter a valid phone number");
  });

  it("rejects impossible dates of birth", () => {
    expect(getDateOfBirthValidationError("1985-01-18")).toBeUndefined();
    expect(getDateOfBirthValidationError("3000-01-01")).toBe("Date of birth cannot be in the future");
    expect(getDateOfBirthValidationError("1800-01-01")).toBe("Enter a realistic date of birth");
  });
});

