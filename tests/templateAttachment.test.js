import { describe, it, expect, vi, afterEach } from "vitest";

const storageMocks = vi.hoisted(() => {
  return {
    download: vi.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://example.com/file" }, error: null }),
    from: vi.fn()
  };
});

vi.mock("../app/services/db/supabase.js", () => {
  storageMocks.from.mockReturnValue({
    download: storageMocks.download,
    createSignedUrl: storageMocks.createSignedUrl
  });

  return {
    supabase: {
      storage: {
        from: storageMocks.from
      }
    }
  };
});

import { renderTemplate } from "../app/services/mail/template.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("renderTemplate attachment handling", () => {
  it("should download attachment via signed URL and return mail attachment", async () => {
    const fileBytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(fileBytes)
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await renderTemplate(
      "Hello {{name}}",
      "Body for {{name}}",
      { name: "Anas" },
      {
        name: "resume.pdf",
        path: "user-uploads/resume.pdf",
        mime_type: "application/pdf"
      }
    );

    expect(storageMocks.from).toHaveBeenCalledWith("template-attachments");
    expect(storageMocks.download).toHaveBeenCalledWith("user-uploads/resume.pdf");
    expect(storageMocks.createSignedUrl).toHaveBeenCalledWith(
      "user-uploads/resume.pdf",
      60 * 5
    );
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/file");

    expect(result.subject).toBe("Hello Anas");
    expect(result.body).toBe("Body for Anas");
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe("resume.pdf");
    expect(result.attachments[0].contentType).toBe("application/pdf");
    expect(Buffer.isBuffer(result.attachments[0].content)).toBe(true);
    expect(result.attachments[0].content).toEqual(Buffer.from(fileBytes));
  });
});
