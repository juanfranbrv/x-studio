import type { RuntimeEnvironment } from "@/lib/runtime-environment";

export function EnvironmentBanner({
  environment,
}: {
  environment: RuntimeEnvironment;
}) {
  if (environment === "production") return null;

  const label =
    environment === "preview"
      ? "PREVIEW · datos de prueba"
      : "LOCAL · datos de prueba";

  return (
    <div
      role="status"
      aria-label={label}
      className="relative z-[100] h-2 shrink-0 bg-destructive shadow-sm"
    />
  );
}
