import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dns/promises", () => ({
  default: {
    resolveMx: vi.fn()
  }
}));

import dns from "dns/promises";
import {
  __clearEmailValidationCache,
  hasMXRecord,
  isDisposableEmail,
  isValidEmailFormat,
  validateRecipientDeliverability
} from "../app/utils/validator.js";

describe("email recipient validator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearEmailValidationCache();
  });

  it("accepts and rejects email format correctly", () => {
    expect(isValidEmailFormat("user@gmail.com")).toBe(true);
    expect(isValidEmailFormat("user@")).toBe(false);
    expect(isValidEmailFormat("@gmail.com")).toBe(false);
    expect(isValidEmailFormat("user@gmail")).toBe(false);
  });

  it("flags disposable domains", () => {
    expect(isDisposableEmail("someone@mailinator.com")).toBe(true);
    expect(isDisposableEmail("someone@example.com")).toBe(false);
  });

  it("returns true when domain has MX records", async () => {
    dns.resolveMx.mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);

    await expect(hasMXRecord("hello@example.com")).resolves.toBe(true);
    expect(dns.resolveMx).toHaveBeenCalledTimes(1);
  });

  it("caches MX lookup result per domain", async () => {
    dns.resolveMx.mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);

    await expect(hasMXRecord("one@example.com")).resolves.toBe(true);
    await expect(hasMXRecord("two@example.com")).resolves.toBe(true);

    expect(dns.resolveMx).toHaveBeenCalledTimes(1);
  });

  it("returns missing_mx when MX lookup fails", async () => {
    dns.resolveMx.mockRejectedValue(new Error("ENOTFOUND"));

    await expect(validateRecipientDeliverability("hello@bad-domain.test")).resolves.toEqual({
      ok: false,
      reason: "missing_mx"
    });
  });

  it("marks angshruta.bhuyan@hexahealth.com as missing_mx when domain lookup fails", async () => {
    dns.resolveMx.mockRejectedValue(new Error("ENOTFOUND"));

    await expect(
      validateRecipientDeliverability("angshruta.bhuyan@hexahealth.com")
    ).resolves.toEqual({
      ok: false,
      reason: "missing_mx"
    });
  });

  it("short-circuits invalid format before MX call", async () => {
    await expect(validateRecipientDeliverability("bad-email")).resolves.toEqual({
      ok: false,
      reason: "invalid_format"
    });

    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it("short-circuits disposable domain before MX call", async () => {
    await expect(validateRecipientDeliverability("hi@tempmail.com")).resolves.toEqual({
      ok: false,
      reason: "disposable_domain"
    });

    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it("marks valid recipient as deliverable", async () => {
    dns.resolveMx.mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);

    await expect(validateRecipientDeliverability("ok@example.com")).resolves.toEqual({
      ok: true,
      reason: "deliverable"
    });
  });
});
