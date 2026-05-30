import { describe, expect, it } from "vitest";
import { redactSensitiveData, safeJsonForLog } from "@/ipc/utils/redaction";

describe("redaction utils", () => {
  it("redacts sensitive object fields recursively", () => {
    expect(
      redactSensitiveData({
        apiKey: "secret-key",
        nested: { Authorization: "Bearer token", safe: "value" },
      }),
    ).toEqual({
      apiKey: "[REDACTED]",
      nested: { Authorization: "[REDACTED]", safe: "value" },
    });
  });

  it("returns a string when serializing undefined log values", () => {
    expect(safeJsonForLog(undefined)).toBe("undefined");
  });
});
