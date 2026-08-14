import { describe, expect, it } from "vitest";
import { resolveRuntimeEnvironment } from "../runtime-environment";

describe("resolveRuntimeEnvironment", () => {
  it("respeta una declaración explícita de producción", () => {
    expect(resolveRuntimeEnvironment({ appEnvironment: "production" })).toBe("production");
  });

  it("identifica local por un deployment Convex distinto al de producción", () => {
    expect(
      resolveRuntimeEnvironment({
        convexUrl: "https://quiet-otter-123.convex.cloud",
        productionConvexUrl: "https://prestigious-pigeon-784.convex.cloud",
      }),
    ).toBe("local");
  });

  it("identifica previews sin depender de NODE_ENV", () => {
    expect(resolveRuntimeEnvironment({ vercelEnvironment: "preview" })).toBe("preview");
  });

  it("no muestra un entorno falso si producción usa su deployment conocido", () => {
    expect(
      resolveRuntimeEnvironment({
        convexUrl: "https://prestigious-pigeon-784.convex.cloud",
        productionConvexUrl: "https://prestigious-pigeon-784.convex.cloud",
      }),
    ).toBe("production");
  });

  it("reconoce el deployment de producción aunque Convex añada una región al host", () => {
    expect(
      resolveRuntimeEnvironment({
        convexUrl: "https://prestigious-pigeon-784.eu-west-1.convex.cloud",
        productionConvexUrl: "https://prestigious-pigeon-784.convex.cloud",
      }),
    ).toBe("production");
  });
});
