import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadFile } from "./uploads";

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

const file = new File(["x"], "week.csv", { type: "text/csv" });

describe("uploadFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the file, data source and replace flag as a form", async () => {
    const fetchMock = respond(201, { row_count: 1 });
    vi.stubGlobal("fetch", fetchMock);

    expect(await uploadFile(file, 1, true)).toEqual({ kind: "saved", result: { row_count: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/uploads");
    const form = init?.body as FormData;
    expect(form.get("data_source_id")).toBe("1");
    expect(form.get("replace")).toBe("true");
    expect((form.get("file") as File).name).toBe("week.csv");
  });

  it("returns row errors and conflicts as outcomes", async () => {
    vi.stubGlobal("fetch", respond(422, { message: "Nothing was saved.", errors: [] }));
    expect((await uploadFile(file, 1)).kind).toBe("invalid");

    vi.stubGlobal("fetch", respond(409, { message: "Already uploaded.", conflicts: [] }));
    expect((await uploadFile(file, 1)).kind).toBe("conflict");
  });

  it("throws the server's message for an unreadable file", async () => {
    vi.stubGlobal("fetch", respond(400, { message: "Upload a .csv or .xlsx file.", errors: [] }));
    await expect(uploadFile(file, 1)).rejects.toThrow("Upload a .csv or .xlsx file.");
  });
});
