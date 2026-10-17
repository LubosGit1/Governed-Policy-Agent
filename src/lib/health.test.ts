import { describe, expect, it } from "vitest";
import { getHealthStatus } from "./health";

describe("health status", () => {
  it("reports the service as ready", () => {
    expect(getHealthStatus()).toEqual({ status: "ok" });
  });
});
