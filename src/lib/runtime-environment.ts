export type RuntimeEnvironment = "production" | "local" | "preview";

interface RuntimeEnvironmentInput {
  appEnvironment?: string;
  convexUrl?: string;
  productionConvexUrl?: string;
  vercelEnvironment?: string;
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

function convexDeploymentName(value: string | undefined) {
  const normalized = normalize(value);
  if (!normalized) return "";

  try {
    return new URL(normalized).hostname.split(".")[0] || "";
  } catch {
    return normalized.split(".")[0] || "";
  }
}

export function resolveRuntimeEnvironment({
  appEnvironment,
  convexUrl,
  productionConvexUrl,
  vercelEnvironment,
}: RuntimeEnvironmentInput): RuntimeEnvironment {
  const declared = normalize(appEnvironment);
  if (declared === "production") return "production";
  if (declared === "preview") return "preview";
  if (declared === "local" || declared === "development") return "local";

  const vercel = normalize(vercelEnvironment);
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";

  const currentDeployment = convexDeploymentName(convexUrl);
  const productionDeployment = convexDeploymentName(productionConvexUrl);
  if (
    currentDeployment &&
    productionDeployment &&
    currentDeployment === productionDeployment
  ) {
    return "production";
  }

  return "local";
}
